import { useProfileCache } from "../../hooks/social/useProfileCache";
import VerificationBadge from "./VerificationBadge";

interface IdentityBadgeProps {
	address: string;
}

/**
 * Compact identity indicator keyed off the cached People-chain identity
 * resolved by `useProfileCache`. Renders nothing until the cache has
 * an entry for the address.
 */
export default function IdentityBadge({ address }: IdentityBadgeProps) {
	const { getProfile } = useProfileCache();
	const profile = getProfile(address);
	if (!profile) return null;

	const status = profile.verified
		? "verified"
		: profile.hasIdentity
			? "pending"
			: "none";

	return <VerificationBadge status={status} />;
}
