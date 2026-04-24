import { Link } from "react-router-dom";
import { useProfileCache } from "../../hooks/social/useProfileCache";
import VerifiedBadge from "./VerifiedBadge";

interface AuthorDisplayProps {
	address: string;
	size?: "sm" | "md";
	showIdentityStatus?: boolean;
}

export default function AuthorDisplay({
	address,
	size = "sm",
	showIdentityStatus = true,
}: AuthorDisplayProps) {
	const { getProfile } = useProfileCache();
	const profile = getProfile(address);

	const avatarSize = size === "md" ? "w-10 h-10" : "w-6 h-6";
	const textSize = size === "md" ? "text-sm" : "text-xs";
	const truncated = `${address.slice(0, 6)}...${address.slice(-4)}`;

	return (
		<Link to={`/profile/${address}`} className="flex items-center gap-2 group" title={address}>
			{profile?.avatar ? (
				<img
					src={profile.avatar}
					alt={profile.name}
					className={`${avatarSize} rounded-full object-cover bg-surface-800 shrink-0`}
					onError={(e) => {
						(e.target as HTMLImageElement).style.display = "none";
					}}
				/>
			) : (
				<div
					className={`${avatarSize} rounded-full bg-brand-500 flex items-center justify-center text-white font-bold shrink-0 ${size === "sm" ? "text-[9px]" : "text-xs"}`}
				>
					{profile?.name?.[0]?.toUpperCase() || address.slice(2, 4)}
				</div>
			)}
			<span
				className={`${textSize} text-secondary group-hover:text-brand-500 transition-colors flex items-center gap-1`}
			>
				{profile?.name || truncated}
				{profile?.verified && <VerifiedBadge size={size} />}
			</span>
			{showIdentityStatus &&
				profile &&
				(profile.verified ? (
					<span className="inline-flex items-center gap-0.5 rounded-full bg-success/10 px-1.5 py-0.5 text-[9px] font-semibold text-success shrink-0">
						Verified
					</span>
				) : (
					<span className="inline-flex items-center rounded-full bg-surface-700/30 px-1.5 py-0.5 text-[9px] font-semibold text-surface-400 shrink-0">
						Unverified
					</span>
				))}
		</Link>
	);
}
