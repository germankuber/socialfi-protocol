import { getClient } from "../useChain";
import { stack_template } from "@polkadot-api/descriptors";
import { useChainStore } from "../../store/chainStore";

/** Returns a PAPI typed API bound to the current WS endpoint. */
export function useSocialApi() {
	const wsUrl = useChainStore((s) => s.wsUrl);

	function getApi() {
		return getClient(wsUrl).getTypedApi(stack_template);
	}

	return { getApi, wsUrl };
}
