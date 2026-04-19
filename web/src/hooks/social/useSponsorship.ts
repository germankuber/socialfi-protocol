import { useCallback, useEffect, useState } from "react";
import type { PolkadotSigner } from "polkadot-api";
import { useSocialApi } from "./useSocialApi";
import { useTxTracker } from "./useTxTracker";
import { useChainStore } from "../../store/chainStore";

/**
 * Tiny wrapper around the `pallet-sponsorship` extrinsics + the pot
 * balance. Consumers use this to top up the pot and to submit
 * `ChargeSponsored`-flagged transactions.
 *
 * NOTE: the sponsored-submit path is deliberately a thin helper rather
 * than a new `submit()` in useTxTracker — the only difference from a
 * normal sign flow is the `customSignedExtensions.ChargeSponsored.value`
 * field PAPI forwards into the signed payload.
 */
export function useSponsorship() {
	const { getApi } = useSocialApi();
	const tracker = useTxTracker();
	const blockNumber = useChainStore((s) => s.blockNumber);
	const [potBalance, setPotBalance] = useState<bigint>(0n);
	const [potAccount, setPotAccount] = useState<string | null>(null);

	const refresh = useCallback(async () => {
		const api = getApi();
		// The pot account is a PalletId-derived SS58. We don't expose it as
		// a constant (it's derived at runtime config time) so we ask the
		// System pallet for any account whose key matches... actually the
		// simplest path is to read the derived address from our runtime
		// constants once it's available. Until then we compute via the
		// PalletId prefix 'modl' + 'sp/spons' + 32-byte padding.
		const MODL = new TextEncoder().encode("modl");
		const TAG = new TextEncoder().encode("sp/spons");
		const raw = new Uint8Array(32);
		raw.set(MODL, 0);
		raw.set(TAG, 4);
		// PAPI's typed API does not expose an SS58 helper directly here;
		// encode via the runtime's ss58 format. We rely on PAPI accepting
		// either an SS58 string or raw bytes for balance queries.
		const { AccountId } = await import("polkadot-api");
		const ss58 = AccountId().dec(raw);
		setPotAccount(ss58);
		const info = await api.query.System.Account.getValue(ss58);
		setPotBalance(info.data.free);
	}, [getApi]);

	useEffect(() => {
		refresh().catch(() => setPotBalance(0n));
	}, [refresh, blockNumber]);

	const topUp = useCallback(
		async (amount: bigint, signer: PolkadotSigner) => {
			const api = getApi();
			const tx = api.tx.Sponsorship.top_up({ amount });
			const ok = await tracker.submit(tx, signer, "Top up pot");
			if (ok) refresh();
			return ok;
		},
		[getApi, tracker, refresh],
	);

	/**
	 * Sign and submit `tx` with the `ChargeSponsored` extension set to
	 * `true`. The pot pays the fee; the signer pays the tip (if any).
	 * Returns the boolean outcome exactly like `tracker.submit`.
	 */
	const submitSponsored = useCallback(
		async (
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			tx: any,
			signer: PolkadotSigner,
			label: string,
		) => {
			return tracker.submitWithOptions(tx, signer, label, {
				customSignedExtensions: {
					ChargeSponsored: { value: true },
				},
			});
		},
		[tracker],
	);

	return { potBalance, potAccount, topUp, submitSponsored, tracker, refresh };
}
