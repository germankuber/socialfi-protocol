import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useSocialApi } from "../../hooks/social/useSocialApi";
import StatCard from "../../components/social/StatCard";
import AddressDisplay from "../../components/social/AddressDisplay";
import SponsorshipPanel from "../../components/social/SponsorshipPanel";

interface Stats {
	profileCount: number;
	appCount: number;
	postCount: number;
}

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

export default function SocialDashboard() {
	const { getApi } = useSocialApi();
	const [stats, setStats] = useState<Stats>({ profileCount: 0, appCount: 0, postCount: 0 });
	const [apps, setApps] = useState<AppData[]>([]);
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		loadData();
	}, []); // eslint-disable-line react-hooks/exhaustive-deps

	async function loadData() {
		try {
			setLoading(true);
			const api = getApi();

			const [profileCount, nextAppId, nextPostId, appEntries] = await Promise.all([
				api.query.SocialProfiles.ProfileCount.getValue(),
				api.query.SocialAppRegistry.NextAppId.getValue(),
				api.query.SocialFeeds.NextPostId.getValue(),
				api.query.SocialAppRegistry.Apps.getEntries(),
			]);

			setStats({
				profileCount: Number(profileCount),
				appCount: Number(nextAppId),
				postCount: Number(nextPostId),
			});

			setApps(
				appEntries
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
			// unavailable
		} finally {
			setLoading(false);
		}
	}

	return (
		<div className="space-y-6">
			<SponsorshipPanel />

			{/* Stats */}
			<div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
				<StatCard
					label="Profiles"
					value={loading ? "..." : stats.profileCount}
					icon="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
				/>
				<StatCard
					label="Apps"
					value={loading ? "..." : stats.appCount}
					icon="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6z"
				/>
				<StatCard
					label="Posts"
					value={loading ? "..." : stats.postCount}
					icon="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z"
				/>
			</div>

			{/* Registered Apps */}
			<div>
				<div className="flex items-center justify-between mb-3">
					<h2 className="heading-2">Apps</h2>
					<Link to="/social/apps" className="text-xs text-brand-500 hover:underline">
						View all
					</Link>
				</div>

				{loading ? (
					<div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
						{[0, 1].map((i) => (
							<div key={i} className="panel animate-pulse">
								<div className="flex items-center gap-3">
									<div className="w-10 h-10 rounded-xl bg-surface-800" />
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
					<div className="panel text-center py-8 space-y-3">
						<p className="text-secondary text-sm">No apps registered yet.</p>
						<Link to="/social/apps" className="btn-brand btn-sm inline-flex">
							Register an App
						</Link>
					</div>
				) : (
					<div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
						{apps.map((app) => (
							<Link key={app.id} to={`/app/${app.id}`} className="panel-hover block">
								<div className="flex items-center gap-3">
									<div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${APP_COLORS[app.id % APP_COLORS.length]} flex items-center justify-center text-white text-sm font-bold shrink-0`}>
										{app.id}
									</div>
									<div className="flex-1 min-w-0">
										<div className="flex items-center gap-2">
											<p className="font-semibold text-sm truncate">App #{app.id}</p>
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

			</div>
	);
}
