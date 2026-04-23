import { useEffect, useState } from "react";
import { useSocialApi } from "../hooks/social/useSocialApi";
import { useSelectedAccount } from "../hooks/social/useSelectedAccount";
import { useIpfs } from "../hooks/social/useIpfs";
import { fetchPeopleIdentity } from "../hooks/social/useIdentity";
import VerificationBadge from "../components/social/VerificationBadge";
import { Link } from "react-router-dom";

interface UserEntry {
	address: string;
	name: string;
	bio: string;
	avatar: string;
	followFee: bigint;
	createdAt: number;
	/** "verified" | "pending" | "none" */
	verificationStatus: "verified" | "pending" | "none";
	followerCount: number;
}

export default function PeoplePage() {
	const { getApi } = useSocialApi();
	const { account } = useSelectedAccount();
	const { fetchProfileMetadata, ipfsUrl } = useIpfs();
	const [users, setUsers] = useState<UserEntry[]>([]);
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		loadUsers();
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	async function loadUsers() {
		try {
			setLoading(true);
			const api = getApi();
			const entries = await api.query.SocialProfiles.Profiles.getEntries();

			const userList: UserEntry[] = entries.map((e) => ({
				address: e.keyArgs[0].toString(),
				name: "",
				bio: "",
				avatar: "",
				followFee: e.value.follow_fee,
				createdAt: Number(e.value.created_at),
				verificationStatus: "none",
				followerCount: 0,
			}));

			setUsers(userList);

			// Resolve metadata + People identity + follower count in background
			for (const user of userList) {
				Promise.all([
					fetchProfileMetadata(
						entries
							.find((e) => e.keyArgs[0].toString() === user.address)!
							.value.metadata.asText(),
					),
					fetchPeopleIdentity(user.address),
					api.query.SocialGraph.FollowerCount.getValue(user.address),
				]).then(([meta, identity, fc]) => {
					const status: "verified" | "pending" | "none" = identity?.verified
						? "verified"
						: identity?.hasIdentity
							? "pending"
							: "none";
					setUsers((prev) =>
						prev.map((u) =>
							u.address === user.address
								? {
										...u,
										name: (meta as { name?: string })?.name || "",
										bio: (meta as { bio?: string })?.bio || "",
										avatar: (meta as { avatar?: string })?.avatar
											? ipfsUrl((meta as { avatar?: string }).avatar!)
											: "",
										verificationStatus: status,
										followerCount: Number(fc),
									}
								: u,
						),
					);
				});
			}
		} catch {
			setUsers([]);
		} finally {
			setLoading(false);
		}
	}

	return (
		<div className="space-y-6 animate-fade-in">
			<div className="flex items-center justify-between">
				<div>
					<h1 className="heading-1">People</h1>
					<p className="text-secondary text-sm mt-1">
						All registered users on the protocol.
					</p>
				</div>
				<button onClick={loadUsers} disabled={loading} className="btn-ghost btn-sm">
					{loading ? "..." : "Refresh"}
				</button>
			</div>

			{loading && users.length === 0 ? (
				<div className="flex items-center justify-center py-16">
					<div className="w-6 h-6 border-2 border-surface-600 border-t-brand-500 rounded-full animate-spin" />
				</div>
			) : users.length === 0 ? (
				<div className="panel text-center py-12 text-secondary">
					No users registered yet.
				</div>
			) : (
				<div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
					{users
						.sort((a, b) => b.followerCount - a.followerCount)
						.map((user) => (
							<Link
								key={user.address}
								to={`/profile/${user.address}`}
								className="panel-hover block"
							>
								<div className="flex items-center gap-4">
									{/* Avatar */}
									{user.avatar ? (
										<img
											src={user.avatar}
											alt={user.name}
											className="w-14 h-14 rounded-full object-cover bg-surface-800 shrink-0"
										/>
									) : (
										<div className="w-14 h-14 rounded-full bg-brand-500/20 flex items-center justify-center text-brand-500 text-lg font-bold shrink-0">
											{user.name?.[0]?.toUpperCase() ||
												user.address.slice(2, 4)}
										</div>
									)}

									<div className="flex-1 min-w-0">
										<div className="flex items-center gap-1.5 flex-wrap">
											<span className="font-semibold truncate">
												{user.name || user.address.slice(0, 10) + "..."}
											</span>
											<VerificationBadge status={user.verificationStatus} />
											{account?.address === user.address && (
												<span className="badge-info text-[9px]">You</span>
											)}
										</div>
										{user.bio && (
											<p className="text-xs text-secondary mt-0.5 line-clamp-1">
												{user.bio}
											</p>
										)}
										<div className="flex items-center gap-3 mt-1 text-[11px] text-surface-500">
											<span>{user.followerCount} followers</span>
											{user.followFee > 0n && (
												<span>Follow fee: {user.followFee.toString()}</span>
											)}
											<span className="font-mono">
												Block #{user.createdAt}
											</span>
										</div>
									</div>

									<svg
										className="w-4 h-4 text-surface-600 shrink-0"
										fill="none"
										viewBox="0 0 24 24"
										stroke="currentColor"
										strokeWidth={2}
									>
										<path
											strokeLinecap="round"
											strokeLinejoin="round"
											d="M9 5l7 7-7 7"
										/>
									</svg>
								</div>
								<style>{`html.light .bg-surface-800 { background: #f4f4f5; }`}</style>
							</Link>
						))}
				</div>
			)}
		</div>
	);
}
