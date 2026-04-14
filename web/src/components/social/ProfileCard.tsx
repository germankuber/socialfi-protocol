import type { ProfileMetadata } from "../../hooks/social/useIpfs";
import { useIpfs } from "../../hooks/social/useIpfs";

interface ProfileCardProps {
	metadata: ProfileMetadata | null;
	cid: string;
	createdAt: number;
	loading?: boolean;
}

export default function ProfileCard({ metadata, cid, createdAt, loading }: ProfileCardProps) {
	const { ipfsUrl } = useIpfs();
	const avatarSrc = metadata?.avatar ? ipfsUrl(metadata.avatar) : "";

	if (loading) {
		return (
			<div className="flex items-center gap-3 animate-pulse">
				<div className="w-14 h-14 rounded-full bg-surface-800" />
				<div className="space-y-2">
					<div className="h-4 w-32 rounded bg-surface-800" />
					<div className="h-3 w-48 rounded bg-surface-800" />
				</div>
			</div>
		);
	}

	return (
		<div className="flex items-start gap-4">
			{/* Avatar */}
			{avatarSrc ? (
				<img
					src={avatarSrc}
					alt={metadata?.name ?? ""}
					className="w-14 h-14 rounded-full object-cover bg-surface-800 shrink-0"
					onError={(e) => {
						(e.target as HTMLImageElement).style.display = "none";
						(e.target as HTMLImageElement).nextElementSibling?.classList.remove("hidden");
					}}
				/>
			) : null}
			{!avatarSrc && (
				<div className="w-14 h-14 rounded-full bg-brand-500/20 flex items-center justify-center text-brand-500 text-lg font-bold shrink-0">
					{metadata?.name?.[0]?.toUpperCase() ?? "?"}
				</div>
			)}

			{/* Info */}
			<div className="flex-1 min-w-0">
				<h3 className="font-semibold text-lg">{metadata?.name ?? "Unknown"}</h3>
				{metadata?.bio && (
					<p className="text-sm text-secondary mt-0.5">{metadata.bio}</p>
				)}

				{/* Links */}
				{metadata?.links && Object.keys(metadata.links).length > 0 && (
					<div className="flex flex-wrap gap-3 mt-2">
						{metadata.links.twitter && (
							<a
								href={`https://twitter.com/${metadata.links.twitter.replace("@", "")}`}
								target="_blank"
								rel="noopener noreferrer"
								className="text-xs text-info hover:underline"
							>
								@{metadata.links.twitter.replace("@", "")}
							</a>
						)}
						{metadata.links.github && (
							<a
								href={`https://github.com/${metadata.links.github}`}
								target="_blank"
								rel="noopener noreferrer"
								className="text-xs text-info hover:underline"
							>
								github.com/{metadata.links.github}
							</a>
						)}
						{metadata.links.website && (
							<a
								href={metadata.links.website}
								target="_blank"
								rel="noopener noreferrer"
								className="text-xs text-info hover:underline"
							>
								{metadata.links.website.replace(/^https?:\/\//, "")}
							</a>
						)}
					</div>
				)}

				{/* Meta */}
				<div className="flex items-center gap-3 mt-2 text-[11px] text-surface-500">
					<span className="font-mono">Block #{createdAt}</span>
					<span className="font-mono truncate" title={cid}>
						{cid.length > 30 ? `${cid.slice(0, 15)}...${cid.slice(-10)}` : cid}
					</span>
				</div>
			</div>
		</div>
	);
}
