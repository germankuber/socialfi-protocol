import { Outlet, Link, useLocation } from "react-router-dom";
import { useChainStore } from "./store/chainStore";
import { useConnectionManagement } from "./hooks/useConnection";
import ThemeToggle from "./components/social/ThemeToggle";

export default function App() {
	const location = useLocation();
	const connected = useChainStore((s) => s.connected);
	const blockNumber = useChainStore((s) => s.blockNumber);

	useConnectionManagement();

	return (
		<div className="min-h-screen flex flex-col">
			{/* Top bar */}
			<header className="sticky top-0 z-50 border-b border-surface-800 bg-surface-950/90 backdrop-blur-xl">
				<div className="max-w-3xl mx-auto px-4 h-14 flex items-center gap-4">
					{/* Logo */}
					<Link to="/" className="flex items-center gap-2 shrink-0 group">
						<div className="w-8 h-8 rounded-xl bg-brand-500 flex items-center justify-center">
							<svg viewBox="0 0 16 16" className="w-4 h-4" fill="white">
								<circle cx="8" cy="3" r="2" />
								<circle cx="3" cy="8" r="2" />
								<circle cx="13" cy="8" r="2" />
								<circle cx="8" cy="13" r="2" />
								<circle cx="8" cy="8" r="1.5" opacity="0.6" />
							</svg>
						</div>
						<span className="text-[15px] font-bold tracking-tight hidden sm:inline">
							SocialFi
						</span>
					</Link>

					{/* Nav links */}
					<nav className="flex gap-1">
						<NavLink to="/" label="Home" current={location.pathname === "/"} />
						<NavLink
							to="/social"
							label="Social"
							current={location.pathname.startsWith("/social")}
						/>
					</nav>

					{/* Right side */}
					<div className="ml-auto flex items-center gap-2">
						<ThemeToggle />
						<div className="flex items-center gap-2 text-xs text-secondary">
							{connected && (
								<span className="font-mono">#{blockNumber}</span>
							)}
							<span
								className={`w-2 h-2 rounded-full ${
									connected ? "bg-success shadow-[0_0_6px_rgba(34,197,94,0.4)]" : "bg-surface-600"
								}`}
							/>
						</div>
					</div>
				</div>
			</header>

			{/* Light mode header override */}
			<style>{`
				html.light header { background: rgba(255,255,255,0.9); border-color: #e4e4e7; }
			`}</style>

			{/* Content */}
			<main className="flex-1 max-w-3xl w-full mx-auto px-4 py-6">
				<Outlet />
			</main>
		</div>
	);
}

function NavLink({ to, label, current }: { to: string; label: string; current: boolean }) {
	return (
		<Link
			to={to}
			className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
				current
					? "bg-brand-500/10 text-brand-500"
					: "text-surface-400 hover:text-surface-100 hover:bg-surface-800"
			}`}
		>
			{label}
		</Link>
	);
}
