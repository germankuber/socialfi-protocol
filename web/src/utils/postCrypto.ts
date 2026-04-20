import _sodium from "libsodium-wrappers";

/**
 * Browser-side crypto helpers for encrypted posts.
 *
 * Pairs byte-for-byte with the `crypto_box` and `chacha20poly1305`
 * Rust crates used by `pallet-social-feeds`'s offchain worker. The
 * symmetric content key is freshly generated per post, the payload is
 * XChaCha20-Poly1305-encrypted with a random 24-byte nonce, and the
 * content key is sealed to the collator's X25519 public key using
 * libsodium's `crypto_box_seal` (= 80 bytes for a 32-byte message).
 */

async function sodium(): Promise<typeof _sodium> {
	await _sodium.ready;
	return _sodium;
}

/** 32-byte content key. */
export const CONTENT_KEY_LEN = 32;
/** `crypto_box_seal` output for a 32-byte message: 32 ephemeral pk + 32 ciphertext + 16 MAC. */
export const SEALED_KEY_LEN = 80;
/** XChaCha20-Poly1305 nonce length. */
export const NONCE_LEN = 24;

export interface EncryptedBlob {
	nonce: Uint8Array;
	ciphertext: Uint8Array;
	aad: Uint8Array;
}

/** Generate a fresh 32-byte symmetric key. */
export async function generateContentKey(): Promise<Uint8Array> {
	const s = await sodium();
	return s.randombytes_buf(CONTENT_KEY_LEN);
}

/** Generate a fresh X25519 keypair (ephemeral buyer key). */
export async function generateX25519Keypair(): Promise<{
	publicKey: Uint8Array;
	secretKey: Uint8Array;
}> {
	const s = await sodium();
	const kp = s.crypto_box_keypair();
	return { publicKey: kp.publicKey, secretKey: kp.privateKey };
}

/** Derive X25519 public key from a secret. */
export async function derivePublicKey(secretKey: Uint8Array): Promise<Uint8Array> {
	const s = await sodium();
	return s.crypto_scalarmult_base(secretKey);
}

/** Deterministic AAD = blake2b-256 of the plaintext. */
export async function aadFor(bytes: Uint8Array): Promise<Uint8Array> {
	const s = await sodium();
	return s.crypto_generichash(32, bytes);
}

/** Encrypt with XChaCha20-Poly1305. */
export async function encrypt(
	plaintext: Uint8Array,
	key: Uint8Array,
	aad: Uint8Array,
): Promise<EncryptedBlob> {
	const s = await sodium();
	const nonce = s.randombytes_buf(NONCE_LEN);
	const ciphertext = s.crypto_aead_xchacha20poly1305_ietf_encrypt(
		plaintext,
		aad,
		null,
		nonce,
		key,
	);
	return { nonce, ciphertext, aad };
}

/** Decrypt the output of {@link encrypt}. Throws on AAD / MAC mismatch. */
export async function decrypt(blob: EncryptedBlob, key: Uint8Array): Promise<Uint8Array> {
	const s = await sodium();
	return s.crypto_aead_xchacha20poly1305_ietf_decrypt(
		null,
		blob.ciphertext,
		blob.aad,
		blob.nonce,
		key,
	);
}

/** Seal a content key to the collator's X25519 public key. */
export async function sealKey(key: Uint8Array, recipientPk: Uint8Array): Promise<Uint8Array> {
	const s = await sodium();
	return s.crypto_box_seal(key, recipientPk);
}

/** Unseal a wrapped key with our own X25519 keypair. */
export async function unsealKey(
	sealed: Uint8Array,
	recipientPk: Uint8Array,
	recipientSk: Uint8Array,
): Promise<Uint8Array> {
	const s = await sodium();
	return s.crypto_box_seal_open(sealed, recipientPk, recipientSk);
}

/**
 * Pack an {@link EncryptedBlob} into a single binary for IPFS upload:
 *   nonce (24) || aad_len (u32 LE, 4) || aad || ciphertext
 */
export function encodeBlob(blob: EncryptedBlob): Uint8Array {
	const out = new Uint8Array(NONCE_LEN + 4 + blob.aad.length + blob.ciphertext.length);
	out.set(blob.nonce, 0);
	new DataView(out.buffer).setUint32(NONCE_LEN, blob.aad.length, true);
	out.set(blob.aad, NONCE_LEN + 4);
	out.set(blob.ciphertext, NONCE_LEN + 4 + blob.aad.length);
	return out;
}

export function decodeBlob(bytes: Uint8Array): EncryptedBlob {
	if (bytes.length < NONCE_LEN + 4) throw new Error("blob too short");
	const nonce = bytes.slice(0, NONCE_LEN);
	const aadLen = new DataView(bytes.buffer, bytes.byteOffset + NONCE_LEN, 4).getUint32(0, true);
	const aadStart = NONCE_LEN + 4;
	const aad = bytes.slice(aadStart, aadStart + aadLen);
	const ciphertext = bytes.slice(aadStart + aadLen);
	return { nonce, ciphertext, aad };
}

/** Stash a viewer's ephemeral X25519 secret in sessionStorage, keyed by post_id. */
export function stashBuyerSk(postId: number | bigint, sk: Uint8Array) {
	sessionStorage.setItem(`feeds::buyer_sk::${postId}`, toHex(sk));
}
export function loadBuyerSk(postId: number | bigint): Uint8Array | null {
	const hex = sessionStorage.getItem(`feeds::buyer_sk::${postId}`);
	return hex ? fromHex(hex) : null;
}
export function dropBuyerSk(postId: number | bigint) {
	sessionStorage.removeItem(`feeds::buyer_sk::${postId}`);
}

/* Hex helpers — avoid pulling a dep for a single use case. */
function toHex(bytes: Uint8Array): string {
	return Array.from(bytes)
		.map((b) => b.toString(16).padStart(2, "0"))
		.join("");
}
function fromHex(hex: string): Uint8Array {
	const clean = hex.startsWith("0x") ? hex.slice(2) : hex;
	const out = new Uint8Array(clean.length / 2);
	for (let i = 0; i < out.length; i++) {
		out[i] = parseInt(clean.substring(i * 2, i * 2 + 2), 16);
	}
	return out;
}
