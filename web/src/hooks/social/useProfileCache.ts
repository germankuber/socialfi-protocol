import { useState, useCallback, useRef } from "react";
import { getClient } from "../useChain";
import { stack_template } from "@polkadot-api/descriptors";
import { useChainStore } from "../../store/chainStore";

export interface CachedProfile {
	name: string;
	avatar: string;
}

const IPFS_GATEWAYS = [
	"https://ipfs.io/ipfs",
	"https://dweb.link/ipfs",
];

/** Global in-memory cache shared across all hook instances. */
const profileCache = new Map<string, CachedProfile | null>();
const pendingRequests = new Map<string, Promise<CachedProfile | null>>();

async function resolveProfile(wsUrl: string, address: string): Promise<CachedProfile | null> {
	try {
		const api = getClient(wsUrl).getTypedApi(stack_template);
		const data = await api.query.SocialProfiles.Profiles.getValue(address);
		if (!data) return null;

		const cid = data.metadata.asText();

		// Try to parse as JSON (for profiles stored via our IPFS upload)
		for (const gw of IPFS_GATEWAYS) {
			try {
				const res = await fetch(`${gw}/${cid}`, { signal: AbortSignal.timeout(6000) });
				if (res.ok) {
					const meta = await res.json();
					return {
						name: meta.name || meta.n || "",
						avatar: meta.avatar ? `${IPFS_GATEWAYS[0]}/${meta.avatar}` : "",
					};
				}
			} catch {
				continue;
			}
		}

		// Fallback: CID itself might be a compact JSON
		try {
			const parsed = JSON.parse(cid);
			return { name: parsed.n || parsed.name || "", avatar: "" };
		} catch {
			// Plain text metadata
			return { name: cid.slice(0, 20), avatar: "" };
		}
	} catch {
		return null;
	}
}

/**
 * Hook that provides a function to get a cached profile by address.
 * Profiles are fetched once and cached globally in memory.
 */
export function useProfileCache() {
	const wsUrl = useChainStore((s) => s.wsUrl);
	const [, setTick] = useState(0);
	const tickRef = useRef(0);

	const getProfile = useCallback((address: string): CachedProfile | null => {
		if (profileCache.has(address)) {
			return profileCache.get(address) ?? null;
		}

		// Start fetching if not already pending
		if (!pendingRequests.has(address)) {
			const promise = resolveProfile(wsUrl, address).then((profile) => {
				profileCache.set(address, profile);
				pendingRequests.delete(address);
				// Trigger re-render in all components using this hook
				tickRef.current++;
				setTick(tickRef.current);
				return profile;
			});
			pendingRequests.set(address, promise);
		}

		return null; // Not yet loaded
	}, [wsUrl]);

	return { getProfile };
}
