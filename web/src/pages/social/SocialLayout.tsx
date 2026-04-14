import { Link, Outlet, useLocation } from "react-router-dom";

const tabs = [
	{ path: "/social", label: "Overview", exact: true, icon: "M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" },
	{ path: "/social/profile", label: "Profile", icon: "M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" },
	{ path: "/social/apps", label: "Apps", icon: "M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" },
	{ path: "/social/feed", label: "Feed", icon: "M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" },
	{ path: "/social/graph", label: "Graph", icon: "M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" },
];

export default function SocialLayout() {
	const location = useLocation();

	function isActive(tab: (typeof tabs)[number]) {
		if (tab.exact) return location.pathname === tab.path;
		return location.pathname.startsWith(tab.path);
	}

	return (
		<div className="space-y-6 animate-fade-in">
			<div className="space-y-2">
				<h1 className="page-title">
					Social{" "}
					<span className="bg-gradient-to-r from-polka-400 via-accent-purple to-accent-blue bg-clip-text text-transparent">
						Protocol
					</span>
				</h1>
				<p className="text-text-secondary text-sm">
					Profiles, apps, feeds, and graph — shared social primitives on Polkadot.
				</p>
			</div>

			{/* Tab navigation */}
			<div className="flex gap-1 p-1 rounded-xl bg-white/[0.03] border border-white/[0.04]">
				{tabs.map((tab) => (
					<Link
						key={tab.path}
						to={tab.path}
						className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
							isActive(tab)
								? "bg-polka-500/15 text-white border border-polka-500/25"
								: "text-text-secondary hover:text-text-primary hover:bg-white/[0.04] border border-transparent"
						}`}
					>
						<svg
							className="w-4 h-4 shrink-0"
							fill="none"
							viewBox="0 0 24 24"
							stroke="currentColor"
							strokeWidth={1.5}
						>
							<path strokeLinecap="round" strokeLinejoin="round" d={tab.icon} />
						</svg>
						<span className="hidden sm:inline">{tab.label}</span>
					</Link>
				))}
			</div>

			<Outlet />
		</div>
	);
}
