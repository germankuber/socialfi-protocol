import { useEffect, useState, useCallback } from "react";
import { Binary } from "polkadot-api";
import { useSocialApi } from "../../hooks/social/useSocialApi";
import { useSelectedAccount } from "../../hooks/social/useSelectedAccount";
import { useTxStatus } from "../../hooks/social/useTxStatus";
import { formatDispatchError } from "../../utils/format";
import AccountSelector from "../../components/social/AccountSelector";
import TxStatusBanner from "../../components/social/TxStatusBanner";

interface ProfileData {
	metadata: string;
	createdAt: number;
}

export default function ProfilePage() {
	const { getApi } = useSocialApi();
	const { account } = useSelectedAccount();
	const tx = useTxStatus();
	const [profile, setProfile] = useState<ProfileData | null>(null);
	const [loading, setLoading] = useState(true);
	const [metadataInput, setMetadataInput] = useState("");

	const loadProfile = useCallback(async () => {
		try {
			setLoading(true);
			const api = getApi();
			const data = await api.query.SocialProfiles.Profiles.getValue(account.address);
			if (data) {
				setProfile({
					metadata: data.metadata.asText(),
					createdAt: Number(data.created_at),
				});
			} else {
				setProfile(null);
			}
		} catch {
			setProfile(null);
		} finally {
			setLoading(false);
		}
	}, [account.address, getApi]);

	useEffect(() => { loadProfile(); }, [loadProfile]);

	async function createProfile() {
		if (!metadataInput.trim()) return;
		try {
			tx.setStatus("Creating profile...");
			const api = getApi();
			const result = await api.tx.SocialProfiles.create_profile({
				metadata: Binary.fromText(metadataInput),
			}).signAndSubmit(account.signer);
			if (!result.ok) { tx.setError(formatDispatchError(result.dispatchError)); return; }
			tx.setSuccess("Profile created!");
			setMetadataInput("");
			loadProfile();
		} catch (e) { tx.setError(e instanceof Error ? e.message : String(e)); }
	}

	async function updateMetadata() {
		if (!metadataInput.trim()) return;
		try {
			tx.setStatus("Updating metadata...");
			const api = getApi();
			const result = await api.tx.SocialProfiles.update_metadata({
				new_metadata: Binary.fromText(metadataInput),
			}).signAndSubmit(account.signer);
			if (!result.ok) { tx.setError(formatDispatchError(result.dispatchError)); return; }
			tx.setSuccess("Metadata updated!");
			setMetadataInput("");
			loadProfile();
		} catch (e) { tx.setError(e instanceof Error ? e.message : String(e)); }
	}

	async function deleteProfile() {
		try {
			tx.setStatus("Deleting profile...");
			const api = getApi();
			const result = await api.tx.SocialProfiles.delete_profile().signAndSubmit(account.signer);
			if (!result.ok) { tx.setError(formatDispatchError(result.dispatchError)); return; }
			tx.setSuccess("Profile deleted. Bond returned.");
			loadProfile();
		} catch (e) { tx.setError(e instanceof Error ? e.message : String(e)); }
	}

	return (
		<div className="space-y-4">
			<AccountSelector />
			<TxStatusBanner status={tx.status} isError={tx.isError} />

			{/* Current profile */}
			<div className="panel space-y-4">
				<h2 className="heading-2">Profile Status</h2>

				{loading ? (
					<div className="flex items-center gap-2 text-secondary text-sm">
						<div className="w-4 h-4 border-2 border-surface-600 border-t-brand-500 rounded-full animate-spin" />
						Loading...
					</div>
				) : profile ? (
					<div className="space-y-3">
						<div className="flex items-center gap-2">
							<span className="badge-success">Active</span>
							<span className="text-xs text-secondary font-mono">
								Block #{profile.createdAt}
							</span>
						</div>
						<div className="rounded-xl bg-surface-800 p-4 space-y-1">
							<p className="text-xs text-secondary">Metadata CID</p>
							<p className="font-mono text-sm break-all">{profile.metadata}</p>
						</div>
						<style>{`html.light .bg-surface-800 { background: #f4f4f5; }`}</style>
						<button onClick={deleteProfile} className="btn-danger btn-sm">
							Delete Profile
						</button>
					</div>
				) : (
					<p className="text-secondary text-sm">No profile found for this account.</p>
				)}
			</div>

			{/* Form */}
			<div className="panel space-y-4">
				<h2 className="heading-2">{profile ? "Update Metadata" : "Create Profile"}</h2>
				<div>
					<label className="form-label">Metadata CID</label>
					<input
						type="text"
						value={metadataInput}
						onChange={(e) => setMetadataInput(e.target.value)}
						onKeyDown={(e) => e.key === "Enter" && (profile ? updateMetadata() : createProfile())}
						placeholder="QmYourIpfsCid..."
						className="input"
					/>
				</div>
				<button
					onClick={profile ? updateMetadata : createProfile}
					disabled={!metadataInput.trim()}
					className="btn-brand"
				>
					{profile ? "Update Metadata" : "Create Profile"}
				</button>
			</div>
		</div>
	);
}
