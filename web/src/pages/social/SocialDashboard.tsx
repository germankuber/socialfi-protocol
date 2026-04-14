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

	const features = [
		{
			title: "Profile",
			description: "Create and manage your on-chain social identity.",
			path: "/social/profile",
			accent: "text-accent-purple",
			border: "hover:border-accent-purple/20",
		},
		{
			title: "Apps",
			description: "Register social apps that consume shared primitives.",
			path: "/social/apps",
			accent: "text-accent-orange",
			border: "hover:border-accent-orange/20",
		},
		{
			title: "Feed",
			description: "Create posts and replies with configurable fees.",
			path: "/social/feed",
			accent: "text-accent-blue",
			border: "hover:border-accent-blue/20",
		},
		{
			title: "Graph",
			description: "Follow and unfollow users with paid relationships.",
			path: "/social/graph",
			accent: "text-accent-green",
			border: "hover:border-accent-green/20",
		},
	];

	return (
		<div className="space-y-6">
			{/* Stats */}
			<div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
				<StatCard
					label="Profiles"
					value={loading ? "..." : stats.profileCount}
					accentColor="text-accent-purple"
				/>
				<StatCard
					label="Registered Apps"
					value={loading ? "..." : stats.appCount}
					accentColor="text-accent-orange"
				/>
				<StatCard
					label="Posts"
					value={loading ? "..." : stats.postCount}
					accentColor="text-accent-blue"
				/>
			</div>

			{/* Feature cards */}
			<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
				{features.map((f) => (
					<Link
						key={f.path}
						to={f.path}
						className={`card-hover block group ${f.border}`}
					>
						<h3 className={`text-lg font-semibold mb-1 font-display ${f.accent}`}>
							{f.title}
						</h3>
						<p className="text-sm text-text-secondary group-hover:text-text-primary transition-colors">
							{f.description}
						</p>
					</Link>
				))}
			</div>
		</div>
	);
}
