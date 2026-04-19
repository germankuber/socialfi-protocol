import { useCallback, useEffect, useState } from "react";
import type { PolkadotSigner } from "polkadot-api";
import { useSocialApi } from "./useSocialApi";
import { useTxTracker } from "./useTxTracker";

/**
 * Bitmask layout mirrors `pallet_social_managers::types::ManagerScope`. The
 * values are LOAD-BEARING: they are persisted on-chain and must match the
 * `#[repr(u16)]` variants in the pallet exactly. Never reorder them.
 */
export const MANAGER_SCOPE = {
	Post: 1 << 0,
	Comment: 1 << 1,
	Follow: 1 << 2,
	Collect: 1 << 3,
	UpdateProfile: 1 << 4,
} as const;

export type ManagerScopeKey = keyof typeof MANAGER_SCOPE;

export const ALL_SCOPE_KEYS: ManagerScopeKey[] = [
	"Post",
	"Comment",
	"Follow",
	"UpdateProfile",
	// `Collect` is reserved in the pallet for a future extrinsic. Hidden from
	// the UI until it maps to real on-chain behaviour.
];

/** Human-readable copy shown next to each scope checkbox. */
export const SCOPE_DESCRIPTIONS: Record<ManagerScopeKey, string> = {
	Post: "Create top-level posts",
	Comment: "Reply to posts",
	Follow: "Follow and unfollow other accounts",
	Collect: "Collect posts (reserved, not yet live)",
	UpdateProfile: "Update profile metadata and follow fee",
};

/** Build a `ScopeMask` value from a set of enabled scope keys. */
export function encodeScopeMask(scopes: ManagerScopeKey[]): number {
	return scopes.reduce((acc, s) => acc | MANAGER_SCOPE[s], 0);
}

/** Decode a `ScopeMask` into the list of scope keys present in the mask. */
export function decodeScopeMask(mask: number): ManagerScopeKey[] {
	return ALL_SCOPE_KEYS.filter((k) => (mask & MANAGER_SCOPE[k]) !== 0);
}

export interface ManagerRecord {
	/** Address that was authorized to act on the owner's behalf. */
	manager: string;
	/** Scopes encoded as a raw bitmask, useful when rendering raw data. */
	scopeMask: number;
	/** Decoded scope keys — prefer this for UI rendering. */
	scopes: ManagerScopeKey[];
	/** Block number at which this authorization expires, or `null` forever. */
	expiresAt: number | null;
	/** Balance reserved from the owner when the entry was created. */
	deposit: bigint;
}

/**
 * Owner-facing hook: manage the caller's manager entries and query them.
 *
 * All reads are keyed by the owner (the currently-selected account). If the
 * consumer needs to read a *different* owner's managers (e.g. the public
 * profile page showing "Bob has 3 managers"), pass an explicit `ownerAddress`
 * to `loadManagers`.
 */
export function useManagers(ownerAddress: string | null) {
	const { getApi } = useSocialApi();
	const tracker = useTxTracker();

	const [managers, setManagers] = useState<ManagerRecord[]>([]);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const loadManagers = useCallback(
		async (address: string | null) => {
			if (!address) {
				setManagers([]);
				return;
			}
			try {
				setLoading(true);
				setError(null);
				const api = getApi();
				const entries =
					await api.query.SocialManagers.ProfileManagers.getEntries(address);

				const decoded: ManagerRecord[] = entries.map((entry) => {
					const manager = entry.keyArgs[1].toString();
					const info = entry.value;
					const rawMask = Number(info.scopes);
					return {
						manager,
						scopeMask: rawMask,
						scopes: decodeScopeMask(rawMask),
						expiresAt:
							info.expires_at === undefined || info.expires_at === null
								? null
								: Number(info.expires_at),
						deposit: BigInt(info.deposit ?? 0),
					};
				});

				setManagers(decoded);
			} catch (e) {
				setError(e instanceof Error ? e.message : "Failed to load managers");
				setManagers([]);
			} finally {
				setLoading(false);
			}
		},
		[getApi],
	);

	useEffect(() => {
		loadManagers(ownerAddress);
	}, [ownerAddress, loadManagers]);

	const addManager = useCallback(
		async (
			manager: string,
			scopes: ManagerScopeKey[],
			expiresAt: number | null,
			signer: PolkadotSigner,
		) => {
			const api = getApi();
			const tx = api.tx.SocialManagers.add_manager({
				manager,
				scopes: encodeScopeMask(scopes),
				expires_at: expiresAt ?? undefined,
			});
			const ok = await tracker.submit(tx, signer, "Add Manager");
			if (ok) await loadManagers(ownerAddress);
			return ok;
		},
		[getApi, tracker, loadManagers, ownerAddress],
	);

	const removeManager = useCallback(
		async (manager: string, signer: PolkadotSigner) => {
			const api = getApi();
			const tx = api.tx.SocialManagers.remove_manager({ manager });
			const ok = await tracker.submit(tx, signer, "Remove Manager");
			if (ok) await loadManagers(ownerAddress);
			return ok;
		},
		[getApi, tracker, loadManagers, ownerAddress],
	);

	const removeAllManagers = useCallback(
		async (signer: PolkadotSigner) => {
			const api = getApi();
			const tx = api.tx.SocialManagers.remove_all_managers();
			const ok = await tracker.submit(tx, signer, "Revoke All Managers");
			if (ok) await loadManagers(ownerAddress);
			return ok;
		},
		[getApi, tracker, loadManagers, ownerAddress],
	);

	return {
		managers,
		loading,
		error,
		tracker,
		refresh: () => loadManagers(ownerAddress),
		addManager,
		removeManager,
		removeAllManagers,
	};
}

/**
 * Executor-facing hook: find which owners have authorized the current account
 * as their manager, and dispatch inner calls through `act_as_manager`.
 */
export function useActingAs(managerAddress: string | null) {
	const { getApi } = useSocialApi();
	const tracker = useTxTracker();

	const [authorizations, setAuthorizations] = useState<
		{ owner: string; scopes: ManagerScopeKey[]; expiresAt: number | null }[]
	>([]);
	const [loading, setLoading] = useState(false);

	const loadAuthorizations = useCallback(async () => {
		if (!managerAddress) {
			setAuthorizations([]);
			return;
		}
		try {
			setLoading(true);
			const api = getApi();
			// Full scan across the double map — fine for hackathon scale. For
			// production we'd add a reverse index `ManagersOf: Map<manager,
			// BoundedVec<owner>>` to avoid this.
			const entries =
				await api.query.SocialManagers.ProfileManagers.getEntries();
			const authorized = entries
				.filter((e) => e.keyArgs[1].toString() === managerAddress)
				.map((e) => {
					const rawMask = Number(e.value.scopes);
					return {
						owner: e.keyArgs[0].toString(),
						scopes: decodeScopeMask(rawMask),
						expiresAt:
							e.value.expires_at === undefined || e.value.expires_at === null
								? null
								: Number(e.value.expires_at),
					};
				});
			setAuthorizations(authorized);
		} finally {
			setLoading(false);
		}
	}, [getApi, managerAddress]);

	useEffect(() => {
		loadAuthorizations();
	}, [loadAuthorizations]);

	/**
	 * Dispatch `innerCall` as if the caller were `owner`. The inner call must
	 * be a PAPI-built `Tx` (for example `api.tx.SocialFeeds.create_post(...)`).
	 * Returns `true` when the finalized transaction succeeded.
	 *
	 * We pass `innerCall.decodedCall` (a tagged-enum shape PAPI expects for
	 * call-accepting extrinsics), NOT the SCALE-encoded bytes — the pallet's
	 * `call: Box<RuntimeCall>` argument wants the structured enum, and PAPI
	 * will encode it at submit time together with the outer extrinsic.
	 */
	const actAs = useCallback(
		async (
			owner: string,
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			innerCall: any,
			signer: PolkadotSigner,
			label: string,
		) => {
			const api = getApi();
			const tx = api.tx.SocialManagers.act_as_manager({
				owner,
				call: innerCall.decodedCall,
			});
			return tracker.submit(tx, signer, label);
		},
		[getApi, tracker],
	);

	return { authorizations, loading, tracker, refresh: loadAuthorizations, actAs };
}
