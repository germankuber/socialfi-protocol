import { useMemo } from "react";
import { useChainStore, type WalletAccount } from "../../store/chainStore";

/** Returns external wallet accounts (extension + host) and the selected one. */
export function useSelectedAccount() {
	const selectedAccountIndex = useChainStore((s) => s.selectedAccountIndex);
	const setSelectedAccountIndex = useChainStore((s) => s.setSelectedAccountIndex);
	const externalAccounts = useChainStore((s) => s.externalAccounts);

	const allAccounts: WalletAccount[] = useMemo(() => externalAccounts, [externalAccounts]);

	const safeIndex = allAccounts.length > 0
		? (selectedAccountIndex < allAccounts.length ? selectedAccountIndex : 0)
		: -1;
	const account = safeIndex >= 0 ? allAccounts[safeIndex] : null;

	return { account, allAccounts, selectedAccountIndex: safeIndex, setSelectedAccountIndex };
}
