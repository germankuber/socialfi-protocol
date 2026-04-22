import { useEffect, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import { Binary } from "polkadot-api";
import { useSocialApi } from "../../hooks/social/useSocialApi";
import { useSelectedAccount } from "../../hooks/social/useSelectedAccount";
import { useTxTracker } from "../../hooks/social/useTxTracker";
import { useIpfs, type ProfileMetadata } from "../../hooks/social/useIpfs";
import RequireWallet from "../../components/social/RequireWallet";
import TxToast from "../../components/social/TxToast";
import ProfileForm from "../../components/social/ProfileForm";
import ProfileCard from "../../components/social/ProfileCard";
import IdentityPanel from "../../components/social/IdentityPanel";

interface ProfileData {
	cid: string;
	followFee: bigint;
	createdAt: number;
}

export default function EditProfilePage() {
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

	const accountAddress = account?.address ?? null;

	const loadProfile = useCallback(async () => {
		if (!accountAddress) { setProfile(null); setResolvedMetadata(null); return; }
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
			} else {
				setProfile(null);
				setResolvedMetadata(null);
			}
		} catch {
			setProfile(null);
		} finally {
			setLoadingProfile(false);
			setLoadingMetadata(false);
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [accountAddress]);

	useEffect(() => { loadProfile(); }, [loadProfile]);

	async function handleUpdate(metadata: ProfileMetadata, followFee: string) {
		if (!account) return;
		try {
			setError(null);
			setUploading(true);
			const cid = await uploadProfileMetadata(metadata);
			setUploading(false);

			const api = getApi();
			const tx = api.tx.SocialProfiles.update_metadata({ new_metadata: Binary.fromText(cid) });
			const ok = await tracker.submit(tx, account.signer, "Update Profile");
			if (!ok) return;

			const fee = BigInt(followFee || "0");
			if (profile && fee !== profile.followFee) {
				await tracker.submit(api.tx.SocialProfiles.set_follow_fee({ fee }), account.signer, "Set Follow Fee");
			}

			// Identity (display name + verification) is maintained on the
			// Polkadot People parachain via the IdentityPanel on this page.
			// We no longer auto-sync here because that tx lives on a
			// different chain and requires DOT on People.

			loadProfile();
		} catch (e) {
			setUploading(false);
			setError(e instanceof Error ? e.message : "Upload failed");
		}
	}

	async function handleDelete() {
		if (!account) return;
		const ok = await tracker.submit(getApi().tx.SocialProfiles.delete_profile(), account.signer, "Delete Profile");
		if (ok) loadProfile();
	}

	const busy = uploading || tracker.state.stage === "signing" || tracker.state.stage === "broadcasting" || tracker.state.stage === "in_block";

	return (
		<RequireWallet>
			<div className="space-y-6 animate-fade-in">
				<Link to="/" className="inline-flex items-center gap-1 text-xs text-secondary hover:text-surface-100 transition-colors">
					<svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
						<path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
					</svg>
					Back
				</Link>

				<h1 className="heading-1">Edit Profile</h1>

				{loadingProfile ? (
					<div className="flex items-center gap-2 text-secondary text-sm">
						<div className="w-4 h-4 border-2 border-surface-600 border-t-brand-500 rounded-full animate-spin" />
						Loading...
					</div>
				) : profile ? (
					<>
						<div className="panel space-y-4">
							<div className="flex items-center justify-between">
								<h2 className="heading-2">Current Profile</h2>
								<button onClick={handleDelete} disabled={busy} className="btn-danger btn-sm">Delete</button>
							</div>
							<ProfileCard metadata={resolvedMetadata} cid={profile.cid} createdAt={profile.createdAt} loading={loadingMetadata} />
							<style>{`html.light .bg-surface-800 { background: #f4f4f5; }`}</style>
						</div>

						<div className="panel space-y-4">
							<h2 className="heading-2">Update</h2>
							{error && (
								<div className="rounded-xl px-4 py-3 text-sm font-medium bg-danger/10 text-danger border border-danger/20">{error}</div>
							)}
							<ProfileForm
								initial={resolvedMetadata ?? undefined}
								initialFollowFee={profile.followFee.toString()}
								onSubmit={handleUpdate}
								submitLabel="Save Changes"
								disabled={busy}
							/>
						</div>

						<IdentityPanel />
					</>
				) : (
					<div className="panel text-center py-8">
						<p className="text-secondary">No profile found.</p>
						<Link to="/create-profile" className="btn-brand btn-sm inline-flex mt-3">Create Profile</Link>
					</div>
				)}

				<TxToast state={tracker.state} onDismiss={tracker.reset} />
			</div>
		</RequireWallet>
	);
}
