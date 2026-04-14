import { useEffect, useState, useCallback } from "react";
import { Binary } from "polkadot-api";
import { useSocialApi } from "../../hooks/social/useSocialApi";
import { useSelectedAccount } from "../../hooks/social/useSelectedAccount";
import { useTxTracker } from "../../hooks/social/useTxTracker";
import { useIpfs, type ProfileMetadata } from "../../hooks/social/useIpfs";
import AccountSelector from "../../components/social/AccountSelector";
import RequireWallet from "../../components/social/RequireWallet";
import TxToast from "../../components/social/TxToast";
import ProfileForm from "../../components/social/ProfileForm";
import ProfileCard from "../../components/social/ProfileCard";

interface ProfileData {
	cid: string;
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

	const accountAddress = account?.address ?? null;

	const loadProfile = useCallback(async () => {
		if (!accountAddress) { setProfile(null); setResolvedMetadata(null); return; }
		try {
			setLoadingProfile(true);
			const api = getApi();
			const data = await api.query.SocialProfiles.Profiles.getValue(accountAddress);
			if (data) {
				const cid = data.metadata.asText();
				setProfile({ cid, createdAt: Number(data.created_at) });

				// Resolve metadata from IPFS
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
			setResolvedMetadata(null);
		} finally {
			setLoadingProfile(false);
			setLoadingMetadata(false);
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [accountAddress]);

	useEffect(() => { loadProfile(); }, [loadProfile]);

	async function handleCreate(metadata: ProfileMetadata) {
		if (!account) return;
		try {
			setError(null);
			setUploading(true);

			// 1. Upload metadata JSON to IPFS → get CID
			const cid = await uploadProfileMetadata(metadata);
			setUploading(false);

			// 2. Store CID on-chain
			const api = getApi();
			const tx = api.tx.SocialProfiles.create_profile({ metadata: Binary.fromText(cid) });
			const ok = await tracker.submit(tx, account.signer, "Create Profile");
			if (ok) { setShowForm(false); loadProfile(); }
		} catch (e) {
			setUploading(false);
			setError(e instanceof Error ? e.message : "Upload failed");
		}
	}

	async function handleUpdate(metadata: ProfileMetadata) {
		if (!account) return;
		try {
			setError(null);
			setUploading(true);
			const cid = await uploadProfileMetadata(metadata);
			setUploading(false);

			const api = getApi();
			const tx = api.tx.SocialProfiles.update_metadata({ new_metadata: Binary.fromText(cid) });
			const ok = await tracker.submit(tx, account.signer, "Update Profile");
			if (ok) { setShowForm(false); loadProfile(); }
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

	const busy = uploading || tracker.state.stage === "signing" || tracker.state.stage === "broadcasting" || tracker.state.stage === "in_block";

	return (
		<RequireWallet>
		<div className="space-y-4">
			<AccountSelector />

			{account && (
				<>
					<div className="panel space-y-4">
						<div className="flex items-center justify-between">
							<h2 className="heading-2">Profile</h2>
							{profile && (
								<div className="flex gap-2">
									<button onClick={() => setShowForm(!showForm)} className="btn-outline btn-sm">
										{showForm ? "Cancel" : "Edit"}
									</button>
									<button onClick={handleDelete} disabled={busy} className="btn-danger btn-sm">Delete</button>
								</div>
							)}
						</div>

						{loadingProfile ? (
							<div className="flex items-center gap-2 text-secondary text-sm">
								<div className="w-4 h-4 border-2 border-surface-600 border-t-brand-500 rounded-full animate-spin" />
								Loading...
							</div>
						) : profile ? (
							<ProfileCard metadata={resolvedMetadata} cid={profile.cid} createdAt={profile.createdAt} loading={loadingMetadata} />
						) : (
							<div className="text-center py-6 space-y-3">
								<div className="w-16 h-16 rounded-full bg-surface-800 flex items-center justify-center mx-auto">
									<svg className="w-8 h-8 text-surface-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
										<path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
									</svg>
								</div>
								<p className="text-secondary text-sm">No profile yet</p>
								<button onClick={() => setShowForm(true)} className="btn-brand btn-sm">Create Profile</button>
							</div>
						)}
						<style>{`html.light .bg-surface-800 { background: #f4f4f5; }`}</style>
					</div>

					{showForm && (
						<div className="panel space-y-4">
							<h2 className="heading-2">{profile ? "Update Profile" : "Create Profile"}</h2>
							<p className="text-xs text-secondary">
								Profile data and images are uploaded to IPFS. Only the CID (46 bytes) is stored on-chain.
							</p>
							{error && (
								<div className="rounded-xl px-4 py-3 text-sm font-medium bg-danger/10 text-danger border border-danger/20">{error}</div>
							)}
							<ProfileForm
								initial={resolvedMetadata ?? undefined}
								onSubmit={profile ? handleUpdate : handleCreate}
								submitLabel={profile ? "Update Profile" : "Create Profile"}
								disabled={busy}
							/>
						</div>
					)}
				</>
			)}

			<TxToast state={tracker.state} onDismiss={tracker.reset} />
		</div>
		</RequireWallet>
	);
}
