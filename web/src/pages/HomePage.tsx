import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useChainStore } from "../store/chainStore";
import { useSelectedAccount } from "../hooks/social/useSelectedAccount";
import { useProfileGate } from "../hooks/social/useProfileGate";
import { useSocialApi } from "../hooks/social/useSocialApi";
import AddressDisplay from "../components/social/AddressDisplay";

interface AppData {
	id: number;
	owner: string;
	metadata: string;
	status: string;
}

const APP_COLORS = [
	"from-brand-500 to-purple-600",
	"from-blue-500 to-cyan-500",
	"from-emerald-500 to-teal-500",
	"from-orange-500 to-amber-500",
	"from-pink-500 to-rose-500",
	"from-indigo-500 to-violet-500",
];

export default function HomePage() {
	const { connected, socialAvailable } = useChainStore();
	const { account } = useSelectedAccount();
	const { hasProfile } = useProfileGate();
	const { getApi } = useSocialApi();
	const [apps, setApps] = useState<AppData[]>([]);
	const [loadingApps, setLoadingApps] = useState(false);
	const [showProfileModal, setShowProfileModal] = useState(false);

	const loggedIn = !!account;
	const canUse = connected && socialAvailable;

	// Load apps when chain is connected
	useEffect(() => {
		if (!canUse) return;
		loadApps();
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [canUse]);

	async function loadApps() {
		try {
			setLoadingApps(true);
			const api = getApi();
			const entries = await api.query.SocialAppRegistry.Apps.getEntries();
			setApps(
				entries
					.map((e) => ({
						id: Number(e.keyArgs[0]),
						owner: e.value.owner.toString(),
						metadata: e.value.metadata.asText(),
						status: e.value.status.type,
					}))
					.filter((a) => a.status === "Active")
					.sort((a, b) => b.id - a.id),
			);
		} catch {
			setApps([]);
		} finally {
			setLoadingApps(false);
		}
	}

	function handleAppClick(e: React.MouseEvent, _appId: number) {
		if (loggedIn && hasProfile === false) {
			e.preventDefault();
			setShowProfileModal(true);
		}
		// If hasProfile === true or null (loading), let the Link navigate
	}

	return (
		<div className="space-y-8 animate-fade-in">
			{/* Hero */}
			<div className="py-12 text-center space-y-4">
				<div className="inline-flex items-center gap-2 rounded-full bg-brand-500/10 border border-brand-500/20 px-3 py-1 text-xs font-semibold text-brand-500">
					<span className="w-1.5 h-1.5 rounded-full bg-brand-500 animate-pulse" />
					Polkadot Parachain
				</div>
				<h1 className="text-4xl sm:text-5xl font-bold tracking-tight leading-[1.1]">
					SocialFi Protocol
				</h1>
				<p className="text-secondary text-lg max-w-lg mx-auto">
					On-chain profiles, app registry, feeds, and social graph. Shared
					primitives for decentralized social networks.
				</p>
			</div>

			{/* Not connected */}
			{!connected && (
				<div className="panel text-center py-10 space-y-3">
					<div className="w-12 h-12 rounded-full bg-surface-800 flex items-center justify-center mx-auto">
						<span className="w-3 h-3 rounded-full bg-danger" />
					</div>
					<p className="text-secondary">Connect to a chain using the indicator in the top bar.</p>
					<style>{`html.light .bg-surface-800 { background: #f4f4f5; }`}</style>
				</div>
			)}

			{connected && socialAvailable === false && (
				<div className="panel text-center py-8">
					<p className="text-danger text-sm">Social pallets not found on the connected chain.</p>
				</div>
			)}

			{/* Apps grid — always visible when chain is connected */}
			{canUse && (
				<div>
					<div className="flex items-center justify-between mb-4">
						<h2 className="heading-2">Apps</h2>
						<Link to="/social/apps" className="text-xs text-brand-500 hover:underline">
							View all
						</Link>
					</div>

					{loadingApps ? (
						<div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
							{[0, 1, 2, 3].map((i) => (
								<div key={i} className="panel animate-pulse">
									<div className="flex items-center gap-3">
										<div className="w-12 h-12 rounded-xl bg-surface-800" />
										<div className="space-y-2 flex-1">
											<div className="h-4 w-24 rounded bg-surface-800" />
											<div className="h-3 w-40 rounded bg-surface-800" />
										</div>
									</div>
								</div>
							))}
							<style>{`html.light .bg-surface-800 { background: #f4f4f5; }`}</style>
						</div>
					) : apps.length === 0 ? (
						<div className="panel text-center py-10 space-y-3">
							<p className="text-secondary text-sm">No apps registered yet.</p>
							{loggedIn && hasProfile && (
								<Link to="/social/apps" className="btn-brand btn-sm inline-flex">
									Register the first app
								</Link>
							)}
						</div>
					) : (
						<div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
							{apps.map((app) => (
								<Link
									key={app.id}
									to={`/app/${app.id}`}
									onClick={(e) => handleAppClick(e, app.id)}
									className="panel-hover block"
								>
									<div className="flex items-center gap-3">
										<div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${APP_COLORS[app.id % APP_COLORS.length]} flex items-center justify-center text-white text-lg font-bold shrink-0`}>
											{app.id}
										</div>
										<div className="flex-1 min-w-0">
											<div className="flex items-center gap-2">
												<p className="font-semibold">App #{app.id}</p>
												<span className="badge-success">Active</span>
											</div>
											<p className="text-xs font-mono text-surface-500 truncate mt-0.5" title={app.metadata}>
												{app.metadata}
											</p>
											<div className="text-[11px] text-secondary mt-1">
												Owner: <AddressDisplay address={app.owner} chars={6} />
											</div>
										</div>
										<svg className="w-4 h-4 text-surface-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
											<path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
										</svg>
									</div>
								</Link>
							))}
						</div>
					)}
				</div>
			)}

			{/* Not logged in hint */}
			{canUse && !loggedIn && (
				<div className="panel text-center py-6 space-y-2">
					<p className="text-secondary text-sm">Connect your wallet to interact with apps.</p>
				</div>
			)}

			{/* Profile required modal */}
			{showProfileModal && (
				<div className="fixed inset-0 z-50 flex items-center justify-center p-4">
					{/* Backdrop */}
					<div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowProfileModal(false)} />
					{/* Modal */}
					<div className="relative panel max-w-sm w-full text-center space-y-4 animate-slide-up">
						<div className="w-14 h-14 rounded-full bg-surface-800 flex items-center justify-center mx-auto">
							<svg className="w-7 h-7 text-brand-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
								<path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
							</svg>
						</div>
						<h3 className="text-lg font-semibold">Profile Required</h3>
						<p className="text-sm text-secondary">
							You need to create a profile before you can use apps on the protocol.
						</p>
						<div className="flex gap-3 justify-center">
							<button onClick={() => setShowProfileModal(false)} className="btn-ghost btn-sm">
								Cancel
							</button>
							<Link to="/social/profile" className="btn-brand btn-sm" onClick={() => setShowProfileModal(false)}>
								Create Profile
							</Link>
						</div>
						<style>{`html.light .bg-surface-800 { background: #f4f4f5; }`}</style>
					</div>
				</div>
			)}
		</div>
	);
}
