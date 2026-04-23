import { Outlet, Link, NavLink, useLocation, useNavigate } from "react-router-dom";
import { useState, useRef, useEffect } from "react";
import {
	ChevronDown,
	LogOut,
	User,
	Pencil,
	ArrowLeftRight,
	Users,
	Wallet,
	Radio,
	AlertCircle,
} from "lucide-react";
import { useChainStore, type WalletAccount } from "./store/chainStore";
import { useConnectionManagement, useConnection } from "./hooks/useConnection";
import { useSelectedAccount } from "./hooks/social/useSelectedAccount";
import { useProfileGate } from "./hooks/social/useProfileGate";
import { useWallet } from "./hooks/social/useWallet";
import { getClient } from "./hooks/useChain";
import { useTheme } from "./hooks/useTheme";
import ThemeToggle from "./components/social/ThemeToggle";
import NotificationsBell from "./components/social/NotificationsBell";
import { Avatar, Badge, Button, cn } from "./components/ui";

export default function App() {
	const location = useLocation();
	const connected = useChainStore((s) => s.connected);
	const blockNumber = useChainStore((s) => s.blockNumber);
	const { hasProfile } = useProfileGate();
	const { account } = useSelectedAccount();
	const { theme } = useTheme();
	const logoSrc = theme === "dark" ? "/logo-dark.png" : "/logo-light.png";

	useConnectionManagement();

	const showSocialNav = !!account && hasProfile === true;
	const inSocial = location.pathname.startsWith("/social");
	// Pages that manage their own outer container (full-bleed hero, etc).
	const selfContained = inSocial || location.pathname === "/";

	return (
		<div className="relative min-h-screen flex flex-col bg-canvas text-ink">
			{/* Ambient background: subtle dot grid + top radial brand wash */}
			<div
				aria-hidden
				className="pointer-events-none fixed inset-0 bg-dot-grid opacity-60 [mask-image:radial-gradient(ellipse_at_top,black,transparent_70%)]"
			/>
			<div
				aria-hidden
				className="pointer-events-none fixed inset-x-0 top-0 h-[520px] bg-brand-radial opacity-60"
			/>

			<header className="sticky top-0 z-40 border-b border-hairline/[0.06] bg-canvas/80 backdrop-blur-xl">
				<div className="mx-auto flex h-14 max-w-7xl items-center gap-3 px-5">
					<Link to="/" className="group flex shrink-0 items-center gap-2.5">
						<img
							src={logoSrc}
							alt="SocialFi"
							className="h-7 w-7 rounded-lg object-contain"
						/>
						<div className="hidden sm:block">
							<span className="font-display text-[15px] font-medium tracking-tight text-ink">
								SocialFi
							</span>
							<span className="ml-1.5 rounded-sm bg-hairline/[0.06] px-1 py-0.5 font-mono text-[9px] font-medium uppercase tracking-[0.12em] text-ink-subtle">
								v0
							</span>
						</div>
					</Link>

					<nav className="ml-4 hidden items-center gap-0.5 md:flex">
						<TopNavLink to="/" label="Overview" exact current={location.pathname === "/"} />
						<TopNavLink to="/people" label="People" current={location.pathname === "/people"} />
						<TopNavLink to="/protocol" label="Protocol" current={location.pathname === "/protocol"} />
						{showSocialNav && (
							<TopNavLink
								to="/social"
								label="App"
								current={inSocial}
								trailing={
									<span className="ml-1.5 inline-block h-1 w-1 rounded-full bg-brand animate-pulse-ring" />
								}
							/>
						)}
					</nav>

					<div className="ml-auto flex items-center gap-1.5">
						<ChainChip connected={connected} blockNumber={blockNumber} />
						<div className="mx-1 hidden h-5 w-px bg-hairline/[0.08] sm:block" />
						<ThemeToggle />
						{account && <NotificationsBell />}
						<WalletButton />
					</div>
				</div>
			</header>

			<main className="relative flex-1">
				{selfContained ? (
					<Outlet />
				) : (
					<div className="mx-auto max-w-6xl px-5 py-10">
						<Outlet />
					</div>
				)}
			</main>
		</div>
	);
}

function TopNavLink({
	to,
	label,
	current,
	exact,
	trailing,
}: {
	to: string;
	label: string;
	current: boolean;
	exact?: boolean;
	trailing?: React.ReactNode;
}) {
	return (
		<NavLink
			to={to}
			end={exact}
			className={cn(
				"relative inline-flex items-center gap-1 rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
				current
					? "text-ink"
					: "text-ink-muted hover:text-ink hover:bg-hairline/[0.04]",
			)}
		>
			{label}
			{trailing}
			{current && (
				<span
					aria-hidden
					className="absolute inset-x-3 -bottom-[13px] h-px bg-ink"
				/>
			)}
		</NavLink>
	);
}

/* ── Chain chip ──────────────────────────────────────────── */

function ChainChip({ connected, blockNumber }: { connected: boolean; blockNumber: number }) {
	const wsUrl = useChainStore((s) => s.wsUrl);
	const { connect } = useConnection();
	const [open, setOpen] = useState(false);
	const [urlInput, setUrlInput] = useState(wsUrl);
	const [chainName, setChainName] = useState<string | null>(null);
	const [connecting, setConnecting] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const ref = useRef<HTMLDivElement>(null);

	useEffect(() => {
		setUrlInput(wsUrl);
	}, [wsUrl]);

	useEffect(() => {
		if (!connected) {
			setChainName(null);
			return;
		}
		getClient(wsUrl)
			.getChainSpecData()
			.then((d) => setChainName(d.name))
			.catch(() => {});
	}, [connected, wsUrl]);

	useEffect(() => {
		function h(e: MouseEvent) {
			if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
		}
		document.addEventListener("mousedown", h);
		return () => document.removeEventListener("mousedown", h);
	}, []);

	async function handleConnect() {
		setConnecting(true);
		setError(null);
		try {
			const r = await connect(urlInput);
			if (r?.ok && r.chain) setChainName(r.chain.name);
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
				className={cn(
					"inline-flex items-center gap-2 rounded-md border px-2.5 py-1.5 transition-colors",
					connected
						? "border-hairline/[0.08] hover:border-hairline/[0.16]"
						: "border-danger/20 hover:border-danger/40",
				)}
				title={connected ? `${chainName ?? "Connected"} — #${blockNumber}` : "Disconnected"}
			>
				<span className="relative flex h-2 w-2 items-center justify-center">
					<span
						className={cn(
							"absolute inline-block h-2 w-2 rounded-full",
							connected ? "bg-success" : "bg-danger",
						)}
					/>
					{connected && (
						<span className="absolute inline-block h-2 w-2 animate-ping rounded-full bg-success opacity-75" />
					)}
				</span>
				{connected ? (
					<span className="hidden font-mono text-[11px] tabular text-ink-muted sm:inline">
						#{blockNumber || "—"}
					</span>
				) : (
					<span className="hidden text-[11px] font-medium text-danger sm:inline">Offline</span>
				)}
			</button>

			{open && (
				<div className="absolute right-0 top-full z-50 mt-2 w-80 overflow-hidden rounded-xl border border-hairline/[0.08] bg-canvas-overlay shadow-lift animate-fade-in">
					<div className="border-b border-hairline/[0.06] p-4">
						<div className="flex items-center gap-2">
							<Radio size={14} className="text-ink-muted" strokeWidth={1.75} />
							<span className="text-sm font-semibold text-ink">Network</span>
							<Badge tone={connected ? "success" : "danger"} size="sm" dot className="ml-auto">
								{connected ? "Live" : "Offline"}
							</Badge>
						</div>
						{connected && (
							<div className="mt-3 flex items-baseline justify-between">
								<span className="text-xs text-ink-muted">{chainName ?? "…"}</span>
								<span className="font-mono text-sm tabular text-ink">#{blockNumber}</span>
							</div>
						)}
					</div>
					<div className="space-y-2 p-4">
						<label className="form-label">WebSocket Endpoint</label>
						<div className="flex gap-2">
							<input
								type="text"
								value={urlInput}
								onChange={(e) => setUrlInput(e.target.value)}
								onKeyDown={(e) => e.key === "Enter" && handleConnect()}
								placeholder="ws://localhost:9944"
								className="h-9 flex-1 rounded-md border border-hairline/[0.1] bg-canvas-sunken px-3 font-mono text-xs text-ink placeholder:text-ink-subtle focus:border-brand/50 focus:outline-none focus:shadow-[0_0_0_3px_rgb(var(--brand)/0.15)]"
							/>
							<Button onClick={handleConnect} loading={connecting} variant="primary" size="sm">
								Connect
							</Button>
						</div>
						{error && (
							<p className="flex items-center gap-1.5 text-xs text-danger">
								<AlertCircle size={12} /> {error}
							</p>
						)}
					</div>
				</div>
			)}
		</div>
	);
}

/* ── Wallet button ──────────────────────────────────────── */

const WALLET_LABEL: Record<string, string> = {
	"polkadot-js": "Polkadot.js",
	"subwallet-js": "SubWallet",
	talisman: "Talisman",
};

function WalletButton() {
	const navigate = useNavigate();
	const setExternalAccounts = useChainStore((s) => s.setExternalAccounts);
	const { account, allAccounts, selectedAccountIndex, setSelectedAccountIndex } = useSelectedAccount();
	const wallet = useWallet();
	const [open, setOpen] = useState(false);
	const [connectingWallet, setConnectingWallet] = useState<string | null>(null);
	const ref = useRef<HTMLDivElement>(null);

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

	useEffect(() => {
		function h(e: MouseEvent) {
			if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
		}
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
				<Button
					variant="primary"
					size="sm"
					leadingIcon={<Wallet size={14} strokeWidth={1.75} />}
					onClick={() => setOpen(!open)}
				>
					Connect
				</Button>

				{open && (
					<div className="absolute right-0 top-full z-50 mt-2 w-80 overflow-hidden rounded-xl border border-hairline/[0.08] bg-canvas-overlay shadow-lift animate-fade-in">
						<div className="border-b border-hairline/[0.06] p-4">
							<p className="text-sm font-semibold text-ink">Connect wallet</p>
							<p className="mt-0.5 text-xs text-ink-muted">
								Sign in with a Substrate-compatible extension.
							</p>
						</div>

						<div className="p-2">
							{wallet.availableWallets.length > 0 ? (
								wallet.availableWallets.map((name) => (
									<button
										key={name}
										onClick={() => handleConnectWallet(name)}
										disabled={connectingWallet !== null}
										className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors hover:bg-hairline/[0.04]"
									>
										<div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-hairline/[0.06] text-ink-muted">
											<Wallet size={14} strokeWidth={1.75} />
										</div>
										<div className="flex-1">
											<p className="text-sm font-medium text-ink">{WALLET_LABEL[name] || name}</p>
											<p className="text-[10px] text-ink-subtle">Browser extension</p>
										</div>
										{connectingWallet === name ? (
											<div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-hairline/20 border-t-brand" />
										) : (
											<ChevronDown size={14} className="-rotate-90 text-ink-subtle" />
										)}
									</button>
								))
							) : (
								<div className="space-y-2 px-3 py-5 text-center">
									<p className="text-xs text-ink-muted">No wallets detected</p>
									<p className="text-[11px] text-ink-subtle text-pretty">
										Install{" "}
										<a href="https://talisman.xyz" target="_blank" rel="noreferrer" className="text-brand hover:underline">Talisman</a>,{" "}
										<a href="https://polkadot.js.org/extension/" target="_blank" rel="noreferrer" className="text-brand hover:underline">Polkadot.js</a>, or{" "}
										<a href="https://subwallet.app" target="_blank" rel="noreferrer" className="text-brand hover:underline">SubWallet</a>
									</p>
								</div>
							)}

							{wallet.spektrStatus === "connected" && (
								<div className="mx-1 mt-2 rounded-md border border-success/20 bg-success/5 px-3 py-2">
									<p className="text-xs font-medium text-success">
										Polkadot Host connected · {wallet.spektrAccounts.length} accounts
									</p>
								</div>
							)}
						</div>
					</div>
				)}
			</div>
		);
	}

	const truncated = `${account.address.slice(0, 6)}…${account.address.slice(-4)}`;

	return (
		<div className="relative" ref={ref}>
			<button
				onClick={() => setOpen(!open)}
				className="inline-flex items-center gap-2 rounded-md border border-hairline/[0.08] py-1 pl-1 pr-2 transition-colors hover:border-hairline/[0.16]"
			>
				<Avatar size="xs" seed={account.address} alt={account.name} />
				<span className="hidden font-mono text-[11px] tabular text-ink-muted sm:inline">{truncated}</span>
				<ChevronDown
					size={12}
					className={cn("text-ink-subtle transition-transform", open && "rotate-180")}
				/>
			</button>

			{open && (
				<div className="absolute right-0 top-full z-50 mt-2 w-80 overflow-hidden rounded-xl border border-hairline/[0.08] bg-canvas-overlay shadow-lift animate-fade-in">
					<div className="border-b border-hairline/[0.06] px-4 py-3">
						<p className="text-[10px] font-medium uppercase tracking-[0.14em] text-ink-subtle">
							Switch account
						</p>
					</div>
					<div className="max-h-64 overflow-y-auto py-1">
						{allAccounts.map((acc, i) => (
							<button
								key={`${acc.type}-${acc.address}`}
								onClick={() => {
									setSelectedAccountIndex(i);
									setOpen(false);
								}}
								className={cn(
									"flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors hover:bg-hairline/[0.04]",
									i === selectedAccountIndex && "bg-hairline/[0.03]",
								)}
							>
								<Avatar size="sm" seed={acc.address} alt={acc.name} />
								<div className="min-w-0 flex-1">
									<div className="flex items-center gap-1.5">
										<p className="truncate text-sm font-medium text-ink">{acc.name}</p>
										<Badge tone="neutral" size="sm" variant="outline">
											{acc.type}
										</Badge>
									</div>
									<p className="truncate font-mono text-[10px] text-ink-subtle">{acc.address}</p>
								</div>
								{i === selectedAccountIndex && (
									<span className="h-1.5 w-1.5 shrink-0 rounded-full bg-brand shadow-[0_0_8px_rgb(var(--brand))]" />
								)}
							</button>
						))}
					</div>

					<div className="border-t border-hairline/[0.06] p-1.5">
						<WalletMenuItem
							icon={<User size={14} strokeWidth={1.75} />}
							label="My profile"
							onClick={() => {
								navigate(`/profile/${account.address}`);
								setOpen(false);
							}}
						/>
						<WalletMenuItem
							icon={<Pencil size={14} strokeWidth={1.75} />}
							label="Edit profile"
							onClick={() => {
								navigate("/profile/edit");
								setOpen(false);
							}}
						/>
						<WalletMenuItem
							icon={<ArrowLeftRight size={14} strokeWidth={1.75} />}
							label="Transactions"
							onClick={() => {
								navigate("/social/transactions");
								setOpen(false);
							}}
						/>
						<WalletMenuItem
							icon={<Users size={14} strokeWidth={1.75} />}
							label="Social graph"
							onClick={() => {
								navigate("/social/graph");
								setOpen(false);
							}}
						/>
					</div>

					{wallet.connectedWallet && (
						<div className="border-t border-hairline/[0.06] p-1.5">
							<button
								onClick={() => {
									wallet.disconnectWallet();
									setOpen(false);
								}}
								className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-xs text-danger transition-colors hover:bg-danger/10"
							>
								<LogOut size={14} strokeWidth={1.75} />
								Disconnect
							</button>
						</div>
					)}
				</div>
			)}
		</div>
	);
}

function WalletMenuItem({
	icon,
	label,
	onClick,
}: {
	icon: React.ReactNode;
	label: string;
	onClick: () => void;
}) {
	return (
		<button
			onClick={onClick}
			className="flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-left text-xs text-ink-muted transition-colors hover:bg-hairline/[0.04] hover:text-ink"
		>
			<span className="text-ink-subtle">{icon}</span>
			{label}
		</button>
	);
}
