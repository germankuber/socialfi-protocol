import { AtSign, Link as LinkIcon, Globe } from "lucide-react";
import type { ProfileMetadata } from "../../hooks/social/useIpfs";
import { useIpfs } from "../../hooks/social/useIpfs";
import { Avatar, Skeleton } from "../ui";

interface ProfileCardProps {
	metadata: ProfileMetadata | null;
	cid: string;
	createdAt: number;
	loading?: boolean;
	address?: string;
}

export default function ProfileCard({
	metadata,
	cid,
	createdAt,
	loading,
	address,
}: ProfileCardProps) {
	const { ipfsUrl } = useIpfs();
	const avatarSrc = metadata?.avatar ? ipfsUrl(metadata.avatar) : undefined;
	const seed = address ?? metadata?.name ?? cid;

	if (loading) {
		return (
			<div className="flex items-start gap-4">
				<Skeleton rounded="full" className="h-14 w-14" />
				<div className="flex-1 space-y-2">
					<Skeleton className="h-4 w-32" />
					<Skeleton className="h-3 w-56" />
					<Skeleton className="h-3 w-40" />
				</div>
			</div>
		);
	}

	return (
		<div className="flex items-start gap-4">
			<Avatar src={avatarSrc} size="xl" seed={seed} alt={metadata?.name ?? ""} />

			<div className="min-w-0 flex-1">
				<h3 className="font-display text-2xl font-medium text-ink tracking-tight">
					{metadata?.name ?? "Untitled profile"}
				</h3>
				{metadata?.bio ? (
					<p className="mt-1 text-sm text-ink-muted text-pretty">{metadata.bio}</p>
				) : null}

				{metadata?.links && Object.keys(metadata.links).length > 0 && (
					<div className="mt-3 flex flex-wrap gap-3">
						{metadata.links.twitter && (
							<ProfileLink
								href={`https://twitter.com/${metadata.links.twitter.replace("@", "")}`}
								icon={<AtSign size={12} strokeWidth={1.75} />}
								label={`@${metadata.links.twitter.replace("@", "")}`}
							/>
						)}
						{metadata.links.github && (
							<ProfileLink
								href={`https://github.com/${metadata.links.github}`}
								icon={<LinkIcon size={12} strokeWidth={1.75} />}
								label={metadata.links.github}
							/>
						)}
						{metadata.links.website && (
							<ProfileLink
								href={metadata.links.website}
								icon={<Globe size={12} strokeWidth={1.75} />}
								label={metadata.links.website.replace(/^https?:\/\//, "")}
							/>
						)}
					</div>
				)}

				<div className="mt-4 flex flex-wrap items-center gap-4 font-mono text-[11px] tabular text-ink-subtle">
					<span className="inline-flex items-center gap-1.5">
						<span className="h-1 w-1 rounded-full bg-ink-faint" />
						block #{createdAt}
					</span>
					<span className="truncate" title={cid}>
						{cid.length > 30 ? `${cid.slice(0, 12)}…${cid.slice(-8)}` : cid}
					</span>
				</div>
			</div>
		</div>
	);
}

function ProfileLink({
	href,
	icon,
	label,
}: {
	href: string;
	icon: React.ReactNode;
	label: string;
}) {
	return (
		<a
			href={href}
			target="_blank"
			rel="noopener noreferrer"
			className="inline-flex items-center gap-1.5 rounded-md border border-hairline/[0.08] bg-canvas-sunken px-2 py-1 text-[11px] text-ink-muted transition-colors hover:border-brand/30 hover:text-brand"
		>
			{icon}
			{label}
		</a>
	);
}
