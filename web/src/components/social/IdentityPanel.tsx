import { useState } from "react";
import { Binary, createClient } from "polkadot-api";
import { getWsProvider } from "polkadot-api/ws-provider/web";
import { useIdentity } from "../../hooks/social/useIdentity";
import { useSelectedAccount } from "../../hooks/social/useSelectedAccount";
import { useSocialApi } from "../../hooks/social/useSocialApi";
import { useTxTracker } from "../../hooks/social/useTxTracker";
import { useIpfs } from "../../hooks/social/useIpfs";
import { getPeopleWsUrl } from "../../config/network";
import VerificationBadge, { identityStatus } from "./VerificationBadge";
import TxToast from "./TxToast";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function dataValue(text: string): any {
	if (!text) return { type: "None", value: undefined };
	const bytes = new TextEncoder().encode(text.slice(0, 32));
	const n = bytes.length;
	// Each `RawN` variant in the pallet-identity `Data` enum carries a
	// `FixedSizeBinary<N>` payload. PAPI uses `Binary.fromBytes` for the
	// entire range — the previous `n === 1 ? bytes[0] : ...` branch
	// produced a raw number that the SCALE encoder cannot serialize.
	return { type: `Raw${n}`, value: Binary.fromBytes(bytes) };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function noneData(): any {
	return { type: "None", value: undefined };
}

// ── Dedicated PAPI client for People chain writes ──────────────────────
//
// Identity extrinsics (`set_identity`, `request_judgement`, `clear_identity`)
// are submitted to the Polkadot People parachain, NOT to this project's
// chain. The People endpoint is sourced from `VITE_PEOPLE_WS_URL`. The
// client is cached across renders so the WebSocket stays warm.
//
// We intentionally use the **unsafe (untyped) API** here to avoid
// pulling People-specific PAPI descriptors into the repo. All three
// identity calls are well-known and stable across Polkadot SDK
// versions.

interface CachedClient {
	url: string;
	client: ReturnType<typeof createClient>;
}

let peopleClient: CachedClient | null = null;

function getPeopleClient() {
	const url = getPeopleWsUrl();
	if (peopleClient && peopleClient.url === url) return peopleClient.client;
	if (peopleClient) {
		try {
			peopleClient.client.destroy();
		} catch {
			/* noop */
		}
	}
	const client = createClient(getWsProvider(url));
	peopleClient = { url, client };
	return client;
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

	const busy =
		tracker.state.stage === "signing" ||
		tracker.state.stage === "broadcasting" ||
		tracker.state.stage === "in_block";

	async function prefillFromProfile() {
		try {
			const api = getApi();
			const data = await api.query.SocialProfiles.Profiles.getValue(account!.address);
			if (!data) return;
			const meta = await fetchProfileMetadata(data.metadata.asText());
			if (meta) {
				setDisplay((meta as { name?: string }).name || "");
				setTwitter(
					(meta as { links?: { twitter?: string } }).links?.twitter || "",
				);
				setWeb(
					(meta as { links?: { website?: string } }).links?.website || "",
				);
			}
		} catch {
			/* ignore */
		}
	}

	async function setIdentity() {
		if (!account || !display.trim()) return;
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		const peopleApi: any = getPeopleClient().getUnsafeApi();
		// People chain `IdentityInfo` shape changes with runtime upgrades
		// (e.g. `discord` / `matrix` / `github` fields added in newer
		// versions). Fill every field defensively with `None` so the SCALE
		// encoder never sees an `undefined` variant — PAPI's enum encoder
		// crashes with "Cannot read properties of undefined (reading
		// 'type')" otherwise.
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		const info: Record<string, any> = {
			display: dataValue(display.trim()),
			email: dataValue(email.trim()),
			twitter: dataValue(twitter.trim()),
			web: dataValue(web.trim()),
			legal: noneData(),
			riot: noneData(),
			image: noneData(),
			matrix: noneData(),
			github: noneData(),
			discord: noneData(),
			additional: [],
			pgp_fingerprint: undefined,
		};
		const tx = peopleApi.tx.Identity.set_identity({ info });
		const ok = await tracker.submit(tx, account.signer, "Set Identity on People");
		if (ok) {
			setShowForm(false);
			reload();
		}
	}

	async function requestJudgement() {
		if (!account) return;
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		const peopleApi: any = getPeopleClient().getUnsafeApi();
		const tx = peopleApi.tx.Identity.request_judgement({
			reg_index: 0,
			max_fee: 0n,
		});
		await tracker.submit(tx, account.signer, "Request Judgement on People");
		reload();
	}

	async function clearIdentity() {
		if (!account) return;
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		const peopleApi: any = getPeopleClient().getUnsafeApi();
		const tx = peopleApi.tx.Identity.clear_identity();
		const ok = await tracker.submit(tx, account.signer, "Clear Identity on People");
		if (ok) reload();
	}

	return (
		<div className="panel space-y-4">
			<div className="flex items-center justify-between">
				<div>
					<h2 className="heading-2 flex items-center gap-2">
						Polkadot People Identity
						<VerificationBadge status={identityStatus(identity)} size="md" showNoneLabel={false} />
					</h2>
					<p className="text-[11px] text-secondary mt-0.5">
						Identity lives on the Polkadot People parachain. Requires DOT on
						that chain to cover the registration deposit and fees.
					</p>
				</div>
				{identity?.hasIdentity && (
					<button onClick={clearIdentity} disabled={busy} className="btn-danger btn-sm">
						Clear
					</button>
				)}
			</div>

			{loading ? (
				<div className="flex items-center gap-2 text-secondary text-sm">
					<div className="w-4 h-4 border-2 border-surface-600 border-t-brand-500 rounded-full animate-spin" />
					Loading from People chain…
				</div>
			) : identity?.hasIdentity ? (
				<div className="space-y-3">
					{/* Status */}
					<div className="flex items-center gap-2">
						{identity.verified ? (
							<>
								<span className="badge-success">Verified</span>
								<span className="text-xs text-secondary">
									by Registrar #{identity.registrarIndex}
								</span>
							</>
						) : identity.judgement === "FeePaid" ? (
							<span className="badge-info">Pending judgement</span>
						) : (
							<span className="badge-neutral">In process</span>
						)}
					</div>

					{/* Fields */}
					<div className="rounded-xl bg-surface-800 p-3 space-y-1.5 text-sm">
						{identity.display && (
							<p>
								<span className="text-secondary">Name:</span> {identity.display}
							</p>
						)}
						{identity.twitter && (
							<p>
								<span className="text-secondary">Twitter:</span> {identity.twitter}
							</p>
						)}
						{identity.web && (
							<p>
								<span className="text-secondary">Website:</span> {identity.web}
							</p>
						)}
						{identity.email && (
							<p>
								<span className="text-secondary">Email:</span> {identity.email}
							</p>
						)}
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
						Register your display name, website, email, or Twitter on the
						Polkadot People parachain. Once a registrar issues a judgement
						your profile will show as verified everywhere across Polkadot.
					</p>
					{!showForm ? (
						<button
							onClick={() => {
								setShowForm(true);
								prefillFromProfile();
							}}
							className="btn-outline btn-sm"
						>
							Register on People chain
						</button>
					) : (
						<div className="space-y-3">
							<button onClick={prefillFromProfile} className="text-xs text-brand-500 hover:underline">
								Pre-fill from social profile
							</button>
							<div>
								<label className="form-label">Display Name *</label>
								<input
									type="text"
									value={display}
									onChange={(e) => setDisplay(e.target.value)}
									placeholder="Your name"
									className="input"
								/>
							</div>
							<div>
								<label className="form-label">Twitter</label>
								<input
									type="text"
									value={twitter}
									onChange={(e) => setTwitter(e.target.value)}
									placeholder="@handle"
									className="input"
								/>
							</div>
							<div>
								<label className="form-label">Website</label>
								<input
									type="text"
									value={web}
									onChange={(e) => setWeb(e.target.value)}
									placeholder="https://..."
									className="input"
								/>
							</div>
							<div>
								<label className="form-label">Email</label>
								<input
									type="text"
									value={email}
									onChange={(e) => setEmail(e.target.value)}
									placeholder="you@example.com"
									className="input"
								/>
							</div>
							<p className="text-[10px] text-surface-500">
								This transaction is sent to the Polkadot People parachain and
								requires DOT on People to cover the deposit (refunded on clear).
							</p>
							<div className="flex gap-2">
								<button onClick={() => setShowForm(false)} className="btn-ghost btn-sm">
									Cancel
								</button>
								<button
									onClick={setIdentity}
									disabled={!display.trim() || busy}
									className="btn-brand btn-sm"
								>
									Register
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
