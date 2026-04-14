import { Link } from "react-router-dom";
import { useChainStore } from "../store/chainStore";

export default function HomePage() {
	const { connected, socialAvailable } = useChainStore();

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

			{/* Feature cards */}
			{connected && socialAvailable && (
				<div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
					<FeatureCard
						to="/social/profile"
						icon="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
						title="Profile"
						description="Create your on-chain identity"
						color="bg-purple-500"
					/>
					<FeatureCard
						to="/social/apps"
						icon="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6z"
						title="App Registry"
						description="Register social apps"
						color="bg-orange-500"
					/>
					<FeatureCard
						to="/social/feed"
						icon="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z"
						title="Feed"
						description="Posts and replies with fees"
						color="bg-blue-500"
					/>
					<FeatureCard
						to="/social/graph"
						icon="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"
						title="Social Graph"
						description="Follow users across all apps"
						color="bg-emerald-500"
					/>
				</div>
			)}

			{connected && socialAvailable === false && (
				<div className="panel text-center py-8">
					<p className="text-danger text-sm">Social pallets not found on the connected chain.</p>
				</div>
			)}

			{!connected && (
				<div className="panel text-center py-8 space-y-2">
					<p className="text-secondary">Click the connection indicator in the top bar to connect to a chain.</p>
				</div>
			)}
		</div>
	);
}

function FeatureCard({
	to, icon, title, description, color,
}: {
	to: string; icon: string; title: string; description: string; color: string;
}) {
	return (
		<Link to={to} className="panel-hover group flex items-center gap-4">
			<div className={`avatar ${color}`}>
				<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
					<path strokeLinecap="round" strokeLinejoin="round" d={icon} />
				</svg>
			</div>
			<div>
				<p className="font-semibold group-hover:text-brand-500 transition-colors">{title}</p>
				<p className="text-sm text-secondary">{description}</p>
			</div>
		</Link>
	);
}
