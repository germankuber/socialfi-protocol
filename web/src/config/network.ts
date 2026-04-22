export const LOCAL_WS_URL = import.meta.env.VITE_LOCAL_WS_URL || "ws://localhost:9944";

export function getDefaultWsUrl() {
	return import.meta.env.VITE_WS_URL || LOCAL_WS_URL;
}

export function getStoredWsUrl() {
	return localStorage.getItem("ws-url") || getDefaultWsUrl();
}

// ── Polkadot People parachain ──────────────────────────────────────────
//
// Identity (display name + judgement) lives on the People system
// parachain, not on this template chain. The frontend opens a second
// PAPI connection here to read `Identity.IdentityOf(address)` and to
// submit `set_identity` / `request_judgement` from the wallet.
//
// The endpoint is sourced exclusively from `VITE_PEOPLE_WS_URL`
// (defined in `web/.env` / `web/.env.local`). In production that env
// points at the public Polkadot People RPC. In local dev you point it
// at a People fork running alongside your zombienet.

export function getPeopleWsUrl(): string {
	const url = import.meta.env.VITE_PEOPLE_WS_URL;
	if (!url) {
		throw new Error(
			"VITE_PEOPLE_WS_URL is not set. Add it to web/.env.local (see web/.env.example).",
		);
	}
	return url;
}
