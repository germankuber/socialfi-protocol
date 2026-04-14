import { create } from "zustand";
import { getStoredWsUrl } from "../config/network";

interface ChainState {
	wsUrl: string;
	connected: boolean;
	blockNumber: number;
	selectedAccount: number;
	socialAvailable: boolean | null;
	setWsUrl: (url: string) => void;
	setConnected: (connected: boolean) => void;
	setBlockNumber: (blockNumber: number) => void;
	setSelectedAccount: (index: number) => void;
	setSocialAvailable: (available: boolean | null) => void;
}

export const useChainStore = create<ChainState>((set) => ({
	wsUrl: getStoredWsUrl(),
	connected: false,
	blockNumber: 0,
	selectedAccount: 0,
	socialAvailable: null,
	setWsUrl: (wsUrl) => {
		localStorage.setItem("ws-url", wsUrl);
		set({ wsUrl });
	},
	setConnected: (connected) => set({ connected }),
	setBlockNumber: (blockNumber) => set({ blockNumber }),
	setSelectedAccount: (index) => set({ selectedAccount: index }),
	setSocialAvailable: (socialAvailable) => set({ socialAvailable }),
}));
