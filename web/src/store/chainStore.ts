import { create } from "zustand";
import { getStoredWsUrl } from "../config/network";
import type { PolkadotSigner } from "polkadot-api";

export interface WalletAccount {
	name: string;
	address: string;
	signer: PolkadotSigner;
	type: "dev" | "extension" | "host";
}

interface ChainState {
	wsUrl: string;
	connected: boolean;
	blockNumber: number;
	selectedAccountIndex: number;
	socialAvailable: boolean | null;
	externalAccounts: WalletAccount[];
	setWsUrl: (url: string) => void;
	setConnected: (connected: boolean) => void;
	setBlockNumber: (blockNumber: number) => void;
	setSelectedAccountIndex: (index: number) => void;
	setSocialAvailable: (available: boolean | null) => void;
	setExternalAccounts: (accounts: WalletAccount[]) => void;
}

export const useChainStore = create<ChainState>((set) => ({
	wsUrl: getStoredWsUrl(),
	connected: false,
	blockNumber: 0,
	selectedAccountIndex: 0,
	socialAvailable: null,
	externalAccounts: [],
	setWsUrl: (wsUrl) => {
		localStorage.setItem("ws-url", wsUrl);
		set({ wsUrl });
	},
	setConnected: (connected) => set({ connected }),
	setBlockNumber: (blockNumber) => set({ blockNumber }),
	setSelectedAccountIndex: (selectedAccountIndex) => set({ selectedAccountIndex }),
	setSocialAvailable: (socialAvailable) => set({ socialAvailable }),
	setExternalAccounts: (externalAccounts) => set({ externalAccounts }),
}));
