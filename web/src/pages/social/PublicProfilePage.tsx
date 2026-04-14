import { useEffect, useState, useCallback } from "react";
import { useParams, Link } from "react-router-dom";
import { useSocialApi } from "../../hooks/social/useSocialApi";
import { useSelectedAccount } from "../../hooks/social/useSelectedAccount";
import { useTxTracker } from "../../hooks/social/useTxTracker";
import { useIpfs } from "../../hooks/social/useIpfs";
import ConfirmModal from "../../components/social/ConfirmModal";
import TxToast from "../../components/social/TxToast";

interface ProfileData {
	name: string;
	bio: string;
	avatar: string;
	followFee: bigint;
	createdAt: number;
	followerCount: number;
	followingCount: number;
}

export default function PublicProfilePage() {
	const { address } = useParams<{ address: string }>();
	const { getApi } = useSocialApi();
	const { account } = useSelectedAccount();
	const tracker = useTxTracker();
	const { fetchProfileMetadata, ipfsUrl } = useIpfs();
	const [profile, setProfile] = useState<ProfileData | null>(null);
	const [isFollowing, setIsFollowing] = useState(false);
	const [loading, setLoading] = useState(true);
	const [showFollowConfirm, setShowFollowConfirm] = useState(false);

	const targetAddress = address ?? "";
	const isOwnProfile = account?.address === targetAddress;

	const loadProfile = useCallback(async () => {
		if (!targetAddress) return;
		try {
			setLoading(true);
			const api = getApi();

			const data = await api.query.SocialProfiles.Profiles.getValue(targetAddress);
			if (!data) { setProfile(null); return; }

			const cid = data.metadata.asText();
			const meta = await fetchProfileMetadata(cid);

			const [fc, fgc] = await Promise.all([
				api.query.SocialGraph.FollowerCount.getValue(targetAddress),
				api.query.SocialGraph.FollowingCount.getValue(targetAddress),
			]);

			setProfile({
				name: meta?.name ?? cid.slice(0, 16),
				bio: meta?.bio ?? "",
				avatar: meta?.avatar ? ipfsUrl(meta.avatar) : "",
				followFee: data.follow_fee,
				createdAt: Number(data.created_at),
				followerCount: Number(fc),
				followingCount: Number(fgc),
			});

			// Check if current user follows this profile
			if (account?.address && account.address !== targetAddress) {
				const followEntry = await api.query.SocialGraph.Follows.getValue(account.address, targetAddress);
				setIsFollowing(followEntry != null);
			}
		} catch {
			setProfile(null);
		} finally {
			setLoading(false);
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [targetAddress, account?.address]);

	useEffect(() => { loadProfile(); }, [loadProfile]);

	const busy = tracker.state.stage === "signing" || tracker.state.stage === "broadcasting" || tracker.state.stage === "in_block";

	async function handleFollow() {
		if (!account) return;
		setShowFollowConfirm(false);
		const api = getApi();
		const tx = api.tx.SocialGraph.follow({ target: targetAddress });
		const ok = await tracker.submit(tx, account.signer, "Follow");
		if (ok) loadProfile();
	}

	async function handleUnfollow() {
		if (!account) return;
		const api = getApi();
		const tx = api.tx.SocialGraph.unfollow({ target: targetAddress });
		const ok = await tracker.submit(tx, account.signer, "Unfollow");
		if (ok) loadProfile();
	}

	if (loading) {
		return (
			<div className="flex items-center justify-center py-16">
				<div className="w-6 h-6 border-2 border-surface-600 border-t-brand-500 rounded-full animate-spin" />
			</div>
		);
	}

	if (!profile) {
		return (
			<div className="panel text-center py-12 space-y-3 animate-fade-in">
				<p className="text-secondary">No profile found for this address.</p>
				<Link to="/" className="btn-outline btn-sm inline-flex">Back</Link>
			</div>
		);
	}

	const truncated = `${targetAddress.slice(0, 10)}...${targetAddress.slice(-8)}`;

	return (
		<div className="space-y-4 animate-fade-in">
			<Link to="/" className="inline-flex items-center gap-1 text-xs text-secondary hover:text-surface-100 transition-colors">
				<svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
					<path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
				</svg>
				Back
			</Link>

			{/* Profile card */}
			<div className="panel space-y-4">
				<div className="flex items-start gap-4">
					{/* Avatar */}
					{profile.avatar ? (
						<img src={profile.avatar} alt={profile.name} className="w-20 h-20 rounded-full object-cover bg-surface-800 shrink-0" />
					) : (
						<div className="w-20 h-20 rounded-full bg-brand-500/20 flex items-center justify-center text-brand-500 text-2xl font-bold shrink-0">
							{profile.name[0]?.toUpperCase() ?? "?"}
						</div>
					)}

					<div className="flex-1 min-w-0">
						<h1 className="text-xl font-bold">{profile.name}</h1>
						<p className="text-xs font-mono text-secondary mt-0.5" title={targetAddress}>{truncated}</p>
						{profile.bio && <p className="text-sm text-secondary mt-2">{profile.bio}</p>}

						{/* Stats */}
						<div className="flex items-center gap-4 mt-3">
							<div>
								<span className="font-bold">{profile.followerCount}</span>
								<span className="text-xs text-secondary ml-1">followers</span>
							</div>
							<div>
								<span className="font-bold">{profile.followingCount}</span>
								<span className="text-xs text-secondary ml-1">following</span>
							</div>
							{profile.followFee > 0n && (
								<div>
									<span className="text-xs text-secondary">Follow fee:</span>
									<span className="font-mono text-xs ml-1">{profile.followFee.toString()}</span>
								</div>
							)}
						</div>
					</div>

					{/* Action buttons */}
					{account && !isOwnProfile && (
						<div className="shrink-0">
							{isFollowing ? (
								<button onClick={handleUnfollow} disabled={busy} className="btn-outline btn-sm">
									Unfollow
								</button>
							) : (
								<button
									onClick={() => profile.followFee > 0n ? setShowFollowConfirm(true) : handleFollow()}
									disabled={busy}
									className="btn-brand btn-sm"
								>
									Follow
								</button>
							)}
						</div>
					)}

					{isOwnProfile && (
						<Link to="/social/profile" className="btn-outline btn-sm shrink-0">
							Edit Profile
						</Link>
					)}
				</div>
				<style>{`html.light .bg-surface-800 { background: #f4f4f5; }`}</style>
			</div>

			{/* Follow cost confirmation */}
			<ConfirmModal
				open={showFollowConfirm}
				title="Follow Cost"
				confirmLabel={busy ? "Processing..." : "Confirm & Follow"}
				confirmDisabled={busy}
				onCancel={() => setShowFollowConfirm(false)}
				onConfirm={handleFollow}
			>
				<div className="space-y-3 text-sm">
					<div className="rounded-xl bg-surface-800 p-3 space-y-2">
						<div className="flex items-center justify-between">
							<span className="text-secondary">Follow fee (to {profile.name})</span>
							<span className="font-mono font-semibold">{profile.followFee.toString()}</span>
						</div>
					</div>
					<p className="text-xs text-secondary">This fee is transferred to the user you follow. No refund on unfollow.</p>
					<style>{`html.light .bg-surface-800 { background: #f4f4f5; }`}</style>
				</div>
			</ConfirmModal>

			<TxToast state={tracker.state} onDismiss={tracker.reset} />
		</div>
	);
}
