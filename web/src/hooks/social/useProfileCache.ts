import { useState, useCallback, useRef } from "react";
import { getClient } from "../useChain";
import { stack_template } from "@polkadot-api/descriptors";
import { useChainStore } from "../../store/chainStore";
import { fetchIdentity } from "./useIdentity";

export interface CachedProfile {
	name: string;
	avatar: string;
	verified: boolean;
}

const IPFS_GATEWAYS = [
	"https://ipfs.io/ipfs",
	"https://dweb.link/ipfs",
];

const profileCache = new Map<string, CachedProfile | null>();
const pendingRequests = new Map<string, Promise<CachedProfile | null>>();

async function resolveProfile(wsUrl: string, address: string): Promise<CachedProfile | null> {
	try {
		const api = getClient(wsUrl).getTypedApi(stack_template);

		// Fetch social profile + identity in parallel
		const [profileData, identityData] = await Promise.all([
			api.query.SocialProfiles.Profiles.getValue(address),
			fetchIdentity(wsUrl, address),
		]);

		if (!profileData) {
			// No social profile — maybe has identity only
			if (identityData?.hasIdentity && identityData.display) {
				return {
					name: identityData.display,
					avatar: "",
					verified: identityData.verified,
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
		};
	} catch {
		return null;
	}
}

export function useProfileCache() {
	const wsUrl = useChainStore((s) => s.wsUrl);
	const [, setTick] = useState(0);
	const tickRef = useRef(0);

	const getProfile = useCallback((address: string): CachedProfile | null => {
		if (profileCache.has(address)) {
			return profileCache.get(address) ?? null;
		}

		if (!pendingRequests.has(address)) {
			const promise = resolveProfile(wsUrl, address).then((profile) => {
				profileCache.set(address, profile);
				pendingRequests.delete(address);
				tickRef.current++;
				setTick(tickRef.current);
				return profile;
			});
			pendingRequests.set(address, promise);
		}

		return null;
	}, [wsUrl]);

	return { getProfile };
}
