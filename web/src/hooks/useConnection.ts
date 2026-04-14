import { useCallback, useEffect, useRef } from "react";
import { getClient, disconnectClient } from "./useChain";
import { useChainStore } from "../store/chainStore";

let stackTemplateDescriptorPromise: Promise<
	(typeof import("@polkadot-api/descriptors"))["stack_template"]
> | null = null;

let connectId = 0;

async function getStackTemplateDescriptor() {
	if (!stackTemplateDescriptorPromise) {
		stackTemplateDescriptorPromise = import("@polkadot-api/descriptors").then(
			({ stack_template }) => stack_template,
		);
	}
	return stackTemplateDescriptorPromise;
}

export function useConnection() {
	const setWsUrl = useChainStore((s) => s.setWsUrl);
	const setConnected = useChainStore((s) => s.setConnected);
	const setBlockNumber = useChainStore((s) => s.setBlockNumber);
	const setSocialAvailable = useChainStore((s) => s.setSocialAvailable);

	const connect = useCallback(
		async (url: string) => {
			const id = ++connectId;
			setWsUrl(url);
			setConnected(false);
			setBlockNumber(0);
			setSocialAvailable(null);

			disconnectClient();

			try {
				const client = getClient(url);
				const descriptor = await getStackTemplateDescriptor();
				const chain = await Promise.race([
					client.getChainSpecData(),
					new Promise<never>((_, reject) =>
						setTimeout(() => reject(new Error("Connection timed out")), 10000),
					),
				]);

				if (connectId !== id) return { ok: false, chain: null };
				setConnected(true);

				const api = client.getTypedApi(descriptor);

				try {
					await api.query.SocialProfiles.ProfileCount.getValue();
					if (connectId === id) setSocialAvailable(true);
				} catch {
					if (connectId === id) setSocialAvailable(false);
				}

				return { ok: true, chain };
			} catch (e) {
				if (connectId !== id) return { ok: false, chain: null };
				setConnected(false);
				setBlockNumber(0);
				setSocialAvailable(false);
				throw e;
			}
		},
		[setBlockNumber, setConnected, setSocialAvailable, setWsUrl],
	);

	return { connect };
}

export function useConnectionManagement() {
	const wsUrl = useChainStore((s) => s.wsUrl);
	const connected = useChainStore((s) => s.connected);
	const setBlockNumber = useChainStore((s) => s.setBlockNumber);
	const { connect } = useConnection();
	const initialWsUrlRef = useRef(wsUrl);

	useEffect(() => {
		connect(initialWsUrlRef.current).catch(() => {});
		return () => {
			connectId += 1;
			disconnectClient();
		};
	}, [connect]);

	useEffect(() => {
		if (!connected) return;
		const client = getClient(wsUrl);
		const subscription = client.finalizedBlock$.subscribe((block) => {
			setBlockNumber(block.number);
		});
		return () => subscription.unsubscribe();
	}, [connected, setBlockNumber, wsUrl]);
}
