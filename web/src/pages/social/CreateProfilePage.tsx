import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Binary } from "polkadot-api";
import { useSocialApi } from "../../hooks/social/useSocialApi";
import { useSelectedAccount } from "../../hooks/social/useSelectedAccount";
import { useTxTracker } from "../../hooks/social/useTxTracker";
import { useIpfs, type ProfileMetadata } from "../../hooks/social/useIpfs";
import RequireWallet from "../../components/social/RequireWallet";
import ProfileForm from "../../components/social/ProfileForm";
import TxToast from "../../components/social/TxToast";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function identityDataValue(text: string): any {
	if (!text) return { type: "None", value: undefined };
	const bytes = new TextEncoder().encode(text.slice(0, 32));
	const n = bytes.length;
	return { type: `Raw${n}`, value: n === 1 ? bytes[0] : Binary.fromBytes(bytes) };
}
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function noneData(): any { return { type: "None", value: undefined }; }

export default function CreateProfilePage() {
	const navigate = useNavigate();
	const { getApi } = useSocialApi();
	const { account } = useSelectedAccount();
	const tracker = useTxTracker();
	const { uploadProfileMetadata } = useIpfs();
	const [uploading, setUploading] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const busy = uploading || tracker.state.stage === "signing" || tracker.state.stage === "broadcasting" || tracker.state.stage === "in_block";

	async function handleCreate(metadata: ProfileMetadata, followFee: string) {
		if (!account) return;
		try {
			setError(null);
			setUploading(true);
			const cid = await uploadProfileMetadata(metadata);
			setUploading(false);

			const api = getApi();
			const fee = BigInt(followFee || "0");

			// 1. Create social profile
			const tx = api.tx.SocialProfiles.create_profile({ metadata: Binary.fromText(cid), follow_fee: fee });
			const ok = await tracker.submit(tx, account.signer, "Create Profile");
			if (!ok) return;

			// 2. Set on-chain identity with the same data (automatic)
			try {
				const identityTx = api.tx.Identity.set_identity({
					info: {
						display: identityDataValue(metadata.name),
						twitter: identityDataValue(metadata.links?.twitter || ""),
						web: identityDataValue(metadata.links?.website || ""),
						email: noneData(),
						additional: [],
						legal: noneData(),
						riot: noneData(),
						image: noneData(),
						pgp_fingerprint: undefined,
					},
				});
				await tracker.submit(identityTx, account.signer, "Set Identity");
			} catch {
				// Identity set is best-effort — don't block profile creation
			}

			navigate("/");
		} catch (e) {
			setUploading(false);
			setError(e instanceof Error ? e.message : "Upload failed");
		}
	}

	return (
		<RequireWallet>
			<div className="space-y-6 animate-fade-in">
				<Link to="/" className="inline-flex items-center gap-1 text-xs text-secondary hover:text-surface-100 transition-colors">
					<svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
						<path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
					</svg>
					Back
				</Link>

				<div className="text-center space-y-2">
					<div className="w-16 h-16 rounded-full bg-brand-500/10 flex items-center justify-center mx-auto">
						<svg className="w-8 h-8 text-brand-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
							<path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
						</svg>
					</div>
					<h1 className="text-2xl font-bold">Create your profile</h1>
					<p className="text-secondary text-sm">
						Set up your on-chain identity. Your profile data is uploaded to IPFS — only the CID is stored on-chain.
					</p>
				</div>

				<div className="panel space-y-4">
					{error && (
						<div className="rounded-xl px-4 py-3 text-sm font-medium bg-danger/10 text-danger border border-danger/20">{error}</div>
					)}
					<ProfileForm
						onSubmit={handleCreate}
						submitLabel="Create Profile"
						disabled={busy}
					/>
				</div>

				<TxToast state={tracker.state} onDismiss={tracker.reset} />
			</div>
		</RequireWallet>
	);
}
