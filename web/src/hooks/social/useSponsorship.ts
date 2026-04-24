import { useCallback, useEffect, useState } from "react";
import type { PolkadotSigner } from "polkadot-api";
import { useSocialApi } from "./useSocialApi";
import { useTxTracker } from "./useTxTracker";
import { useChainStore } from "../../store/chainStore";

export interface SponsorshipState {
	/** Caller's personal sponsor pot (balance they have deposited to pay
	 *  fees for their beneficiaries). */
	myPot: bigint;
	/** Accounts the caller currently sponsors. */
	myBeneficiaries: string[];
	/** The sponsor paying for the caller's own txs, if any. */
	mySponsor: string | null;
	/** The caller's current sponsor's pot balance (if mySponsor is set). */
	mySponsorPot: bigint;
	loading: boolean;
}

/**
 * Hook for the sponsor-side and beneficiary-side views of the sponsorship
 * pallet. Exposes extrinsic wrappers and live state for the account
 * currently selected in the wallet store.
 */
export function useSponsorship(account: string | null) {
	const { getApi } = useSocialApi();
	const tracker = useTxTracker();
	const blockNumber = useChainStore((s) => s.blockNumber);
	const [state, setState] = useState<SponsorshipState>({
		myPot: 0n,
		myBeneficiaries: [],
		mySponsor: null,
		mySponsorPot: 0n,
		loading: false,
	});

	const refresh = useCallback(async () => {
		if (!account) {
			setState((s) => ({
				...s,
				myPot: 0n,
				myBeneficiaries: [],
				mySponsor: null,
				mySponsorPot: 0n,
			}));
			return;
		}
		try {
			setState((s) => ({ ...s, loading: true }));
			const api = getApi();

			// Pot the caller maintains as a sponsor.
			const myPot = await api.query.Sponsorship.SponsorPots.getValue(account);

			// Sponsor who covers the caller's fees, if any.
			const mySponsor = await api.query.Sponsorship.SponsorOf.getValue(account);

			// Beneficiaries the caller sponsors: scan by value (cheap at
			// dev scale — the whole storage map is small).
			const entries = await api.query.Sponsorship.SponsorOf.getEntries();
			const myBeneficiaries = entries
				.filter((e) => e.value?.toString() === account)
				.map((e) => e.keyArgs[0].toString());

			const mySponsorPot = mySponsor
				? await api.query.Sponsorship.SponsorPots.getValue(mySponsor.toString())
				: 0n;

			setState({
				myPot: myPot ?? 0n,
				myBeneficiaries,
				mySponsor: mySponsor ? mySponsor.toString() : null,
				mySponsorPot: mySponsorPot ?? 0n,
				loading: false,
			});
		} catch {
			setState((s) => ({ ...s, loading: false }));
		}
	}, [getApi, account]);

	useEffect(() => {
		refresh();
	}, [refresh, blockNumber]);

	const registerBeneficiary = useCallback(
		async (beneficiary: string, signer: PolkadotSigner) => {
			const tx = getApi().tx.Sponsorship.register_beneficiary({ beneficiary });
			const ok = await tracker.submit(tx, signer, "Add beneficiary");
			if (ok) refresh();
			return ok;
		},
		[getApi, tracker, refresh],
	);

	const revokeBeneficiary = useCallback(
		async (beneficiary: string, signer: PolkadotSigner) => {
			const tx = getApi().tx.Sponsorship.revoke_beneficiary({ beneficiary });
			const ok = await tracker.submit(tx, signer, "Revoke beneficiary");
			if (ok) refresh();
			return ok;
		},
		[getApi, tracker, refresh],
	);

	const revokeMySponsor = useCallback(
		async (signer: PolkadotSigner) => {
			const tx = getApi().tx.Sponsorship.revoke_my_sponsor();
			const ok = await tracker.submit(tx, signer, "Leave sponsor");
			if (ok) refresh();
			return ok;
		},
		[getApi, tracker, refresh],
	);

	const topUp = useCallback(
		async (amount: bigint, signer: PolkadotSigner) => {
			const tx = getApi().tx.Sponsorship.top_up({ amount });
			const ok = await tracker.submit(tx, signer, "Top up pot");
			if (ok) refresh();
			return ok;
		},
		[getApi, tracker, refresh],
	);

	const withdraw = useCallback(
		async (amount: bigint, signer: PolkadotSigner) => {
			const tx = getApi().tx.Sponsorship.withdraw({ amount });
			const ok = await tracker.submit(tx, signer, "Withdraw from pot");
			if (ok) refresh();
			return ok;
		},
		[getApi, tracker, refresh],
	);

	return {
		...state,
		tracker,
		refresh,
		registerBeneficiary,
		revokeBeneficiary,
		revokeMySponsor,
		topUp,
		withdraw,
	};
}
