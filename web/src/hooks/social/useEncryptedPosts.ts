import { useCallback, useEffect, useState } from "react";
import { FixedSizeBinary, type PolkadotSigner } from "polkadot-api";
import { useSocialApi } from "./useSocialApi";
import { useTxTracker } from "./useTxTracker";
import { useChainStore } from "../../store/chainStore";
import {
	aadFor,
	decodeBlob,
	decrypt,
	derivePublicKey,
	dropBuyerSk,
	encodeBlob,
	encrypt,
	generateContentKey,
	generateX25519Keypair,
	loadBuyerSk,
	sealKey,
	stashBuyerSk,
	unsealKey,
} from "../../utils/postCrypto";

/* ── Key service ───────────────────────────────────────────────────── */

export interface KeyService {
	account: string;
	encryptionPk: Uint8Array;
	version: number;
}

/** Reads the custodial collator key service registered on-chain. */
export function useKeyService(): KeyService | null {
	const { getApi } = useSocialApi();
	const blockNumber = useChainStore((s) => s.blockNumber);
	const [ks, setKs] = useState<KeyService | null>(null);

	useEffect(() => {
		let cancelled = false;
		(async () => {
			try {
				const raw = await getApi().query.SocialFeeds.KeyService.getValue();
				if (cancelled) return;
				setKs(
					raw
						? {
								account: raw.account.toString(),
								encryptionPk: raw.encryption_pk.asBytes(),
								version: Number(raw.version),
							}
						: null,
				);
			} catch {
				if (!cancelled) setKs(null);
			}
		})();
		return () => {
			cancelled = true;
		};
	}, [getApi, blockNumber]);

	return ks;
}

/* ── Seller helper ─────────────────────────────────────────────────── */

export interface SealedPostContent {
	/** Binary blob to upload to IPFS (nonce || aad_len || aad || ciphertext). */
	blob: Uint8Array;
	/** Capsule to pass as the `capsule` arg of `create_post` (80 bytes). */
	capsule: Uint8Array;
}

/**
 * Encrypt plaintext with a fresh content key and seal the key to the
 * collator's X25519 public key. Returns both the ciphertext blob (for
 * IPFS) and the capsule (for on-chain storage).
 */
export async function sealPostContent(
	plaintext: Uint8Array,
	collatorPk: Uint8Array,
): Promise<SealedPostContent> {
	const key = await generateContentKey();
	const aad = await aadFor(plaintext);
	const enc = await encrypt(plaintext, key, aad);
	const blob = encodeBlob(enc);
	const capsule = await sealKey(key, collatorPk);
	// Zero the key right after use.
	key.fill(0);
	return { blob, capsule };
}

/* ── Buyer unlock flow ─────────────────────────────────────────────── */

export interface UnlockState {
	status: "idle" | "awaiting-key" | "ready" | "error";
	error?: string;
	plaintext?: Uint8Array;
}

/**
 * Encrypted-post unlock lifecycle for a single `(postId, viewer)` pair.
 *
 * 1. `start()` — generate an ephemeral X25519 keypair, stash the secret
 *    in sessionStorage, submit `unlock_post(post_id, buyer_pk)`. The
 *    pallet reserves the record and the collator OCW eventually
 *    delivers `wrapped_key` via `deliver_unlock_unsigned`.
 * 2. Internal polling watches `Unlocks[post_id][viewer]` for the
 *    wrapped key.
 * 3. When the wrapped key is present, we unseal it with the stashed
 *    secret, fetch the ciphertext from IPFS, and decrypt locally.
 */
export function useUnlockEncryptedPost(postId: bigint | null, viewer: string | null) {
	const { getApi } = useSocialApi();
	const tracker = useTxTracker();
	const blockNumber = useChainStore((s) => s.blockNumber);
	const [state, setState] = useState<UnlockState>({ status: "idle" });
	const [wrappedKey, setWrappedKey] = useState<Uint8Array | null>(null);

	useEffect(() => {
		if (postId === null || !viewer) return;
		let cancelled = false;
		(async () => {
			try {
				const raw = await getApi().query.SocialFeeds.Unlocks.getValue(postId, viewer);
				if (cancelled) return;
				if (!raw) {
					setWrappedKey(null);
					return;
				}
				if (raw.wrapped_key) setWrappedKey(raw.wrapped_key.asBytes());
			} catch {
				/* ignore transient RPC errors */
			}
		})();
		return () => {
			cancelled = true;
		};
	}, [getApi, postId, viewer, blockNumber]);

	const start = useCallback(
		async (signer: PolkadotSigner): Promise<boolean> => {
			if (postId === null) return false;
			const kp = await generateX25519Keypair();
			stashBuyerSk(postId, kp.secretKey);
			const tx = getApi().tx.SocialFeeds.unlock_post({
				post_id: postId,
				buyer_pk: FixedSizeBinary.fromBytes(kp.publicKey),
			});
			const ok = await tracker.submit(tx, signer, "Unlock post");
			if (!ok) {
				dropBuyerSk(postId);
				return false;
			}
			setState({ status: "awaiting-key" });
			return true;
		},
		[getApi, tracker, postId],
	);

	const decryptNow = useCallback(
		async (ipfsCid: string, fetchRaw: (cid: string) => Promise<Uint8Array>) => {
			if (postId === null || !wrappedKey) return;
			const sk = loadBuyerSk(postId);
			if (!sk) {
				setState({ status: "error", error: "buyer secret not found in this browser tab" });
				return;
			}
			try {
				const pk = await derivePublicKey(sk);
				const contentKey = await unsealKey(wrappedKey, pk, sk);
				const blob = await fetchRaw(ipfsCid);
				const decoded = decodeBlob(blob);
				const pt = await decrypt(decoded, contentKey);
				// Scrub the symmetric key from memory before we release the
				// reference — anything after this point only holds plaintext.
				contentKey.fill(0);
				setState({ status: "ready", plaintext: pt });
			} catch (e) {
				setState({
					status: "error",
					error: e instanceof Error ? e.message : "decryption failed",
				});
			}
		},
		[postId, wrappedKey],
	);

	return { state, wrappedKey, start, decryptNow, tracker };
}

/* ── IPFS raw helpers ──────────────────────────────────────────────── */

/**
 * The existing `useIpfs` hook only exposes JSON-wrapped helpers. For
 * encrypted blobs we upload / fetch raw bytes.
 */
export async function uploadRawToIpfs(bytes: Uint8Array): Promise<string> {
	const form = new FormData();
	form.append("file", new Blob([bytes], { type: "application/octet-stream" }), "enc.bin");
	const res = await fetch("https://api.thegraph.com/ipfs/api/v0/add", {
		method: "POST",
		body: form,
	});
	if (!res.ok) throw new Error(`IPFS upload failed: ${res.status}`);
	const json = (await res.json()) as { Hash: string };
	return json.Hash;
}

export async function fetchRawFromIpfs(cid: string): Promise<Uint8Array> {
	const res = await fetch(`https://ipfs.io/ipfs/${cid}`, {
		signal: AbortSignal.timeout(15_000),
	});
	if (!res.ok) throw new Error(`IPFS fetch failed: ${res.status}`);
	return new Uint8Array(await res.arrayBuffer());
}
