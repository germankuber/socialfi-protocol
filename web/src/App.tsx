import { Outlet, Link, useLocation } from "react-router-dom";
import { useChainStore } from "./store/chainStore";
import { useConnectionManagement } from "./hooks/useConnection";
import ThemeToggle from "./components/social/ThemeToggle";

export default function App() {
	const location = useLocation();
	const connected = useChainStore((s) => s.connected);
	const blockNumber = useChainStore((s) => s.blockNumber);

	useConnectionManagement();

	const navItems = [
		{ path: "/", label: "Home", exact: true },
		{ path: "/social", label: "Social" },
	];

	function isActive(item: (typeof navItems)[number]) {
		if (item.exact) return location.pathname === item.path;
		return location.pathname.startsWith(item.path);
	}

	return (
		<div className="min-h-screen bg-pattern relative">
			{/* Ambient gradient orbs */}
			<div
				className="gradient-orb"
				style={{ background: "#e6007a", top: "-200px", right: "-100px" }}
			/>
			<div
				className="gradient-orb"
				style={{ background: "#a78bfa", bottom: "-200px", left: "-100px" }}
			/>

			{/* Navigation */}
			<nav className="sticky top-0 z-50 nav-blur">
				<div className="max-w-4xl mx-auto px-6 py-3 flex items-center gap-6">
					<Link to="/" className="flex items-center gap-2.5 shrink-0 group">
						<div className="w-8 h-8 rounded-xl bg-gradient-to-br from-polka-500 to-accent-purple flex items-center justify-center shadow-glow transition-shadow group-hover:shadow-glow-lg">
							<svg viewBox="0 0 16 16" className="w-4 h-4" fill="white">
								<circle cx="8" cy="3" r="2" />
								<circle cx="3" cy="8" r="2" />
								<circle cx="13" cy="8" r="2" />
								<circle cx="8" cy="13" r="2" />
								<circle cx="8" cy="8" r="1.5" opacity="0.6" />
							</svg>
						</div>
						<span className="text-base font-semibold font-display tracking-tight">
							SocialFi
						</span>
					</Link>

					<div className="flex gap-1">
						{navItems.map((item) => (
							<Link
								key={item.path}
								to={item.path}
								className={`relative px-3.5 py-1.5 rounded-lg text-sm font-medium transition-all duration-200 ${
									isActive(item)
										? "text-white"
										: "text-text-secondary hover:text-text-primary hover:bg-white/[0.05]"
								}`}
							>
								{isActive(item) && (
									<span className="absolute inset-0 rounded-lg bg-polka-500/15 border border-polka-500/25" />
								)}
								<span className="relative">{item.label}</span>
							</Link>
						))}
					</div>

					<div className="ml-auto flex items-center gap-3 shrink-0">
						<ThemeToggle />
						{connected && (
							<span className="text-xs font-mono text-text-tertiary">
								#{blockNumber}
							</span>
						)}
						<span
							className={`w-2 h-2 rounded-full transition-colors duration-500 ${
								connected
									? "bg-accent-green shadow-[0_0_6px_rgba(52,211,153,0.5)]"
									: "bg-text-muted"
							}`}
						/>
					</div>
				</div>
			</nav>

			{/* Main content */}
			<main className="relative z-10 max-w-4xl mx-auto px-6 py-8">
				<Outlet />
			</main>
		</div>
	);
}
