import { useCallback, useEffect, useState } from "react";
import { createClient } from "polkadot-api";
import { getWsProvider } from "polkadot-api/ws-provider/web";
import { getPeopleWsUrl } from "../../config/network";

export interface IdentityData {
	display: string;
	email: string;
	twitter: string;
	web: string;
	verified: boolean;
	judgement: string | null; // "KnownGood" | "Reasonable" | "FeePaid" | etc.
	registrarIndex: number | null;
	hasIdentity: boolean;
}

function decodeData(d: unknown): string {
	if (!d || typeof d !== "object") return "";
	const obj = d as { type?: string; value?: string | Uint8Array };
	if (obj.type === "None" || !obj.value) return "";
	if (obj.type === "Raw" || obj.type?.startsWith("Raw")) {
		const v = obj.value;
		if (v instanceof Uint8Array) return new TextDecoder().decode(v);
		if (typeof v === "string") return v;
	}
	return String(obj.value || "");
}

function parseJudgement(judgements: Array<unknown>): {
	verified: boolean;
	judgement: string | null;
	registrarIndex: number | null;
} {
	if (!Array.isArray(judgements) || judgements.length === 0) {
		return { verified: false, judgement: null, registrarIndex: null };
	}
	for (const j of judgements) {
		const arr = j as [number, { type: string }];
		const regIdx = arr[0];
		const jType = arr[1]?.type;
		if (jType === "KnownGood" || jType === "Reasonable") {
			return { verified: true, judgement: jType, registrarIndex: regIdx };
		}
	}
	const first = judgements[0] as [number, { type: string }];
	return {
		verified: false,
		judgement: first?.[1]?.type || null,
		registrarIndex: first?.[0] ?? null,
	};
}

// ── People chain connection ────────────────────────────────────────────
//
// Identity state lives on the Polkadot People system parachain. The
// endpoint is sourced from `VITE_PEOPLE_WS_URL` — see
// `web/src/config/network.ts`. The client is cached across hook
// instances so the whole app shares a single WebSocket.

interface CachedClient {
	url: string;
	client: ReturnType<typeof createClient>;
}

let peopleClient: CachedClient | null = null;

function getPeopleClient() {
	const url = getPeopleWsUrl();
	if (peopleClient && peopleClient.url === url) return peopleClient.client;
	// Close the previous client if the URL changed — rare, but possible
	// if a dev swaps `.env.local` while the app is hot-reloading.
	if (peopleClient) {
		try {
			peopleClient.client.destroy();
		} catch {
			/* noop */
		}
	}
	const client = createClient(getWsProvider(url));
	peopleClient = { url, client };
	return client;
}

/**
 * Fetch identity from the Polkadot People parachain for an arbitrary
 * address. Returns `null` on network / decode errors, a zeroed
 * `IdentityData` (with `hasIdentity: false`) when the address has no
 * entry, and a populated record when it does.
 *
 * Uses the unsafe (untyped) API because the template does not ship
 * with PAPI descriptors for People — depending on a different chain
 * metadata than this project's runtime would force every CI run to
 * connect to People. The unsafe API path is fine here: we only read
 * a single well-known storage item.
 */
export async function fetchPeopleIdentity(address: string): Promise<IdentityData | null> {
	try {
		const client = getPeopleClient();
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		const api: any = client.getUnsafeApi();
		const raw = await api.query.Identity.IdentityOf.getValue(address);
		if (!raw) {
			return {
				display: "",
				email: "",
				twitter: "",
				web: "",
				verified: false,
				judgement: null,
				registrarIndex: null,
				hasIdentity: false,
			};
		}

		// Storage shape varies by runtime version:
		// - classic:  Registration { judgements, info, deposit }
		// - with usernames: (Registration, Option<Username>)
		const reg = Array.isArray(raw) ? raw[0] : raw;
		const info = (reg as { info?: Record<string, unknown> })?.info || {};
		const judgements = (reg as { judgements?: unknown[] })?.judgements || [];

		const { verified, judgement, registrarIndex } = parseJudgement(judgements);

		return {
			display: decodeData(info.display),
			email: decodeData(info.email),
			twitter: decodeData(info.twitter),
			web: decodeData(info.web),
			verified,
			judgement,
			registrarIndex,
			hasIdentity: true,
		};
	} catch {
		return null;
	}
}

/**
 * React hook that loads identity for the given address from the
 * Polkadot People parachain. `identity.hasIdentity` is false when the
 * address has no People registration; pair with `identity.verified` to
 * drive the three-state `<VerificationBadge />`.
 */
export function useIdentity(address: string | null) {
	const [identity, setIdentity] = useState<IdentityData | null>(null);
	const [loading, setLoading] = useState(false);

	// Fetch runs inside the effect with a `cancelled` flag so a stale
	// resolution (after `address` changed) can't overwrite a fresher one.
	// The explicit reload handle mirrors the fetch so callers can refresh
	// without needing to bounce `address`.
	useEffect(() => {
		let cancelled = false;
		async function run() {
			if (!address) {
				setIdentity(null);
				return;
			}
			setLoading(true);
			const data = await fetchPeopleIdentity(address);
			if (cancelled) return;
			setIdentity(data);
			setLoading(false);
		}
		run();
		return () => {
			cancelled = true;
		};
	}, [address]);

	const reload = useCallback(async () => {
		if (!address) {
			setIdentity(null);
			return;
		}
		setLoading(true);
		const data = await fetchPeopleIdentity(address);
		setIdentity(data);
		setLoading(false);
	}, [address]);

	return { identity, loading, reload };
}
