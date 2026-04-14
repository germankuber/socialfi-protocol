import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useSocialApi } from "../../hooks/social/useSocialApi";
import StatCard from "../../components/social/StatCard";

interface Stats {
	profileCount: number;
	appCount: number;
	postCount: number;
}

export default function SocialDashboard() {
	const { getApi } = useSocialApi();
	const [stats, setStats] = useState<Stats>({ profileCount: 0, appCount: 0, postCount: 0 });
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		loadStats();
	}, []); // eslint-disable-line react-hooks/exhaustive-deps

	async function loadStats() {
		try {
			setLoading(true);
			const api = getApi();
			const [profileCount, nextAppId, nextPostId] = await Promise.all([
				api.query.SocialProfiles.ProfileCount.getValue(),
				api.query.SocialAppRegistry.NextAppId.getValue(),
				api.query.SocialFeeds.NextPostId.getValue(),
			]);
			setStats({
				profileCount: Number(profileCount),
				appCount: Number(nextAppId),
				postCount: Number(nextPostId),
			});
		} catch {
			// Stats unavailable
		} finally {
			setLoading(false);
		}
	}

	return (
		<div className="space-y-6">
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

			{/* Quick links */}
			<div className="space-y-1">
				{[
					{ to: "/social/profile", label: "Manage Profile", desc: "Create or update your on-chain identity", color: "bg-purple-500" },
					{ to: "/social/apps", label: "App Registry", desc: "Register and manage social apps", color: "bg-orange-500" },
					{ to: "/social/feed", label: "Feed", desc: "Create posts and replies", color: "bg-blue-500" },
					{ to: "/social/graph", label: "Social Graph", desc: "Follow and unfollow users", color: "bg-emerald-500" },
				].map((item) => (
					<Link
						key={item.to}
						to={item.to}
						className="panel-hover flex items-center gap-4"
					>
						<div className={`w-2 h-8 rounded-full ${item.color}`} />
						<div className="flex-1">
							<p className="font-medium text-sm">{item.label}</p>
							<p className="text-xs text-secondary">{item.desc}</p>
						</div>
						<svg className="w-4 h-4 text-surface-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
							<path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
						</svg>
					</Link>
				))}
			</div>
		</div>
	);
}
