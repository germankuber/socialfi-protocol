import { useState } from "react";
import { Binary } from "polkadot-api";
import { useIdentity } from "../../hooks/social/useIdentity";
import { useSelectedAccount } from "../../hooks/social/useSelectedAccount";
import { useSocialApi } from "../../hooks/social/useSocialApi";
import { useTxTracker } from "../../hooks/social/useTxTracker";
import { useIpfs } from "../../hooks/social/useIpfs";
import VerifiedBadge from "./VerifiedBadge";
import TxToast from "./TxToast";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function dataValue(text: string): any {
	if (!text) return { type: "None", value: undefined };
	const bytes = new TextEncoder().encode(text.slice(0, 32));
	const n = bytes.length;
	return { type: `Raw${n}`, value: n === 1 ? bytes[0] : Binary.fromBytes(bytes) };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function noneData(): any {
	return { type: "None", value: undefined };
}

export default function IdentityPanel() {
	const { account } = useSelectedAccount();
	const { getApi } = useSocialApi();
	const { fetchProfileMetadata } = useIpfs();
	const tracker = useTxTracker();
	const { identity, loading, reload } = useIdentity(account?.address ?? null);
	const [showForm, setShowForm] = useState(false);
	const [display, setDisplay] = useState("");
	const [email, setEmail] = useState("");
	const [twitter, setTwitter] = useState("");
	const [web, setWeb] = useState("");

	if (!account) return null;

	const busy = tracker.state.stage === "signing" || tracker.state.stage === "broadcasting" || tracker.state.stage === "in_block";

	async function prefillFromProfile() {
		try {
			const api = getApi();
			const data = await api.query.SocialProfiles.Profiles.getValue(account!.address);
			if (!data) return;
			const meta = await fetchProfileMetadata(data.metadata.asText());
			if (meta) {
				setDisplay((meta as { name?: string }).name || "");
				setTwitter((meta as { links?: { twitter?: string } }).links?.twitter || "");
				setWeb((meta as { links?: { website?: string } }).links?.website || "");
			}
		} catch { /* ignore */ }
	}

	async function setIdentity() {
		if (!account || !display.trim()) return;
		const api = getApi();
		const info = {
			display: dataValue(display.trim()),
			email: dataValue(email.trim()),
			twitter: dataValue(twitter.trim()),
			web: dataValue(web.trim()),
			additional: [],
			legal: noneData(),
			riot: noneData(),
			image: noneData(),
			pgp_fingerprint: undefined,
		};
		const tx = api.tx.Identity.set_identity({ info });
		const ok = await tracker.submit(tx, account.signer, "Set Identity");
		if (ok) { setShowForm(false); reload(); }
	}

	async function requestJudgement() {
		if (!account) return;
		const api = getApi();
		const tx = api.tx.Identity.request_judgement({ reg_index: 0, max_fee: 0n });
		await tracker.submit(tx, account.signer, "Request Judgement");
		reload();
	}

	async function clearIdentity() {
		if (!account) return;
		const api = getApi();
		const tx = api.tx.Identity.clear_identity();
		const ok = await tracker.submit(tx, account.signer, "Clear Identity");
		if (ok) reload();
	}

	return (
		<div className="panel space-y-4">
			<div className="flex items-center justify-between">
				<h2 className="heading-2 flex items-center gap-2">
					On-chain Identity
					{identity?.verified && <VerifiedBadge size="md" />}
				</h2>
				{identity?.hasIdentity && (
					<button onClick={clearIdentity} disabled={busy} className="btn-danger btn-sm">Clear</button>
				)}
			</div>

			{loading ? (
				<div className="flex items-center gap-2 text-secondary text-sm">
					<div className="w-4 h-4 border-2 border-surface-600 border-t-brand-500 rounded-full animate-spin" />
					Loading...
				</div>
			) : identity?.hasIdentity ? (
				<div className="space-y-3">
					{/* Status */}
					<div className="flex items-center gap-2">
						{identity.verified ? (
							<>
								<span className="badge-success">Verified</span>
								<span className="text-xs text-secondary">by Registrar #{identity.registrarIndex}</span>
							</>
						) : identity.judgement === "FeePaid" ? (
							<span className="badge-info">Pending judgement</span>
						) : (
							<span className="badge-neutral">Unverified</span>
						)}
					</div>

					{/* Fields */}
					<div className="rounded-xl bg-surface-800 p-3 space-y-1.5 text-sm">
						{identity.display && <p><span className="text-secondary">Name:</span> {identity.display}</p>}
						{identity.twitter && <p><span className="text-secondary">Twitter:</span> {identity.twitter}</p>}
						{identity.web && <p><span className="text-secondary">Website:</span> {identity.web}</p>}
						{identity.email && <p><span className="text-secondary">Email:</span> {identity.email}</p>}
					</div>
					<style>{`html.light .bg-surface-800 { background: #f4f4f5; }`}</style>

					{/* Actions */}
					{!identity.verified && identity.judgement !== "FeePaid" && (
						<button onClick={requestJudgement} disabled={busy} className="btn-brand btn-sm">
							Request Verification
						</button>
					)}
				</div>
			) : (
				<div className="space-y-3">
					<p className="text-secondary text-sm">
						Set your on-chain identity for verification. This is separate from your social profile and visible across the Polkadot ecosystem.
					</p>
					{!showForm ? (
						<button onClick={() => { setShowForm(true); prefillFromProfile(); }} className="btn-outline btn-sm">
							Set Identity
						</button>
					) : (
						<div className="space-y-3">
							<button onClick={prefillFromProfile} className="text-xs text-brand-500 hover:underline">
								Pre-fill from social profile
							</button>
							<div>
								<label className="form-label">Display Name *</label>
								<input type="text" value={display} onChange={(e) => setDisplay(e.target.value)} placeholder="Your name" className="input" />
							</div>
							<div>
								<label className="form-label">Twitter</label>
								<input type="text" value={twitter} onChange={(e) => setTwitter(e.target.value)} placeholder="@handle" className="input" />
							</div>
							<div>
								<label className="form-label">Website</label>
								<input type="text" value={web} onChange={(e) => setWeb(e.target.value)} placeholder="https://..." className="input" />
							</div>
							<div>
								<label className="form-label">Email</label>
								<input type="text" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" className="input" />
							</div>
							<p className="text-[10px] text-surface-500">Setting identity requires a small deposit (refunded when cleared).</p>
							<div className="flex gap-2">
								<button onClick={() => setShowForm(false)} className="btn-ghost btn-sm">Cancel</button>
								<button onClick={setIdentity} disabled={!display.trim() || busy} className="btn-brand btn-sm">
									Set Identity
								</button>
							</div>
						</div>
					)}
				</div>
			)}

			<TxToast state={tracker.state} onDismiss={tracker.reset} />
		</div>
	);
}
