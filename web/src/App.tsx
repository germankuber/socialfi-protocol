import { Outlet, Link, useLocation, useNavigate } from "react-router-dom";
import { useState, useRef, useEffect } from "react";
import { useChainStore } from "./store/chainStore";
import { useConnectionManagement } from "./hooks/useConnection";
import { useSelectedAccount } from "./hooks/social/useSelectedAccount";
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
					<div className="ml-auto flex items-center gap-3">
						{connected && (
							<span className="text-xs font-mono text-secondary hidden sm:inline">
								#{blockNumber}
							</span>
						)}
						<span
							className={`w-2 h-2 rounded-full shrink-0 ${
								connected ? "bg-success shadow-[0_0_6px_rgba(34,197,94,0.4)]" : "bg-surface-600"
							}`}
						/>
						<ThemeToggle />
						<WalletButton />
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

function WalletButton() {
	const navigate = useNavigate();
	const { account, allAccounts, selectedAccountIndex, setSelectedAccountIndex } = useSelectedAccount();
	const [open, setOpen] = useState(false);
	const ref = useRef<HTMLDivElement>(null);

	// Close dropdown on outside click
	useEffect(() => {
		function handleClick(e: MouseEvent) {
			if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
		}
		document.addEventListener("mousedown", handleClick);
		return () => document.removeEventListener("mousedown", handleClick);
	}, []);

	if (!account) {
		return (
			<button
				onClick={() => navigate("/social/accounts")}
				className="btn-brand btn-sm"
			>
				Connect
			</button>
		);
	}

	const truncated = `${account.address.slice(0, 6)}...${account.address.slice(-4)}`;

	return (
		<div className="relative" ref={ref}>
			<button
				onClick={() => setOpen(!open)}
				className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-surface-700 hover:border-surface-500 transition-colors"
			>
				<div className="w-6 h-6 rounded-full bg-brand-500 flex items-center justify-center text-[10px] font-bold text-white">
					{account.name[0]}
				</div>
				<span className="text-xs font-mono text-surface-300 hidden sm:inline">{truncated}</span>
				<svg className={`w-3 h-3 text-surface-500 transition-transform ${open ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
					<path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
				</svg>
			</button>

			{open && (
				<div className="absolute right-0 top-full mt-2 w-72 rounded-xl border border-surface-700 bg-surface-900 shadow-lg overflow-hidden z-50 animate-fade-in">
					{/* Account list */}
					<div className="max-h-60 overflow-y-auto">
						{allAccounts.map((acc, i) => (
							<button
								key={`${acc.type}-${acc.address}`}
								onClick={() => { setSelectedAccountIndex(i); setOpen(false); }}
								className={`w-full text-left px-4 py-3 flex items-center gap-3 hover:bg-surface-800 transition-colors ${
									i === selectedAccountIndex ? "bg-brand-500/5" : ""
								}`}
							>
								<div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0 ${
									acc.type === "host" ? "bg-brand-500" : acc.type === "extension" ? "bg-purple-500" : "bg-info"
								}`}>
									{acc.name[0]}
								</div>
								<div className="flex-1 min-w-0">
									<p className="text-sm font-medium truncate">{acc.name}</p>
									<p className="text-[11px] font-mono text-surface-500 truncate">{acc.address}</p>
								</div>
								{i === selectedAccountIndex && (
									<svg className="w-4 h-4 text-brand-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
										<path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
									</svg>
								)}
							</button>
						))}
					</div>

					{/* Footer */}
					<div className="border-t border-surface-800 p-2">
						<button
							onClick={() => { navigate("/social/accounts"); setOpen(false); }}
							className="w-full text-left px-3 py-2 text-xs text-secondary hover:text-surface-100 hover:bg-surface-800 rounded-lg transition-colors flex items-center gap-2"
						>
							<svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
								<path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
							</svg>
							Manage wallets
						</button>
					</div>

					{/* Light mode dropdown override */}
					<style>{`
						html.light .bg-surface-900 { background: white; }
						html.light .border-surface-700 { border-color: #e4e4e7; }
						html.light .border-surface-800 { border-color: #e4e4e7; }
						html.light .hover\\:bg-surface-800:hover { background: #f4f4f5; }
					`}</style>
				</div>
			)}
		</div>
	);
}
