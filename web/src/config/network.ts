export const LOCAL_WS_URL = import.meta.env.VITE_LOCAL_WS_URL || "ws://localhost:9944";

export function getDefaultWsUrl() {
	return import.meta.env.VITE_WS_URL || LOCAL_WS_URL;
}

export function getStoredWsUrl() {
	return localStorage.getItem("ws-url") || getDefaultWsUrl();
}
