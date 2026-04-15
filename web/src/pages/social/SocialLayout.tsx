import { Link, Outlet, useLocation } from "react-router-dom";

const tabs = [
	{ path: "/social", label: "Overview", exact: true },
	{ path: "/social/apps", label: "Apps" },
	{ path: "/social/feed", label: "Feed" },
];

export default function SocialLayout() {
	const location = useLocation();

	function isActive(tab: (typeof tabs)[number]) {
		if (tab.exact) return location.pathname === tab.path;
		return location.pathname.startsWith(tab.path);
	}

	return (
		<div className="space-y-6 animate-fade-in">
			{/* Header */}
			<div>
				<h1 className="heading-1">Social Protocol</h1>
				<p className="text-secondary text-sm mt-1">
					Profiles, apps, feeds, and social graph on Polkadot.
				</p>
			</div>

			{/* Tabs */}
			<div className="flex gap-1 border-b border-surface-800 pb-px overflow-x-auto">
				{tabs.map((tab) => (
					<Link
						key={tab.path}
						to={tab.path}
						className={`relative px-4 py-2.5 text-sm font-medium transition-colors whitespace-nowrap ${
							isActive(tab)
								? "text-brand-500"
								: "text-surface-500 hover:text-surface-200"
						}`}
					>
						{tab.label}
						{isActive(tab) && (
							<span className="absolute bottom-0 inset-x-2 h-0.5 bg-brand-500 rounded-t-full" />
						)}
					</Link>
				))}
			</div>

			{/* Light mode border */}
			<style>{`html.light .border-surface-800 { border-color: #e4e4e7; }`}</style>

			<Outlet />
		</div>
	);
}
