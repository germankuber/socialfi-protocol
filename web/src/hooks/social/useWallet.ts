import { useState, useEffect, useRef, useCallback } from "react";
import {
	getInjectedExtensions,
	connectInjectedExtension,
	type InjectedPolkadotAccount,
} from "polkadot-api/pjs-signer";
import { injectSpektrExtension, SpektrExtensionName } from "@novasamatech/product-sdk";

type SpektrStatus = "detecting" | "injecting" | "connected" | "unavailable" | "failed";

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
	const [availableWallets, setAvailableWallets] = useState<string[]>([]);

	// Detect browser extensions
	useEffect(() => {
		try {
			const wallets = getInjectedExtensions().filter((name) => name !== SpektrExtensionName);
			setAvailableWallets(wallets);
		} catch {
			// no extensions
		}
	}, []);

	// Detect and inject Spektr (Polkadot Host / Nova mobile)
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

	const connectWallet = useCallback(async (name: string) => {
		try {
			const ext = await connectInjectedExtension(name);
			setExtensionAccounts(ext.getAccounts());
			setConnectedWallet(name);
			extensionUnsub.current?.();
			extensionUnsub.current = ext.subscribe(setExtensionAccounts);
		} catch {
			// connection failed
		}
	}, []);

	const disconnectWallet = useCallback(() => {
		extensionUnsub.current?.();
		extensionUnsub.current = null;
		setExtensionAccounts([]);
		setConnectedWallet(null);
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
