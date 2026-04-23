import { NavLink, Outlet, useLocation } from "react-router-dom";
import {
	LayoutDashboard,
	Newspaper,
	AppWindow,
	Users,
	User,
	ArrowLeftRight,
	Wallet,
	ShieldCheck,
	HandCoins,
} from "lucide-react";
import type { ReactNode } from "react";
import { useChainStore } from "../../store/chainStore";
import { cn } from "../../components/ui";

interface NavItem {
	to: string;
	label: string;
	icon: ReactNode;
	end?: boolean;
	hint?: string;
}

const primary: NavItem[] = [
	{ to: "/social", label: "Overview", icon: <LayoutDashboard size={15} strokeWidth={1.75} />, end: true },
	{ to: "/social/feed", label: "Feed", icon: <Newspaper size={15} strokeWidth={1.75} /> },
	{ to: "/social/profile", label: "Profile", icon: <User size={15} strokeWidth={1.75} /> },
	{ to: "/social/graph", label: "Graph", icon: <Users size={15} strokeWidth={1.75} /> },
	{ to: "/social/apps", label: "Apps", icon: <AppWindow size={15} strokeWidth={1.75} /> },
];

const secondary: NavItem[] = [
	{ to: "/social/transactions", label: "Transactions", icon: <ArrowLeftRight size={15} strokeWidth={1.75} /> },
	{ to: "/social/accounts", label: "Accounts", icon: <Wallet size={15} strokeWidth={1.75} /> },
	{ to: "/social/managers", label: "Managers", icon: <ShieldCheck size={15} strokeWidth={1.75} /> },
	{ to: "/social/sponsorship", label: "Sponsorship", icon: <HandCoins size={15} strokeWidth={1.75} /> },
];

export default function SocialLayout() {
	const location = useLocation();
	const connected = useChainStore((s) => s.connected);
	const blockNumber = useChainStore((s) => s.blockNumber);

	return (
		<div className="mx-auto flex max-w-7xl gap-0 px-0 sm:px-5">
			{/* ── Sidebar ─────────────────────────────────────────── */}
			<aside className="sticky top-14 hidden h-[calc(100vh-3.5rem)] w-60 shrink-0 overflow-y-auto border-r border-hairline/[0.06] py-8 pr-6 md:block">
				<div className="mb-5 px-3">
					<p className="text-[10px] font-medium uppercase tracking-[0.16em] text-ink-subtle">
						Workspace
					</p>
					<p className="mt-0.5 font-display text-base font-medium text-ink">Social</p>
				</div>

				<SidebarSection>
					{primary.map((item) => (
						<SidebarLink key={item.to} {...item} />
					))}
				</SidebarSection>

				<SidebarSectionHeader>System</SidebarSectionHeader>
				<SidebarSection>
					{secondary.map((item) => (
						<SidebarLink key={item.to} {...item} />
					))}
				</SidebarSection>

				<div className="mt-8 px-3">
					<div className="rounded-lg border border-hairline/[0.08] bg-canvas-sunken px-3 py-3">
						<div className="flex items-center gap-2">
							<span className="relative flex h-2 w-2">
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
							<p className="text-[10px] font-medium uppercase tracking-[0.14em] text-ink-subtle">
								{connected ? "Synced" : "Offline"}
							</p>
						</div>
						<p className="mt-2 font-mono text-xl tabular font-medium text-ink">
							#{blockNumber || "—"}
						</p>
						<p className="mt-0.5 text-[10px] text-ink-subtle">Latest finalized block</p>
					</div>
				</div>
			</aside>

			{/* ── Mobile tabs (md:hidden) ─────────────────────────── */}
			<div className="sticky top-14 z-30 -mx-0 block w-full border-b border-hairline/[0.06] bg-canvas/90 backdrop-blur-xl md:hidden">
				<div className="flex gap-0.5 overflow-x-auto px-3 py-2">
					{primary.concat(secondary).map((item) => {
						const active = item.end
							? location.pathname === item.to
							: location.pathname.startsWith(item.to);
						return (
							<NavLink
								key={item.to}
								to={item.to}
								end={item.end}
								className={cn(
									"inline-flex shrink-0 items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors",
									active
										? "bg-hairline/[0.06] text-ink"
										: "text-ink-muted hover:text-ink",
								)}
							>
								{item.icon}
								{item.label}
							</NavLink>
						);
					})}
				</div>
			</div>

			{/* ── Main content ────────────────────────────────────── */}
			<main className="min-w-0 flex-1 px-4 py-8 md:px-10 md:py-10">
				<div className="animate-fade-up">
					<Outlet />
				</div>
			</main>
		</div>
	);
}

function SidebarSectionHeader({ children }: { children: ReactNode }) {
	return (
		<p className="mb-1.5 mt-6 px-3 text-[10px] font-medium uppercase tracking-[0.16em] text-ink-subtle">
			{children}
		</p>
	);
}

function SidebarSection({ children }: { children: ReactNode }) {
	return <div className="space-y-0.5">{children}</div>;
}

function SidebarLink({ to, label, icon, end, hint }: NavItem) {
	return (
		<NavLink
			to={to}
			end={end}
			className={({ isActive }) =>
				cn(
					"group relative flex items-center gap-2.5 rounded-md px-3 py-1.5 text-sm font-medium transition-all",
					isActive
						? "bg-hairline/[0.06] text-ink"
						: "text-ink-muted hover:bg-hairline/[0.04] hover:text-ink",
				)
			}
		>
			{({ isActive }) => (
				<>
					{isActive && (
						<span
							aria-hidden
							className="absolute left-0 h-4 w-0.5 -translate-x-0.5 rounded-r-full bg-brand shadow-[0_0_8px_rgb(var(--brand)/0.6)]"
						/>
					)}
					<span className={cn("shrink-0", isActive ? "text-brand" : "text-ink-subtle group-hover:text-ink-muted")}>
						{icon}
					</span>
					<span className="truncate">{label}</span>
					{hint ? (
						<span className="ml-auto font-mono text-[10px] text-ink-subtle">{hint}</span>
					) : null}
				</>
			)}
		</NavLink>
	);
}
