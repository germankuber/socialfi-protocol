import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useChainStore } from "../store/chainStore";
import { useSelectedAccount } from "../hooks/social/useSelectedAccount";
import { useProfileGate } from "../hooks/social/useProfileGate";
import { useSocialApi } from "../hooks/social/useSocialApi";
import { useIpfs } from "../hooks/social/useIpfs";
import AddressDisplay from "../components/social/AddressDisplay";

interface AppData {
	id: number;
	owner: string;
	metadata: string;
	status: string;
	resolvedName?: string;
	resolvedIcon?: string;
	resolvedDescription?: string;
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
	const { fetchProfileMetadata, ipfsUrl } = useIpfs();
	const { getApi } = useSocialApi();
	const [apps, setApps] = useState<AppData[]>([]);
	const [loadingApps, setLoadingApps] = useState(false);
	const [protocolStats, setProtocolStats] = useState({ profiles: 0, apps: 0, activeApps: 0, posts: 0, totalLocked: 0n });

	const loggedIn = !!account;
	const canUse = connected && socialAvailable;

	useEffect(() => {
		if (!canUse) return;
		loadApps();
		loadProtocolStats();
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [canUse]);

	async function loadProtocolStats() {
		try {
			const api = getApi();
			const [profileCount, nextAppId, nextPostId, appEntries] = await Promise.all([
				api.query.SocialProfiles.ProfileCount.getValue(),
				api.query.SocialAppRegistry.NextAppId.getValue(),
				api.query.SocialFeeds.NextPostId.getValue(),
				api.query.SocialAppRegistry.Apps.getEntries(),
			]);
			const activeApps = appEntries.filter((e) => e.value.status.type === "Active").length;
			// AppBond = 10 * EXISTENTIAL_DEPOSIT = 10_000_000_000 (10 milli-UNIT)
			// ProfileBond = 10 * EXISTENTIAL_DEPOSIT
			const appBond = 10_000_000_000n;
			const profileBond = 10_000_000_000n;
			const totalLocked = BigInt(activeApps) * appBond + BigInt(Number(profileCount)) * profileBond;
			setProtocolStats({
				profiles: Number(profileCount),
				apps: Number(nextAppId),
				activeApps,
				posts: Number(nextPostId),
				totalLocked,
			});
		} catch { /* ignore */ }
	}

	async function loadApps() {
		try {
			setLoadingApps(true);
			const api = getApi();
			const entries = await api.query.SocialAppRegistry.Apps.getEntries();
			const appList = entries
				.map((e) => ({
					id: Number(e.keyArgs[0]),
					owner: e.value.owner.toString(),
					metadata: e.value.metadata.asText(),
					status: e.value.status.type,
				}))
				.filter((a) => a.status === "Active")
				.sort((a, b) => b.id - a.id);
			setApps(appList);

			// Resolve IPFS metadata (name, icon, description) in background
			for (const app of appList) {
				fetchProfileMetadata(app.metadata).then((meta) => {
					if (meta) {
						setApps((prev) => prev.map((a) => a.id === app.id ? {
							...a,
							resolvedName: (meta as { name?: string }).name,
							resolvedIcon: (meta as { icon?: string }).icon,
							resolvedDescription: (meta as { description?: string }).description,
						} : a));
					}
				});
			}
		} catch {
			setApps([]);
		} finally {
			setLoadingApps(false);
		}
	}

	function formatUnit(planck: bigint): string {
		const whole = planck / 1_000_000_000_000n;
		const frac = planck % 1_000_000_000_000n;
		if (frac === 0n) return whole.toString();
		const fracStr = frac.toString().padStart(12, "0").replace(/0+$/, "");
		return `${whole}.${fracStr}`;
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

			{/* Protocol stats */}
			{canUse && (
				<div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
					<div className="panel text-center py-3">
						<p className="text-xl font-bold font-mono">{protocolStats.profiles}</p>
						<p className="text-[10px] text-secondary uppercase tracking-wider mt-0.5">Profiles</p>
					</div>
					<div className="panel text-center py-3">
						<p className="text-xl font-bold font-mono">{protocolStats.apps}</p>
						<p className="text-[10px] text-secondary uppercase tracking-wider mt-0.5">Apps</p>
					</div>
					<div className="panel text-center py-3">
						<p className="text-xl font-bold font-mono">{protocolStats.posts}</p>
						<p className="text-[10px] text-secondary uppercase tracking-wider mt-0.5">Posts</p>
					</div>
					<Link to="/protocol" className="panel-hover text-center py-3 block">
						<p className="text-xl font-bold font-mono text-brand-500">{formatUnit(protocolStats.totalLocked)} <span className="text-xs font-normal text-secondary">UNIT</span></p>
						<p className="text-[10px] text-secondary uppercase tracking-wider mt-0.5">Total Locked</p>
						<p className="text-[9px] text-surface-500 mt-1">{protocolStats.profiles} profiles + {protocolStats.activeApps} apps</p>
					</Link>
				</div>
			)}

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

			{/* Wallet connected but no profile — just show create profile */}
			{canUse && loggedIn && hasProfile === false && (
				<div className="panel text-center py-12 space-y-4">
					<div className="w-16 h-16 rounded-full bg-surface-800 flex items-center justify-center mx-auto">
						<svg className="w-8 h-8 text-brand-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
							<path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
						</svg>
					</div>
					<h2 className="text-lg font-semibold">Create your profile</h2>
					<p className="text-secondary text-sm max-w-sm mx-auto">
						You need a profile to use the protocol. Create one to start exploring apps, posting, and following users.
					</p>
					<Link to="/create-profile" className="btn-brand inline-flex">
						Create Profile
					</Link>
					<style>{`html.light .bg-surface-800 { background: #f4f4f5; }`}</style>
				</div>
			)}

			{/* Wallet connected but no wallet */}
			{canUse && !loggedIn && (
				<div className="panel text-center py-10 space-y-3">
					<p className="text-secondary text-sm">Connect your wallet to get started.</p>
				</div>
			)}

			{/* Apps grid — only when logged in with profile */}
			{canUse && loggedIn && hasProfile === true && (
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
									className="panel-hover block"
								>
									<div className="flex items-center gap-3">
										{app.resolvedIcon ? (
											<img src={ipfsUrl(app.resolvedIcon)} alt="" className="w-12 h-12 rounded-xl object-cover bg-surface-800 shrink-0" />
										) : (
											<div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${APP_COLORS[app.id % APP_COLORS.length]} flex items-center justify-center text-white text-lg font-bold shrink-0`}>
												{app.id}
											</div>
										)}
										<div className="flex-1 min-w-0">
											<div className="flex items-center gap-2">
												<p className="font-semibold">{app.resolvedName || `App #${app.id}`}</p>
												<span className="badge-success">Active</span>
											</div>
											{app.resolvedDescription && (
												<p className="text-xs text-secondary mt-0.5 line-clamp-1">{app.resolvedDescription}</p>
											)}
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

		</div>
	);
}
