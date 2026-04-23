import { useEffect, useState, useCallback } from "react";
import { Binary } from "polkadot-api";
import { useSocialApi } from "../../hooks/social/useSocialApi";
import { useSelectedAccount } from "../../hooks/social/useSelectedAccount";
import { useTxTracker } from "../../hooks/social/useTxTracker";
import { useIpfs } from "../../hooks/social/useIpfs";
import RequireProfile from "../../components/social/RequireProfile";
import TxToast from "../../components/social/TxToast";
import AddressDisplay from "../../components/social/AddressDisplay";
import AppForm from "../../components/social/AppForm";

interface AppData {
	id: number;
	owner: string;
	metadata: string;
	createdAt: number;
	status: string;
}

interface ResolvedApp extends AppData {
	resolvedName?: string;
	resolvedIcon?: string;
}

export default function AppsPage() {
	const { getApi } = useSocialApi();
	const { account } = useSelectedAccount();
	const tracker = useTxTracker();
	const { fetchProfileMetadata, ipfsUrl } = useIpfs();
	const [apps, setApps] = useState<ResolvedApp[]>([]);
	const [loading, setLoading] = useState(true);
	const [showForm, setShowForm] = useState(false);

	const loadApps = useCallback(async () => {
		try {
			setLoading(true);
			const api = getApi();
			const entries = await api.query.SocialAppRegistry.Apps.getEntries();
			const result: ResolvedApp[] = entries.map((entry) => ({
				id: Number(entry.keyArgs[0]),
				owner: entry.value.owner.toString(),
				metadata: entry.value.metadata.asText(),
				createdAt: Number(entry.value.created_at),
				status: entry.value.status.type,
			}));
			result.sort((a, b) => b.id - a.id);
			setApps(result);

			// Resolve metadata from IPFS in background
			for (const app of result) {
				fetchProfileMetadata(app.metadata).then((meta) => {
					if (meta) {
						setApps((prev) =>
							prev.map((a) =>
								a.id === app.id
									? {
											...a,
											resolvedName:
												(meta as { name?: string }).name || undefined,
											resolvedIcon:
												(meta as { icon?: string }).icon || undefined,
										}
									: a,
							),
						);
					}
				});
			}
		} catch {
			setApps([]);
		} finally {
			setLoading(false);
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	useEffect(() => {
		loadApps();
	}, [loadApps]);

	const busy =
		tracker.state.stage === "signing" ||
		tracker.state.stage === "broadcasting" ||
		tracker.state.stage === "in_block";

	async function handleRegister(cid: string, hasImages: boolean) {
		if (!account) return;
		const api = getApi();
		const tx = api.tx.SocialAppRegistry.register_app({
			metadata: Binary.fromText(cid),
			has_images: hasImages,
		});
		const ok = await tracker.submit(tx, account.signer, "Register App");
		if (ok) {
			setShowForm(false);
			loadApps();
		}
	}

	async function deregisterApp(appId: number) {
		if (!account) return;
		const api = getApi();
		const tx = api.tx.SocialAppRegistry.deregister_app({ app_id: appId });
		const ok = await tracker.submit(tx, account.signer, "Deregister App");
		if (ok) loadApps();
	}

	return (
		<RequireProfile>
			<div className="space-y-4">
				{/* Register button or form */}
				{showForm ? (
					<div className="panel space-y-4">
						<div className="flex items-center justify-between">
							<h2 className="heading-2">Register App</h2>
							<button onClick={() => setShowForm(false)} className="btn-ghost btn-sm">
								Cancel
							</button>
						</div>
						<AppForm onSubmit={handleRegister} disabled={busy} />
					</div>
				) : (
					<button onClick={() => setShowForm(true)} className="btn-brand w-full">
						Register New App
					</button>
				)}

				{/* App list */}
				<div className="panel space-y-4">
					<div className="flex items-center justify-between">
						<h2 className="heading-2">Apps ({apps.length})</h2>
						<button onClick={loadApps} disabled={loading} className="btn-ghost btn-sm">
							{loading ? "..." : "Refresh"}
						</button>
					</div>

					{apps.length === 0 ? (
						<p className="text-secondary text-sm py-4 text-center">
							No apps registered yet.
						</p>
					) : (
						<div className="divide-y divide-surface-800">
							{apps.map((app) => (
								<div key={app.id} className="py-3 first:pt-0 last:pb-0">
									<div className="flex items-center gap-3">
										{/* Icon */}
										{app.resolvedIcon ? (
											<img
												src={ipfsUrl(app.resolvedIcon)}
												alt=""
												className="w-10 h-10 rounded-xl object-cover bg-surface-800 shrink-0"
											/>
										) : (
											<div className="w-10 h-10 rounded-xl bg-brand-500/10 flex items-center justify-center text-brand-500 font-bold shrink-0">
												{app.id}
											</div>
										)}
										<div className="flex-1 min-w-0">
											<div className="flex items-center gap-2">
												<span className="font-semibold text-sm">
													{app.resolvedName || `App #${app.id}`}
												</span>
												<span
													className={
														app.status === "Active"
															? "badge-success"
															: "badge-neutral"
													}
												>
													{app.status}
												</span>
											</div>
											<div className="text-xs text-secondary flex items-center gap-2">
												<AddressDisplay address={app.owner} />
												<span className="font-mono">
													Block #{app.createdAt}
												</span>
											</div>
										</div>
										{app.status === "Active" &&
											account &&
											app.owner === account.address && (
												<button
													onClick={() => deregisterApp(app.id)}
													disabled={busy}
													className="btn-danger btn-sm"
												>
													Deregister
												</button>
											)}
									</div>
								</div>
							))}
							<style>{`html.light .divide-surface-800 { --tw-divide-opacity: 1; --tw-divide-color: #e4e4e7; } html.light .bg-surface-800 { background: #f4f4f5; }`}</style>
						</div>
					)}
				</div>

				<TxToast state={tracker.state} onDismiss={tracker.reset} />
			</div>
		</RequireProfile>
	);
}
