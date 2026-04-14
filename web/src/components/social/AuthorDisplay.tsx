import { Link } from "react-router-dom";
import { useProfileCache } from "../../hooks/social/useProfileCache";

interface AuthorDisplayProps {
	address: string;
	size?: "sm" | "md";
}

export default function AuthorDisplay({ address, size = "sm" }: AuthorDisplayProps) {
	const { getProfile } = useProfileCache();
	const profile = getProfile(address);

	const avatarSize = size === "md" ? "w-10 h-10" : "w-6 h-6";
	const textSize = size === "md" ? "text-sm" : "text-xs";
	const truncated = `${address.slice(0, 6)}...${address.slice(-4)}`;

	return (
		<Link to={`/profile/${address}`} className="flex items-center gap-2 group" title={address}>
			{/* Avatar */}
			{profile?.avatar ? (
				<img
					src={profile.avatar}
					alt={profile.name}
					className={`${avatarSize} rounded-full object-cover bg-surface-800 shrink-0`}
					onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
				/>
			) : (
				<div className={`${avatarSize} rounded-full bg-brand-500 flex items-center justify-center text-white font-bold shrink-0 ${size === "sm" ? "text-[9px]" : "text-xs"}`}>
					{profile?.name?.[0]?.toUpperCase() || address.slice(2, 4)}
				</div>
			)}
			{/* Name */}
			<span className={`${textSize} text-secondary group-hover:text-brand-500 transition-colors`}>
				{profile?.name || truncated}
			</span>
		</Link>
	);
}
