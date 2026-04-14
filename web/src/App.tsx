import { Outlet, Link, useLocation, useNavigate } from "react-router-dom";
import { useState, useRef, useEffect } from "react";
import { useChainStore } from "./store/chainStore";
import { useConnectionManagement, useConnection } from "./hooks/useConnection";
import { useSelectedAccount } from "./hooks/social/useSelectedAccount";
import { getClient } from "./hooks/useChain";
import ThemeToggle from "./components/social/ThemeToggle";

export default function App() {
	const location = useLocation();
	const connected = useChainStore((s) => s.connected);
	const blockNumber = useChainStore((s) => s.blockNumber);

	useConnectionManagement();

	return (
		<div className="min-h-screen flex flex-col">
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

					{/* Nav */}
					<nav className="flex gap-1">
						<NavLink to="/" label="Home" current={location.pathname === "/"} />
						<NavLink to="/social" label="Social" current={location.pathname.startsWith("/social")} />
					</nav>

					{/* Right */}
					<div className="ml-auto flex items-center gap-3">
						<ThemeToggle />
						<ChainIndicator connected={connected} blockNumber={blockNumber} />
						<WalletButton />
					</div>
				</div>
			</header>

			<style>{`html.light header { background: rgba(255,255,255,0.9); border-color: #e4e4e7; }`}</style>

			<main className="flex-1 max-w-3xl w-full mx-auto px-4 py-6">
				<Outlet />
			</main>
		</div>
	);
}

/* ── Nav link ──────────────────────────────────────────── */

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

/* ── Chain indicator (dot + popup) ─────────────────────── */

function ChainIndicator({ connected, blockNumber }: { connected: boolean; blockNumber: number }) {
	const wsUrl = useChainStore((s) => s.wsUrl);
	const { connect } = useConnection();
	const [open, setOpen] = useState(false);
	const [urlInput, setUrlInput] = useState(wsUrl);
	const [chainName, setChainName] = useState<string | null>(null);
	const [connecting, setConnecting] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const ref = useRef<HTMLDivElement>(null);

	useEffect(() => { setUrlInput(wsUrl); }, [wsUrl]);

	useEffect(() => {
		if (!connected) { setChainName(null); return; }
		getClient(wsUrl).getChainSpecData().then((d) => setChainName(d.name)).catch(() => {});
	}, [connected, wsUrl]);

	// Close on outside click
	useEffect(() => {
		function handle(e: MouseEvent) {
			if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
		}
		document.addEventListener("mousedown", handle);
		return () => document.removeEventListener("mousedown", handle);
	}, []);

	async function handleConnect() {
		setConnecting(true);
		setError(null);
		try {
			const result = await connect(urlInput);
			if (result?.ok && result.chain) setChainName(result.chain.name);
		} catch {
			setError("Connection failed");
		} finally {
			setConnecting(false);
		}
	}

	return (
		<div className="relative" ref={ref}>
			<button
				onClick={() => setOpen(!open)}
				className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-surface-800 transition-colors"
				title={connected ? `${chainName ?? "Connected"} — Block #${blockNumber}` : "Disconnected — Click to connect"}
			>
				<span
					className={`w-2.5 h-2.5 rounded-full shrink-0 ${
						connected
							? "bg-success shadow-[0_0_6px_rgba(34,197,94,0.5)]"
							: "bg-danger shadow-[0_0_6px_rgba(239,68,68,0.4)]"
					}`}
				/>
				{connected && (
					<span className="text-[11px] font-mono text-secondary hidden sm:inline">
						#{blockNumber}
					</span>
				)}
			</button>

			{open && (
				<div className="absolute right-0 top-full mt-2 w-80 rounded-xl border border-surface-700 bg-surface-900 shadow-lg p-4 space-y-3 z-50 animate-fade-in">
					{/* Status */}
					{connected ? (
						<div className="flex items-center gap-2">
							<span className="badge-success">Connected</span>
							<span className="text-xs text-secondary truncate">{chainName}</span>
							<span className="text-xs font-mono text-secondary ml-auto">#{blockNumber}</span>
						</div>
					) : (
						<div className="flex items-center gap-2">
							<span className="badge-danger">Disconnected</span>
						</div>
					)}

					{/* URL input */}
					<div>
						<label className="form-label">WebSocket Endpoint</label>
						<div className="flex gap-2">
							<input
								type="text"
								value={urlInput}
								onChange={(e) => setUrlInput(e.target.value)}
								onKeyDown={(e) => e.key === "Enter" && handleConnect()}
								placeholder="ws://localhost:9944"
								className="input flex-1 text-xs"
							/>
							<button
								onClick={handleConnect}
								disabled={connecting}
								className="btn-brand btn-sm shrink-0"
							>
								{connecting ? "..." : "Connect"}
							</button>
						</div>
					</div>

					{error && <p className="text-xs text-danger">{error}</p>}

					{/* Light mode */}
					<style>{`
						html.light .bg-surface-900 { background: white; }
						html.light .border-surface-700 { border-color: #e4e4e7; }
					`}</style>
				</div>
			)}
		</div>
	);
}

/* ── Wallet button + dropdown ──────────────────────────── */

function WalletButton() {
	const navigate = useNavigate();
	const { account, allAccounts, selectedAccountIndex, setSelectedAccountIndex } = useSelectedAccount();
	const [open, setOpen] = useState(false);
	const ref = useRef<HTMLDivElement>(null);

	useEffect(() => {
		function handle(e: MouseEvent) {
			if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
		}
		document.addEventListener("mousedown", handle);
		return () => document.removeEventListener("mousedown", handle);
	}, []);

	if (!account) {
		return (
			<button onClick={() => navigate("/social/accounts")} className="btn-brand btn-sm">
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
