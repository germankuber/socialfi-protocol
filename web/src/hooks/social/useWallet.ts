import { useState, useEffect, useRef, useCallback } from "react";
import {
	getInjectedExtensions,
	connectInjectedExtension,
	type InjectedPolkadotAccount,
} from "polkadot-api/pjs-signer";
import { injectSpektrExtension, SpektrExtensionName } from "@novasamatech/product-sdk";

type SpektrStatus = "detecting" | "injecting" | "connected" | "unavailable" | "failed";

const STORAGE_KEY = "connected-wallet";

function isInHost(): boolean {
	if (typeof window === "undefined") return false;
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	if ((window as any).__HOST_WEBVIEW_MARK__) return true;
	try {
		if (window !== window.top) return true;
	} catch {
		return true;
	}
	return false;
}

export function useWallet() {
	const spektrUnsub = useRef<(() => void) | null>(null);
	const extensionUnsub = useRef<(() => void) | null>(null);

	const [spektrAccounts, setSpektrAccounts] = useState<InjectedPolkadotAccount[]>([]);
	const [spektrStatus, setSpektrStatus] = useState<SpektrStatus>("detecting");
	const [extensionAccounts, setExtensionAccounts] = useState<InjectedPolkadotAccount[]>([]);
	const [connectedWallet, setConnectedWallet] = useState<string | null>(null);
	// Detecting extensions is a synchronous read of window.injectedWeb3,
	// so we initialise it lazily at mount rather than inside a useEffect
	// (which would trigger a cascading render just to land the same value).
	const [availableWallets] = useState<string[]>(() => {
		try {
			return getInjectedExtensions().filter((name) => name !== SpektrExtensionName);
		} catch {
			return [];
		}
	});

	// Detect and inject Spektr
	useEffect(() => {
		let cancelled = false;
		async function initSpektr() {
			if (!isInHost()) {
				setSpektrStatus("unavailable");
				return;
			}
			setSpektrStatus("injecting");
			try {
				let injected = false;
				for (let i = 0; i < 10; i++) {
					if (await injectSpektrExtension()) {
						injected = true;
						break;
					}
					if (i < 9) await new Promise((r) => setTimeout(r, 500));
				}
				if (!injected) {
					setSpektrStatus("failed");
					return;
				}
				const ext = await connectInjectedExtension(SpektrExtensionName);
				if (cancelled) {
					ext.disconnect();
					return;
				}
				setSpektrAccounts(ext.getAccounts());
				setSpektrStatus("connected");
				spektrUnsub.current?.();
				spektrUnsub.current = ext.subscribe(setSpektrAccounts);
			} catch {
				setSpektrStatus("failed");
			}
		}
		initSpektr();
		return () => {
			cancelled = true;
			spektrUnsub.current?.();
			spektrUnsub.current = null;
		};
	}, []);

	// Connect to a wallet extension
	const connectWallet = useCallback(async (name: string) => {
		try {
			const ext = await connectInjectedExtension(name);
			setExtensionAccounts(ext.getAccounts());
			setConnectedWallet(name);
			localStorage.setItem(STORAGE_KEY, name);
			extensionUnsub.current?.();
			extensionUnsub.current = ext.subscribe(setExtensionAccounts);
		} catch {
			// connection failed
		}
	}, []);

	// Disconnect wallet
	const disconnectWallet = useCallback(() => {
		extensionUnsub.current?.();
		extensionUnsub.current = null;
		setExtensionAccounts([]);
		setConnectedWallet(null);
		localStorage.removeItem(STORAGE_KEY);
	}, []);

	// Auto-reconnect on mount if a wallet was previously connected
	useEffect(() => {
		const saved = localStorage.getItem(STORAGE_KEY);
		if (!saved) return;

		// Wait a bit for extensions to inject into the page
		const timer = setTimeout(async () => {
			try {
				const available = getInjectedExtensions();
				if (available.includes(saved)) {
					const ext = await connectInjectedExtension(saved);
					setExtensionAccounts(ext.getAccounts());
					setConnectedWallet(saved);
					extensionUnsub.current?.();
					extensionUnsub.current = ext.subscribe(setExtensionAccounts);
				} else {
					// Extension no longer available
					localStorage.removeItem(STORAGE_KEY);
				}
			} catch {
				localStorage.removeItem(STORAGE_KEY);
			}
		}, 300);

		return () => clearTimeout(timer);
	}, []);

	// Cleanup on unmount
	useEffect(() => {
		return () => {
			spektrUnsub.current?.();
			extensionUnsub.current?.();
		};
	}, []);

	return {
		spektrAccounts,
		spektrStatus,
		extensionAccounts,
		connectedWallet,
		availableWallets,
		connectWallet,
		disconnectWallet,
	};
}
