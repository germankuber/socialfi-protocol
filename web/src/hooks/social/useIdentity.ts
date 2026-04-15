import { useCallback, useState, useEffect } from "react";
import { getClient } from "../useChain";
import { stack_template } from "@polkadot-api/descriptors";
import { useChainStore } from "../../store/chainStore";

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

function parseJudgement(judgements: Array<unknown>): { verified: boolean; judgement: string | null; registrarIndex: number | null } {
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
	// Return first judgement even if not verified
	const first = judgements[0] as [number, { type: string }];
	return { verified: false, judgement: first?.[1]?.type || null, registrarIndex: first?.[0] ?? null };
}

export async function fetchIdentity(wsUrl: string, address: string): Promise<IdentityData | null> {
	try {
		const api = getClient(wsUrl).getTypedApi(stack_template);
		const raw = await api.query.Identity.IdentityOf.getValue(address);
		if (!raw) return { display: "", email: "", twitter: "", web: "", verified: false, judgement: null, registrarIndex: null, hasIdentity: false };

		// raw is [Registration, Option<Username>] or just Registration depending on version
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

/** Hook to load identity for a specific address. */
export function useIdentity(address: string | null) {
	const wsUrl = useChainStore((s) => s.wsUrl);
	const [identity, setIdentity] = useState<IdentityData | null>(null);
	const [loading, setLoading] = useState(false);

	const load = useCallback(async () => {
		if (!address) { setIdentity(null); return; }
		setLoading(true);
		const data = await fetchIdentity(wsUrl, address);
		setIdentity(data);
		setLoading(false);
	}, [address, wsUrl]);

	useEffect(() => { load(); }, [load]);

	return { identity, loading, reload: load };
}
