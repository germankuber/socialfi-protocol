import { useEffect, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import { Binary } from "polkadot-api";
import { Pencil, Trash2, UserPlus, Fingerprint, Hash, Blocks, Coins } from "lucide-react";
import { useSocialApi } from "../../hooks/social/useSocialApi";
import { useSelectedAccount } from "../../hooks/social/useSelectedAccount";
import { useTxTracker } from "../../hooks/social/useTxTracker";
import { useIpfs, type ProfileMetadata } from "../../hooks/social/useIpfs";
import RequireWallet from "../../components/social/RequireWallet";
import TxToast from "../../components/social/TxToast";
import ProfileForm from "../../components/social/ProfileForm";
import ProfileCard from "../../components/social/ProfileCard";
import { Badge, Button, Card, EmptyState, SectionHeading } from "../../components/ui";

interface ProfileData {
	cid: string;
	followFee: bigint;
	createdAt: number;
}

export default function ProfilePage() {
	const { getApi } = useSocialApi();
	const { account } = useSelectedAccount();
	const tracker = useTxTracker();
	const { uploadProfileMetadata, fetchProfileMetadata } = useIpfs();
	const [profile, setProfile] = useState<ProfileData | null>(null);
	const [resolvedMetadata, setResolvedMetadata] = useState<ProfileMetadata | null>(null);
	const [loadingProfile, setLoadingProfile] = useState(false);
	const [loadingMetadata, setLoadingMetadata] = useState(false);
	const [uploading, setUploading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [showForm, setShowForm] = useState(false);
	const [followerCount, setFollowerCount] = useState<number | null>(null);
	const [followingCount, setFollowingCount] = useState<number | null>(null);

	const accountAddress = account?.address ?? null;

	const loadProfile = useCallback(async () => {
		if (!accountAddress) {
			setProfile(null);
			setResolvedMetadata(null);
			return;
		}
		try {
			setLoadingProfile(true);
			const api = getApi();
			const data = await api.query.SocialProfiles.Profiles.getValue(accountAddress);
			if (data) {
				const cid = data.metadata.asText();
				setProfile({ cid, followFee: data.follow_fee, createdAt: Number(data.created_at) });

				setLoadingMetadata(true);
				const meta = await fetchProfileMetadata(cid);
				setResolvedMetadata(meta);
				setLoadingMetadata(false);

				// Follower / following counts
				try {
					const [followers, following] = await Promise.all([
						api.query.SocialGraph.FollowerCount.getValue(accountAddress),
						api.query.SocialGraph.FollowingCount.getValue(accountAddress),
					]);
					setFollowerCount(Number(followers ?? 0));
					setFollowingCount(Number(following ?? 0));
				} catch {
					setFollowerCount(null);
					setFollowingCount(null);
				}
			} else {
				setProfile(null);
				setResolvedMetadata(null);
			}
		} catch {
			setProfile(null);
			setResolvedMetadata(null);
		} finally {
			setLoadingProfile(false);
			setLoadingMetadata(false);
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [accountAddress]);

	useEffect(() => {
		loadProfile();
	}, [loadProfile]);

	async function handleCreate(metadata: ProfileMetadata, followFee: string) {
		if (!account) return;
		try {
			setError(null);
			setUploading(true);

			const cid = await uploadProfileMetadata(metadata);
			setUploading(false);

			const api = getApi();
			const tx = api.tx.SocialProfiles.create_profile({
				metadata: Binary.fromText(cid),
				follow_fee: BigInt(followFee || "0"),
			});
			const ok = await tracker.submit(tx, account.signer, "Create Profile");
			if (ok) {
				setShowForm(false);
				loadProfile();
			}
		} catch (e) {
			setUploading(false);
			setError(e instanceof Error ? e.message : "Upload failed");
		}
	}

	async function handleUpdate(metadata: ProfileMetadata, followFee: string) {
		if (!account) return;
		try {
			setError(null);
			setUploading(true);
			const cid = await uploadProfileMetadata(metadata);
			setUploading(false);

			const api = getApi();
			const tx = api.tx.SocialProfiles.update_metadata({
				new_metadata: Binary.fromText(cid),
			});
			const ok = await tracker.submit(tx, account.signer, "Update Profile");
			if (!ok) return;

			const fee = BigInt(followFee || "0");
			if (profile && fee !== profile.followFee) {
				const feeTx = api.tx.SocialProfiles.set_follow_fee({ fee });
				await tracker.submit(feeTx, account.signer, "Set Follow Fee");
			}

			setShowForm(false);
			loadProfile();
		} catch (e) {
			setUploading(false);
			setError(e instanceof Error ? e.message : "Upload failed");
		}
	}

	async function handleDelete() {
		if (!account) return;
		const api = getApi();
		const tx = api.tx.SocialProfiles.delete_profile();
		const ok = await tracker.submit(tx, account.signer, "Delete Profile");
		if (ok) loadProfile();
	}

	const busy =
		uploading ||
		tracker.state.stage === "signing" ||
		tracker.state.stage === "broadcasting" ||
		tracker.state.stage === "in_block";

	return (
		<RequireWallet>
			<div className="mx-auto max-w-4xl space-y-8">
				<SectionHeading
					eyebrow="Identity"
					title="Your profile"
					description="Profile metadata lives on IPFS. Only the CID and your follow fee are on-chain."
					action={
						profile ? (
							<div className="flex items-center gap-2">
								<Link to="/profile/edit">
									<Button
										variant="secondary"
										size="sm"
										leadingIcon={<Pencil size={13} />}
									>
										Edit
									</Button>
								</Link>
								<Button
									variant="danger"
									size="sm"
									onClick={handleDelete}
									disabled={busy}
									leadingIcon={<Trash2 size={13} />}
								>
									Delete
								</Button>
							</div>
						) : undefined
					}
				/>

				{account && (
					<>
						{/* Hero card */}
						<Card tone="overlay" padding="lg" className="relative overflow-hidden">
							{/* Ambient glow */}
							<div
								aria-hidden
								className="pointer-events-none absolute -top-32 -right-32 h-80 w-80 rounded-full bg-brand/10 blur-3xl"
							/>

							{loadingProfile ? (
								<ProfileCard metadata={null} cid="" createdAt={0} loading />
							) : profile ? (
								<ProfileCard
									metadata={resolvedMetadata}
									cid={profile.cid}
									createdAt={profile.createdAt}
									loading={loadingMetadata}
									address={accountAddress ?? undefined}
								/>
							) : (
								<EmptyState
									icon={<Fingerprint size={20} />}
									title="No profile yet"
									description="Mint your identity to start posting, following and composing with apps."
									action={
										<Button
											variant="primary"
											leadingIcon={<UserPlus size={14} />}
											onClick={() => setShowForm(true)}
										>
											Create profile
										</Button>
									}
								/>
							)}
						</Card>

						{/* Stats row */}
						{profile && (
							<div className="grid grid-cols-2 gap-3 md:grid-cols-4">
								<MetricCard
									label="Followers"
									value={followerCount !== null ? followerCount.toString() : "—"}
								/>
								<MetricCard
									label="Following"
									value={
										followingCount !== null ? followingCount.toString() : "—"
									}
								/>
								<MetricCard
									label="Follow fee"
									value={profile.followFee.toString()}
									icon={<Coins size={12} strokeWidth={1.75} />}
								/>
								<MetricCard
									label="Created"
									value={`#${profile.createdAt}`}
									mono
									icon={<Blocks size={12} strokeWidth={1.75} />}
								/>
							</div>
						)}

						{/* On-chain record */}
						{profile && (
							<Card tone="default" padding="lg" className="space-y-4">
								<div className="flex items-center gap-2">
									<Hash
										size={14}
										className="text-ink-subtle"
										strokeWidth={1.75}
									/>
									<h4 className="font-display text-lg font-medium text-ink">
										On-chain record
									</h4>
									<Badge tone="success" size="sm" dot className="ml-auto">
										Stored
									</Badge>
								</div>
								<dl className="grid grid-cols-1 gap-x-6 gap-y-3 border-t border-hairline/[0.06] pt-4 md:grid-cols-3">
									<Entry
										label="Address"
										value={accountAddress ?? "—"}
										mono
										truncate
									/>
									<Entry label="Metadata CID" value={profile.cid} mono truncate />
									<Entry
										label="Follow fee"
										value={`${profile.followFee.toString()}`}
										mono
									/>
								</dl>
							</Card>
						)}

						{showForm && (
							<Card tone="default" padding="lg" className="space-y-4">
								<div>
									<h3 className="font-display text-xl font-medium text-ink">
										{profile ? "Update profile" : "Create profile"}
									</h3>
									<p className="mt-1 text-xs text-ink-subtle">
										Profile data and images are uploaded to IPFS. Only the CID
										(46 bytes) is stored on-chain.
									</p>
								</div>

								{error && (
									<div className="rounded-lg border border-danger/20 bg-danger/5 px-4 py-3 text-sm font-medium text-danger">
										{error}
									</div>
								)}

								<ProfileForm
									initial={resolvedMetadata ?? undefined}
									initialFollowFee={profile ? profile.followFee.toString() : "0"}
									onSubmit={profile ? handleUpdate : handleCreate}
									submitLabel={profile ? "Update Profile" : "Create Profile"}
									disabled={busy}
								/>
							</Card>
						)}
					</>
				)}

				<TxToast state={tracker.state} onDismiss={tracker.reset} />
			</div>
		</RequireWallet>
	);
}

function MetricCard({
	label,
	value,
	icon,
	mono,
}: {
	label: string;
	value: string;
	icon?: React.ReactNode;
	mono?: boolean;
}) {
	return (
		<div className="rounded-xl border border-hairline/[0.07] bg-canvas-raised p-4">
			<div className="flex items-center justify-between">
				<span className="text-[10px] font-medium uppercase tracking-[0.14em] text-ink-subtle">
					{label}
				</span>
				{icon ? <span className="text-ink-subtle">{icon}</span> : null}
			</div>
			<p
				className={`mt-2 text-2xl font-medium tabular text-ink tracking-tight ${
					mono ? "font-mono" : "font-display"
				}`}
			>
				{value}
			</p>
		</div>
	);
}

function Entry({
	label,
	value,
	mono,
	truncate,
}: {
	label: string;
	value: string;
	mono?: boolean;
	truncate?: boolean;
}) {
	return (
		<div className="min-w-0">
			<dt className="text-[10px] font-medium uppercase tracking-[0.14em] text-ink-subtle">
				{label}
			</dt>
			<dd
				className={`mt-1 text-sm text-ink ${mono ? "font-mono tabular" : ""} ${
					truncate ? "truncate" : ""
				}`}
				title={value}
			>
				{value}
			</dd>
		</div>
	);
}
