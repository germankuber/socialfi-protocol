import { useEffect, useState, useCallback } from "react";
import { Binary } from "polkadot-api";
import { useSocialApi } from "../../hooks/social/useSocialApi";
import { useSelectedAccount } from "../../hooks/social/useSelectedAccount";
import { useTxStatus } from "../../hooks/social/useTxStatus";
import { formatDispatchError } from "../../utils/format";
import AccountSelector from "../../components/social/AccountSelector";
import TxStatusBanner from "../../components/social/TxStatusBanner";
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
	const tx = useTxStatus();
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
	}, [getApi]);

	useEffect(() => {
		loadApps();
	}, [loadApps]);

	async function registerApp() {
		if (!metadataInput.trim()) return;
		try {
			tx.setStatus("Submitting register_app...");
			const api = getApi();
			const result = await api.tx.SocialAppRegistry.register_app({
				metadata: Binary.fromText(metadataInput),
			}).signAndSubmit(account.signer);
			if (!result.ok) {
				tx.setError(formatDispatchError(result.dispatchError));
				return;
			}
			tx.setSuccess("App registered!");
			setMetadataInput("");
			loadApps();
		} catch (e) {
			tx.setError(e instanceof Error ? e.message : String(e));
		}
	}

	async function deregisterApp(appId: number) {
		try {
			tx.setStatus("Submitting deregister_app...");
			const api = getApi();
			const result = await api.tx.SocialAppRegistry.deregister_app({
				app_id: appId,
			}).signAndSubmit(account.signer);
			if (!result.ok) {
				tx.setError(formatDispatchError(result.dispatchError));
				return;
			}
			tx.setSuccess("App deregistered! Bond returned.");
			loadApps();
		} catch (e) {
			tx.setError(e instanceof Error ? e.message : String(e));
		}
	}

	return (
		<div className="space-y-6">
			<AccountSelector />

			{/* Register Form */}
			<div className="card space-y-4">
				<h2 className="section-title text-accent-orange">Register App</h2>
				<div>
					<label className="label">Metadata CID</label>
					<input
						type="text"
						value={metadataInput}
						onChange={(e) => setMetadataInput(e.target.value)}
						onKeyDown={(e) => e.key === "Enter" && registerApp()}
						placeholder="QmYourAppMetadata..."
						className="input-field w-full"
					/>
				</div>
				<button
					onClick={registerApp}
					disabled={!metadataInput.trim()}
					className="btn-primary"
				>
					Register App
				</button>
			</div>

			<TxStatusBanner status={tx.status} isError={tx.isError} />

			{/* App List */}
			<div className="card space-y-4">
				<div className="flex items-center justify-between">
					<h2 className="section-title">Registered Apps</h2>
					<button onClick={loadApps} disabled={loading} className="btn-secondary text-xs">
						{loading ? "Loading..." : "Refresh"}
					</button>
				</div>

				{apps.length === 0 ? (
					<p className="text-text-muted text-sm">No apps registered yet.</p>
				) : (
					<div className="space-y-2">
						{apps.map((app) => (
							<div
								key={app.id}
								className="rounded-lg border border-white/[0.04] bg-white/[0.02] p-3 text-sm space-y-1.5"
							>
								<div className="flex items-center justify-between">
									<div className="flex items-center gap-2">
										<span className="font-mono font-semibold text-text-primary">
											App #{app.id}
										</span>
										<span
											className={`status-badge ${
												app.status === "Active"
													? "bg-accent-green/10 text-accent-green"
													: "bg-text-muted/10 text-text-muted"
											}`}
										>
											{app.status}
										</span>
									</div>
									{app.status === "Active" && app.owner === account.address && (
										<button
											onClick={() => deregisterApp(app.id)}
											className="px-2 py-1 rounded-md bg-accent-red/10 text-accent-red text-xs font-medium hover:bg-accent-red/20 transition-colors"
										>
											Deregister
										</button>
									)}
								</div>
								<p className="text-text-tertiary">
									Owner: <AddressDisplay address={app.owner} /> | Block:{" "}
									<span className="font-mono text-text-secondary">#{app.createdAt}</span>
								</p>
								<p className="font-mono text-xs text-text-muted break-all">
									{app.metadata}
								</p>
							</div>
						))}
					</div>
				)}
			</div>
		</div>
	);
}
