import { useState, useEffect, useCallback } from "react";
import { useSocialApi } from "./useSocialApi";
import { useSelectedAccount } from "./useSelectedAccount";

/** Checks whether the selected account has a profile on-chain. */
export function useProfileGate() {
	const { getApi } = useSocialApi();
	const { account } = useSelectedAccount();
	const [hasProfile, setHasProfile] = useState<boolean | null>(null);
	const [loading, setLoading] = useState(false);

	const accountAddress = account?.address ?? null;

	const check = useCallback(async () => {
		if (!accountAddress) { setHasProfile(null); return; }
		try {
			setLoading(true);
			const api = getApi();
			const data = await api.query.SocialProfiles.Profiles.getValue(accountAddress);
			setHasProfile(data != null);
		} catch {
			setHasProfile(null);
		} finally {
			setLoading(false);
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [accountAddress]);

	useEffect(() => { check(); }, [check]);

	return { hasProfile, loading, recheck: check, account };
}
