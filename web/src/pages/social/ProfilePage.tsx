import { useEffect, useState, useCallback } from "react";
import { Binary } from "polkadot-api";
import { useSocialApi } from "../../hooks/social/useSocialApi";
import { useSelectedAccount } from "../../hooks/social/useSelectedAccount";
import { useTxStatus } from "../../hooks/social/useTxStatus";
import { formatDispatchError } from "../../utils/format";
import AccountSelector from "../../components/social/AccountSelector";
import TxStatusBanner from "../../components/social/TxStatusBanner";
import AddressDisplay from "../../components/social/AddressDisplay";

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

	useEffect(() => {
		loadProfile();
	}, [loadProfile]);

	async function createProfile() {
		if (!metadataInput.trim()) return;
		try {
			tx.setStatus("Submitting create_profile...");
			const api = getApi();
			const result = await api.tx.SocialProfiles.create_profile({
				metadata: Binary.fromText(metadataInput),
			}).signAndSubmit(account.signer);
			if (!result.ok) {
				tx.setError(formatDispatchError(result.dispatchError));
				return;
			}
			tx.setSuccess("Profile created!");
			setMetadataInput("");
			loadProfile();
		} catch (e) {
			tx.setError(e instanceof Error ? e.message : String(e));
		}
	}

	async function updateMetadata() {
		if (!metadataInput.trim()) return;
		try {
			tx.setStatus("Submitting update_metadata...");
			const api = getApi();
			const result = await api.tx.SocialProfiles.update_metadata({
				new_metadata: Binary.fromText(metadataInput),
			}).signAndSubmit(account.signer);
			if (!result.ok) {
				tx.setError(formatDispatchError(result.dispatchError));
				return;
			}
			tx.setSuccess("Metadata updated!");
			setMetadataInput("");
			loadProfile();
		} catch (e) {
			tx.setError(e instanceof Error ? e.message : String(e));
		}
	}

	async function deleteProfile() {
		try {
			tx.setStatus("Submitting delete_profile...");
			const api = getApi();
			const result = await api.tx.SocialProfiles.delete_profile().signAndSubmit(account.signer);
			if (!result.ok) {
				tx.setError(formatDispatchError(result.dispatchError));
				return;
			}
			tx.setSuccess("Profile deleted! Bond returned.");
			loadProfile();
		} catch (e) {
			tx.setError(e instanceof Error ? e.message : String(e));
		}
	}

	return (
		<div className="space-y-6">
			<AccountSelector />

			{/* Profile Status */}
			<div className="card space-y-4">
				<h2 className="section-title text-accent-purple">Profile Status</h2>
				{loading ? (
					<p className="text-text-muted text-sm">Loading...</p>
				) : profile ? (
					<div className="space-y-3">
						<div className="flex items-center gap-2">
							<span className="w-2 h-2 rounded-full bg-accent-green" />
							<span className="text-sm font-medium text-accent-green">Active</span>
						</div>
						<div className="rounded-lg bg-white/[0.02] border border-white/[0.04] p-3 space-y-2 text-sm">
							<p>
								<span className="text-text-tertiary">Owner: </span>
								<AddressDisplay address={account.address} />
							</p>
							<p>
								<span className="text-text-tertiary">Metadata: </span>
								<span className="font-mono text-xs text-text-secondary">
									{profile.metadata}
								</span>
							</p>
							<p>
								<span className="text-text-tertiary">Created at block: </span>
								<span className="font-mono text-text-secondary">#{profile.createdAt}</span>
							</p>
						</div>
						<button
							onClick={deleteProfile}
							className="px-3 py-1.5 rounded-lg bg-accent-red/10 text-accent-red text-xs font-medium hover:bg-accent-red/20 transition-colors"
						>
							Delete Profile
						</button>
					</div>
				) : (
					<div className="flex items-center gap-2">
						<span className="w-2 h-2 rounded-full bg-text-muted" />
						<span className="text-sm text-text-muted">No profile for this account</span>
					</div>
				)}
			</div>

			{/* Create / Update Form */}
			<div className="card space-y-4">
				<h2 className="section-title">{profile ? "Update Metadata" : "Create Profile"}</h2>
				<div>
					<label className="label">Metadata CID</label>
					<input
						type="text"
						value={metadataInput}
						onChange={(e) => setMetadataInput(e.target.value)}
						onKeyDown={(e) => e.key === "Enter" && (profile ? updateMetadata() : createProfile())}
						placeholder="QmYourIpfsCid..."
						className="input-field w-full"
					/>
					<p className="text-xs text-text-muted mt-1">
						IPFS CID pointing to your profile JSON (name, bio, avatar, links).
					</p>
				</div>
				{profile ? (
					<button
						onClick={updateMetadata}
						disabled={!metadataInput.trim()}
						className="btn-primary"
					>
						Update Metadata
					</button>
				) : (
					<button
						onClick={createProfile}
						disabled={!metadataInput.trim()}
						className="btn-primary"
					>
						Create Profile
					</button>
				)}
			</div>

			<TxStatusBanner status={tx.status} isError={tx.isError} />
		</div>
	);
}
