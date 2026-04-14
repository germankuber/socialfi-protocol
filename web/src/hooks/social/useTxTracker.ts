import { useState, useCallback, useRef, useEffect } from "react";
import type { PolkadotSigner } from "polkadot-api";
import { formatDispatchError } from "../../utils/format";

export type TxStage =
	| "idle"
	| "signing"
	| "broadcasting"
	| "in_block"
	| "finalized"
	| "error";

export interface TxState {
	stage: TxStage;
	message: string;
	blockHash?: string;
}

interface TxTracker {
	state: TxState;
	/** Submit a PAPI transaction and track its lifecycle. Returns true on success. */
	submit: (
		tx: { signSubmitAndWatch: (signer: PolkadotSigner) => import("rxjs").Observable<unknown> },
		signer: PolkadotSigner,
		label?: string,
	) => Promise<boolean>;
	reset: () => void;
}

const IDLE_STATE: TxState = { stage: "idle", message: "" };
const AUTO_DISMISS_MS = 6000;

export function useTxTracker(): TxTracker {
	const [state, setState] = useState<TxState>(IDLE_STATE);
	const timerRef = useRef<ReturnType<typeof setTimeout>>();
	const subRef = useRef<{ unsubscribe: () => void } | null>(null);

	useEffect(() => {
		return () => {
			if (timerRef.current) clearTimeout(timerRef.current);
			subRef.current?.unsubscribe();
		};
	}, []);

	const reset = useCallback(() => {
		if (timerRef.current) clearTimeout(timerRef.current);
		subRef.current?.unsubscribe();
		subRef.current = null;
		setState(IDLE_STATE);
	}, []);

	const submit = useCallback(
		(
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			tx: any,
			signer: PolkadotSigner,
			label = "Transaction",
		): Promise<boolean> => {
			if (timerRef.current) clearTimeout(timerRef.current);
			subRef.current?.unsubscribe();

			setState({ stage: "signing", message: `${label}: Waiting for signature...` });

			return new Promise<boolean>((resolve) => {
				try {
					const observable = tx.signSubmitAndWatch(signer);
					subRef.current = observable.subscribe({
						next: (ev: {
							type: string;
							found?: boolean;
							ok?: boolean;
							dispatchError?: unknown;
							block?: { hash?: string };
						}) => {
							if (ev.type === "signed") {
								setState({ stage: "broadcasting", message: `${label}: Signed. Broadcasting...` });
							} else if (ev.type === "broadcasted") {
								setState({ stage: "broadcasting", message: `${label}: Broadcasted. Waiting for block...` });
							} else if (ev.type === "txBestBlocksState") {
								if (ev.found) {
									if (ev.ok === false) {
										const errMsg = formatDispatchError(ev.dispatchError);
										setState({ stage: "error", message: `${label} failed: ${errMsg}` });
										subRef.current?.unsubscribe();
										subRef.current = null;
										resolve(false);
									} else {
										setState({
											stage: "in_block",
											message: `${label}: Included in block. Waiting for finalization...`,
											blockHash: ev.block?.hash,
										});
									}
								}
							} else if (ev.type === "finalized") {
								if (ev.ok === false) {
									const errMsg = formatDispatchError(ev.dispatchError);
									setState({ stage: "error", message: `${label} failed: ${errMsg}` });
									resolve(false);
								} else {
									setState({
										stage: "finalized",
										message: `${label}: Finalized!`,
										blockHash: ev.block?.hash,
									});
									timerRef.current = setTimeout(() => setState(IDLE_STATE), AUTO_DISMISS_MS);
									resolve(true);
								}
								subRef.current = null;
							}
						},
						error: (err: unknown) => {
							const msg = err instanceof Error ? err.message : String(err);
							setState({ stage: "error", message: `${label}: ${msg}` });
							subRef.current = null;
							resolve(false);
						},
					});
				} catch (err) {
					const msg = err instanceof Error ? err.message : String(err);
					setState({ stage: "error", message: `${label}: ${msg}` });
					resolve(false);
				}
			});
		},
		[],
	);

	return { state, submit, reset };
}
