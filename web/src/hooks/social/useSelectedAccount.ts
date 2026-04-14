import { useChainStore } from "../../store/chainStore";
import { devAccounts } from "../useAccount";

/** Returns the currently selected dev account and a setter. */
export function useSelectedAccount() {
	const selectedAccount = useChainStore((s) => s.selectedAccount);
	const setSelectedAccount = useChainStore((s) => s.setSelectedAccount);
	const account = devAccounts[selectedAccount];

	return { account, selectedAccount, setSelectedAccount };
}
