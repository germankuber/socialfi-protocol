import { useCallback, useEffect, useState } from "react";
import { getClient } from "../useChain";
import { stack_template } from "@polkadot-api/descriptors";
import { useChainStore } from "../../store/chainStore";
import { fetchPeopleIdentity } from "./useIdentity";

export interface CachedProfile {
	name: string;
	avatar: string;
	verified: boolean;
	hasIdentity: boolean;
}

const IPFS_GATEWAYS = [
	"https://ipfs.io/ipfs",
	"https://dweb.link/ipfs",
];

const profileCache = new Map<string, CachedProfile | null>();
const pendingRequests = new Map<string, Promise<CachedProfile | null>>();

// Pub/sub so every consumer of `useProfileCache` re-renders when any profile
// resolves — not only the consumer that first triggered the fetch. Without
// this, a second component that calls `getProfile(addr)` after the fetch was
// kicked off by another component would be stuck rendering the fallback.
const subscribers = new Set<() => void>();

function notifyProfileResolved() {
	for (const cb of subscribers) cb();
}

async function resolveProfile(wsUrl: string, address: string): Promise<CachedProfile | null> {
	try {
		const api = getClient(wsUrl).getTypedApi(stack_template);

		// Fetch social profile (local chain) + People identity in parallel.
		const [profileData, identityData] = await Promise.all([
			api.query.SocialProfiles.Profiles.getValue(address),
			fetchPeopleIdentity(address),
		]);

		if (!profileData) {
			// No social profile — fall back to People identity display name.
			if (identityData?.hasIdentity && identityData.display) {
				return {
					name: identityData.display,
					avatar: "",
					verified: identityData.verified,
					hasIdentity: true,
				};
			}
			return null;
		}

		const cid = profileData.metadata.asText();
		let name = "";
		let avatar = "";

		// Try IPFS
		for (const gw of IPFS_GATEWAYS) {
			try {
				const res = await fetch(`${gw}/${cid}`, { signal: AbortSignal.timeout(6000) });
				if (res.ok) {
					const meta = await res.json();
					name = meta.name || meta.n || "";
					avatar = meta.avatar ? `${IPFS_GATEWAYS[0]}/${meta.avatar}` : "";
					break;
				}
			} catch {
				continue;
			}
		}

		// Fallback
		if (!name) {
			try {
				const parsed = JSON.parse(cid);
				name = parsed.n || parsed.name || "";
			} catch {
				name = cid.slice(0, 20);
			}
		}

		return {
			name,
			avatar,
			verified: identityData?.verified ?? false,
			hasIdentity: identityData?.hasIdentity ?? false,
		};
	} catch {
		return null;
	}
}

export function useProfileCache() {
	const wsUrl = useChainStore((s) => s.wsUrl);
	const [, setTick] = useState(0);

	// Subscribe this consumer to global cache resolutions so avatar/name
	// surfaces in EVERY component that displayed a placeholder, not just the
	// one that kicked off the fetch.
	useEffect(() => {
		const rerender = () => setTick((t) => t + 1);
		subscribers.add(rerender);
		return () => {
			subscribers.delete(rerender);
		};
	}, []);

	const getProfile = useCallback(
		(address: string): CachedProfile | null => {
			if (profileCache.has(address)) {
				return profileCache.get(address) ?? null;
			}

			if (!pendingRequests.has(address)) {
				const promise = resolveProfile(wsUrl, address).then((profile) => {
					profileCache.set(address, profile);
					pendingRequests.delete(address);
					notifyProfileResolved();
					return profile;
				});
				pendingRequests.set(address, promise);
			}

			return null;
		},
		[wsUrl],
	);

	return { getProfile };
}
