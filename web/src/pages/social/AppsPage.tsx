import { useEffect, useState, useCallback } from "react";
import { Binary } from "polkadot-api";
import { useSocialApi } from "../../hooks/social/useSocialApi";
import { useSelectedAccount } from "../../hooks/social/useSelectedAccount";
import { useTxTracker } from "../../hooks/social/useTxTracker";
import AccountSelector from "../../components/social/AccountSelector";
import TxToast from "../../components/social/TxToast";
import AddressDisplay from "../../components/social/AddressDisplay";

interface AppData {
	id: number;
	owner: string;
	metadata: string;
	createdAt: number;
	status: string;
}

export default function AppsPage() {
	const { getApi } = useSocialApi();
	const { account } = useSelectedAccount();
	const tracker = useTxTracker();
	const [apps, setApps] = useState<AppData[]>([]);
	const [loading, setLoading] = useState(true);
	const [metadataInput, setMetadataInput] = useState("");

	const loadApps = useCallback(async () => {
		try {
			setLoading(true);
			const api = getApi();
			const entries = await api.query.SocialAppRegistry.Apps.getEntries();
			const result: AppData[] = entries.map((entry) => ({
				id: Number(entry.keyArgs[0]),
				owner: entry.value.owner.toString(),
				metadata: entry.value.metadata.asText(),
				createdAt: Number(entry.value.created_at),
				status: entry.value.status.type,
			}));
			result.sort((a, b) => b.id - a.id);
			setApps(result);
		} catch {
			setApps([]);
		} finally {
			setLoading(false);
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	useEffect(() => { loadApps(); }, [loadApps]);

	const busy = tracker.state.stage === "signing" || tracker.state.stage === "broadcasting" || tracker.state.stage === "in_block";

	async function registerApp() {
		if (!account || !metadataInput.trim()) return;
		const api = getApi();
		const tx = api.tx.SocialAppRegistry.register_app({ metadata: Binary.fromText(metadataInput) });
		const ok = await tracker.submit(tx, account.signer, "Register App");
		if (ok) { setMetadataInput(""); loadApps(); }
	}

	async function deregisterApp(appId: number) {
		if (!account) return;
		const api = getApi();
		const tx = api.tx.SocialAppRegistry.deregister_app({ app_id: appId });
		const ok = await tracker.submit(tx, account.signer, "Deregister App");
		if (ok) loadApps();
	}

	return (
		<div className="space-y-4">
			<AccountSelector />

			<div className="panel space-y-4">
				<h2 className="heading-2">Register App</h2>
				<div>
					<label className="form-label">Metadata CID</label>
					<input
						type="text"
						value={metadataInput}
						onChange={(e) => setMetadataInput(e.target.value)}
						onKeyDown={(e) => e.key === "Enter" && registerApp()}
						placeholder="QmYourAppMetadata..."
						className="input"
					/>
				</div>
				<button onClick={registerApp} disabled={!metadataInput.trim() || !account || busy} className="btn-brand">
					Register App
				</button>
			</div>

			<div className="panel space-y-4">
				<div className="flex items-center justify-between">
					<h2 className="heading-2">Apps ({apps.length})</h2>
					<button onClick={loadApps} disabled={loading} className="btn-ghost btn-sm">
						{loading ? "..." : "Refresh"}
					</button>
				</div>

				{apps.length === 0 ? (
					<p className="text-secondary text-sm py-4 text-center">No apps registered yet.</p>
				) : (
					<div className="divide-y divide-surface-800">
						{apps.map((app) => (
							<div key={app.id} className="py-3 first:pt-0 last:pb-0 space-y-2">
								<div className="flex items-center justify-between">
									<div className="flex items-center gap-2">
										<span className="font-semibold text-sm">App #{app.id}</span>
										<span className={app.status === "Active" ? "badge-success" : "badge-neutral"}>
											{app.status}
										</span>
									</div>
									{app.status === "Active" && account && app.owner === account.address && (
										<button onClick={() => deregisterApp(app.id)} disabled={busy} className="btn-danger btn-sm">
											Deregister
										</button>
									)}
								</div>
								<div className="text-xs text-secondary flex items-center gap-2">
									<AddressDisplay address={app.owner} />
									<span className="font-mono">Block #{app.createdAt}</span>
								</div>
								<p className="font-mono text-xs text-surface-500 break-all">{app.metadata}</p>
							</div>
						))}
						<style>{`html.light .divide-surface-800 { --tw-divide-opacity: 1; --tw-divide-color: #e4e4e7; }`}</style>
					</div>
				)}
			</div>

			<TxToast state={tracker.state} onDismiss={tracker.reset} />
		</div>
	);
}
