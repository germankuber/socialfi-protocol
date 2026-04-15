import { Outlet, Link, useLocation, useNavigate } from "react-router-dom";
import { useState, useRef, useEffect } from "react";
import { useChainStore, type WalletAccount } from "./store/chainStore";
import { useConnectionManagement, useConnection } from "./hooks/useConnection";
import { useSelectedAccount } from "./hooks/social/useSelectedAccount";
import { useProfileGate } from "./hooks/social/useProfileGate";
import { useWallet } from "./hooks/social/useWallet";
import { getClient } from "./hooks/useChain";
import ThemeToggle from "./components/social/ThemeToggle";

export default function App() {
	const location = useLocation();
	const connected = useChainStore((s) => s.connected);
	const blockNumber = useChainStore((s) => s.blockNumber);
	const { hasProfile } = useProfileGate();
	const { account } = useSelectedAccount();

	useConnectionManagement();

	const showSocialNav = !!account && hasProfile === true;

	return (
		<div className="min-h-screen flex flex-col">
			<header className="sticky top-0 z-50 border-b border-surface-800 bg-surface-950/90 backdrop-blur-xl">
				<div className="max-w-5xl mx-auto px-4 h-14 flex items-center gap-4">
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
						<span className="text-[15px] font-bold tracking-tight hidden sm:inline">SocialFi</span>
					</Link>

					<nav className="flex gap-1">
						<NavLink to="/" label="Home" current={location.pathname === "/"} />
						<NavLink to="/people" label="People" current={location.pathname === "/people"} />
						{showSocialNav && (
							<NavLink to="/social" label="Social" current={location.pathname.startsWith("/social")} />
						)}
					</nav>

					<div className="ml-auto flex items-center gap-3">
						<ThemeToggle />
						<ChainIndicator connected={connected} blockNumber={blockNumber} />
						<WalletButton />
					</div>
				</div>
			</header>

			<style>{`html.light header { background: rgba(255,255,255,0.9); border-color: #e4e4e7; }`}</style>

			<main className="flex-1 max-w-5xl w-full mx-auto px-4 py-6">
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
				current ? "bg-brand-500/10 text-brand-500" : "text-surface-400 hover:text-surface-100 hover:bg-surface-800"
			}`}
		>
			{label}
		</Link>
	);
}

/* ── Chain indicator ───────────────────────────────────── */

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
	useEffect(() => {
		function h(e: MouseEvent) { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); }
		document.addEventListener("mousedown", h);
		return () => document.removeEventListener("mousedown", h);
	}, []);

	async function handleConnect() {
		setConnecting(true); setError(null);
		try {
			const r = await connect(urlInput);
			if (r?.ok && r.chain) setChainName(r.chain.name);
		} catch { setError("Connection failed"); }
		finally { setConnecting(false); }
	}

	return (
		<div className="relative" ref={ref}>
			<button
				onClick={() => setOpen(!open)}
				className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-surface-800 transition-colors"
				title={connected ? `${chainName ?? "Connected"} — #${blockNumber}` : "Disconnected"}
			>
				<span className={`w-2.5 h-2.5 rounded-full shrink-0 ${
					connected ? "bg-success shadow-[0_0_6px_rgba(34,197,94,0.5)]" : "bg-danger shadow-[0_0_6px_rgba(239,68,68,0.4)]"
				}`} />
				{connected && <span className="text-[11px] font-mono text-secondary hidden sm:inline">#{blockNumber}</span>}
			</button>

			{open && (
				<div className="absolute right-0 top-full mt-2 w-80 rounded-xl border border-surface-700 bg-surface-900 shadow-lg p-4 space-y-3 z-50 animate-fade-in">
					{connected ? (
						<div className="flex items-center gap-2">
							<span className="badge-success">Connected</span>
							<span className="text-xs text-secondary truncate">{chainName}</span>
							<span className="text-xs font-mono text-secondary ml-auto">#{blockNumber}</span>
						</div>
					) : (
						<span className="badge-danger">Disconnected</span>
					)}
					<div>
						<label className="form-label">WebSocket Endpoint</label>
						<div className="flex gap-2">
							<input type="text" value={urlInput} onChange={(e) => setUrlInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleConnect()} placeholder="ws://localhost:9944" className="input flex-1 text-xs" />
							<button onClick={handleConnect} disabled={connecting} className="btn-brand btn-sm shrink-0">{connecting ? "..." : "Connect"}</button>
						</div>
					</div>
					{error && <p className="text-xs text-danger">{error}</p>}
					<style>{`html.light .bg-surface-900 { background: white; } html.light .border-surface-700 { border-color: #e4e4e7; }`}</style>
				</div>
			)}
		</div>
	);
}

/* ── Wallet button ─────────────────────────────────────── */

const WALLET_NAMES: Record<string, string> = {
	"polkadot-js": "Polkadot.js",
	"subwallet-js": "SubWallet",
	talisman: "Talisman",
};

const WALLET_ICONS: Record<string, string> = {
	"polkadot-js": "M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z",
	talisman: "M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z",
	"subwallet-js": "M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z",
};

function WalletButton() {
	const navigate = useNavigate();
	const setExternalAccounts = useChainStore((s) => s.setExternalAccounts);
	const { account, allAccounts, selectedAccountIndex, setSelectedAccountIndex } = useSelectedAccount();
	const wallet = useWallet();
	const [open, setOpen] = useState(false);
	const [connectingWallet, setConnectingWallet] = useState<string | null>(null);
	const ref = useRef<HTMLDivElement>(null);

	// Sync wallet accounts to store
	useEffect(() => {
		const external: WalletAccount[] = [
			...wallet.spektrAccounts.map((a) => ({
				name: a.name || "Host Account",
				address: a.address,
				signer: a.polkadotSigner,
				type: "host" as const,
			})),
			...wallet.extensionAccounts.map((a) => ({
				name: a.name || "Extension",
				address: a.address,
				signer: a.polkadotSigner,
				type: "extension" as const,
			})),
		];
		setExternalAccounts(external);
	}, [wallet.spektrAccounts, wallet.extensionAccounts, setExternalAccounts]);

	// Close on outside click
	useEffect(() => {
		function h(e: MouseEvent) { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); }
		document.addEventListener("mousedown", h);
		return () => document.removeEventListener("mousedown", h);
	}, []);

	async function handleConnectWallet(name: string) {
		setConnectingWallet(name);
		await wallet.connectWallet(name);
		setConnectingWallet(null);
		setOpen(false);
	}

	// ── No wallet connected ──
	if (!account) {
		return (
			<div className="relative" ref={ref}>
				<button onClick={() => setOpen(!open)} className="btn-brand btn-sm">
					Connect
				</button>

				{open && (
					<div className="absolute right-0 top-full mt-2 w-72 rounded-xl border border-surface-700 bg-surface-900 shadow-lg overflow-hidden z-50 animate-fade-in">
						<div className="p-3 border-b border-surface-800">
							<p className="text-sm font-semibold">Connect Wallet</p>
							<p className="text-[11px] text-secondary mt-0.5">Select a wallet to connect</p>
						</div>

						<div className="p-2 space-y-1">
							{wallet.availableWallets.length > 0 ? (
								wallet.availableWallets.map((name) => (
									<button
										key={name}
										onClick={() => handleConnectWallet(name)}
										disabled={connectingWallet !== null}
										className="w-full text-left px-3 py-2.5 rounded-lg hover:bg-surface-800 transition-colors flex items-center gap-3"
									>
										<div className="w-8 h-8 rounded-lg bg-surface-800 flex items-center justify-center shrink-0">
											<svg className="w-5 h-5 text-surface-400" fill="currentColor" viewBox="0 0 24 24">
												<path d={WALLET_ICONS[name] || WALLET_ICONS["polkadot-js"]} />
											</svg>
										</div>
										<div className="flex-1">
											<p className="text-sm font-medium">{WALLET_NAMES[name] || name}</p>
											<p className="text-[10px] text-surface-500">Browser extension</p>
										</div>
										{connectingWallet === name && (
											<div className="w-4 h-4 border-2 border-surface-600 border-t-brand-500 rounded-full animate-spin shrink-0" />
										)}
									</button>
								))
							) : (
								<div className="px-3 py-4 text-center space-y-2">
									<p className="text-xs text-secondary">No wallets detected</p>
									<p className="text-[10px] text-surface-500">
										Install{" "}
										<a href="https://talisman.xyz" target="_blank" rel="noopener noreferrer" className="text-brand-500 hover:underline">Talisman</a>,{" "}
										<a href="https://polkadot.js.org/extension/" target="_blank" rel="noopener noreferrer" className="text-brand-500 hover:underline">Polkadot.js</a>, or{" "}
										<a href="https://subwallet.app" target="_blank" rel="noopener noreferrer" className="text-brand-500 hover:underline">SubWallet</a>
									</p>
								</div>
							)}

							{/* Spektr / Host */}
							{wallet.spektrStatus === "connected" && (
								<div className="px-3 py-2 rounded-lg bg-success/5 border border-success/10">
									<p className="text-xs text-success font-medium">
										Polkadot Host connected ({wallet.spektrAccounts.length} accounts)
									</p>
								</div>
							)}
						</div>

						<style>{`
							html.light .bg-surface-900 { background: white; }
							html.light .border-surface-700, html.light .border-surface-800 { border-color: #e4e4e7; }
							html.light .bg-surface-800 { background: #f4f4f5; }
							html.light .hover\\:bg-surface-800:hover { background: #f4f4f5; }
						`}</style>
					</div>
				)}
			</div>
		);
	}

	// ── Wallet connected ──
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
					{/* Connected accounts */}
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
									acc.type === "host" ? "bg-brand-500" : "bg-purple-500"
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

					{/* Footer actions */}
					<div className="border-t border-surface-800 p-2 space-y-1">
						{wallet.connectedWallet && (
							<button
								onClick={() => { wallet.disconnectWallet(); setOpen(false); }}
								className="w-full text-left px-3 py-2 text-xs text-danger hover:bg-danger/5 rounded-lg transition-colors flex items-center gap-2"
							>
								<svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
									<path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9" />
								</svg>
								Disconnect {WALLET_NAMES[wallet.connectedWallet] || wallet.connectedWallet}
							</button>
						)}
						<button
							onClick={() => { navigate("/social/accounts"); setOpen(false); }}
							className="w-full text-left px-3 py-2 text-xs text-secondary hover:text-surface-100 hover:bg-surface-800 rounded-lg transition-colors flex items-center gap-2"
						>
							<svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
								<path strokeLinecap="round" strokeLinejoin="round" d="M10.343 3.94c.09-.542.56-.94 1.11-.94h1.093c.55 0 1.02.398 1.11.94l.149.894c.07.424.384.764.78.93.398.164.855.142 1.205-.108l.737-.527a1.125 1.125 0 011.45.12l.773.774c.39.389.44 1.002.12 1.45l-.527.737c-.25.35-.272.806-.107 1.204.165.397.505.71.93.78l.893.15c.543.09.94.56.94 1.109v1.094c0 .55-.397 1.02-.94 1.11l-.893.149c-.425.07-.765.383-.93.78-.165.398-.143.854.107 1.204l.527.738c.32.447.269 1.06-.12 1.45l-.774.773a1.125 1.125 0 01-1.449.12l-.738-.527c-.35-.25-.806-.272-1.203-.107-.397.165-.71.505-.781.929l-.149.894c-.09.542-.56.94-1.11.94h-1.094c-.55 0-1.019-.398-1.11-.94l-.148-.894c-.071-.424-.384-.764-.781-.93-.398-.164-.854-.142-1.204.108l-.738.527c-.447.32-1.06.269-1.45-.12l-.773-.774a1.125 1.125 0 01-.12-1.45l.527-.737c.25-.35.273-.806.108-1.204-.165-.397-.506-.71-.93-.78l-.894-.15c-.542-.09-.94-.56-.94-1.109v-1.094c0-.55.398-1.02.94-1.11l.894-.149c.424-.07.765-.383.93-.78.165-.398.143-.854-.107-1.204l-.527-.738a1.125 1.125 0 01.12-1.45l.773-.773a1.125 1.125 0 011.45-.12l.737.527c.35.25.807.272 1.204.107.397-.165.71-.505.78-.929l.15-.894z" />
								<path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
							</svg>
							Manage wallets
						</button>
					</div>

					<style>{`
						html.light .bg-surface-900 { background: white; }
						html.light .border-surface-700, html.light .border-surface-800 { border-color: #e4e4e7; }
						html.light .hover\\:bg-surface-800:hover { background: #f4f4f5; }
					`}</style>
				</div>
			)}
		</div>
	);
}
