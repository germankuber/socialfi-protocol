import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Bell, MessageSquare, UserPlus, Sparkles } from "lucide-react";
import { useNotifications, type NotificationEvent } from "../../hooks/social/useNotifications";

export default function NotificationsBell() {
	const navigate = useNavigate();
	const { items, connected, error } = useNotifications();
	const [open, setOpen] = useState(false);
	const [lastSeenAt, setLastSeenAt] = useState<number>(() => Date.now());
	const ref = useRef<HTMLDivElement>(null);

	const unreadCount = useMemo(
		() => items.filter((n) => n.receivedAt > lastSeenAt).length,
		[items, lastSeenAt],
	);

	useEffect(() => {
		function handler(e: MouseEvent) {
			if (ref.current && !ref.current.contains(e.target as Node)) {
				setOpen(false);
			}
		}
		document.addEventListener("mousedown", handler);
		return () => document.removeEventListener("mousedown", handler);
	}, []);

	function toggleOpen() {
		const next = !open;
		setOpen(next);
		if (next) {
			setLastSeenAt(Date.now());
		}
	}

	function handleNotificationClick(notification: NotificationEvent) {
		setOpen(false);
		const target = resolveDeepLink(notification);
		if (target) {
			navigate(target);
		}
	}

	return (
		<div className="relative" ref={ref}>
			<button
				onClick={toggleOpen}
				className="relative inline-flex h-9 w-9 items-center justify-center rounded-lg text-ink-muted transition-colors hover:bg-hairline/[0.05] hover:text-ink"
				title={connected ? "Notifications" : "Notifications (disconnected)"}
				aria-label="Notifications"
			>
				<Bell size={16} strokeWidth={1.75} className={connected ? "" : "opacity-40"} />
				{unreadCount > 0 && (
					<span className="absolute top-1 right-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-brand px-1 text-[9px] font-semibold text-white tabular shadow-[0_0_8px_rgb(var(--brand)/0.6)]">
						{unreadCount > 99 ? "99+" : unreadCount}
					</span>
				)}
			</button>

			{open && (
				<div className="absolute right-0 top-full mt-2 w-96 overflow-hidden rounded-xl border border-hairline/[0.08] bg-canvas-overlay shadow-lift z-50 animate-fade-in">
					<div className="flex items-center gap-2 border-b border-hairline/[0.06] px-4 py-3">
						<p className="text-sm font-semibold text-ink">Notifications</p>
						<span
							className={`ml-auto inline-flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-[0.12em] ${
								connected ? "text-success" : "text-ink-subtle"
							}`}
						>
							<span
								className={`h-1.5 w-1.5 rounded-full ${
									connected ? "bg-success animate-pulse-ring" : "bg-ink-faint"
								}`}
							/>
							{connected ? "Live" : "Connecting"}
						</span>
					</div>

					{error && (
						<div className="border-b border-hairline/[0.06] px-4 py-2.5 text-xs text-danger">
							{error}
						</div>
					)}

					{items.length === 0 ? (
						<div className="space-y-1 px-6 py-12 text-center">
							<p className="text-sm text-ink-muted">No notifications yet</p>
							<p className="text-xs text-ink-subtle text-pretty">
								Replies, follows and new apps will appear here in real time.
							</p>
						</div>
					) : (
						<ul className="max-h-96 divide-y divide-hairline/[0.06] overflow-y-auto">
							{items.map((notification) => (
								<li key={notification.id}>
									<button
										onClick={() => handleNotificationClick(notification)}
										className="flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-hairline/[0.04]"
									>
										<NotificationIcon kind={notification.kind} />
										<div className="min-w-0 flex-1">
											<p className="text-sm text-ink">
												{describeNotification(notification)}
											</p>
											<p className="mt-0.5 font-mono text-[10px] text-ink-subtle">
												#{notification.block} ·{" "}
												{formatRelative(notification.receivedAt)}
											</p>
										</div>
									</button>
								</li>
							))}
						</ul>
					)}
				</div>
			)}
		</div>
	);
}

function NotificationIcon({ kind }: { kind: NotificationEvent["kind"] }) {
	const Icon = kind === "reply" ? MessageSquare : kind === "follow" ? UserPlus : Sparkles;
	const tone =
		kind === "reply"
			? "bg-brand/10 text-brand"
			: kind === "follow"
				? "bg-info/12 text-info"
				: "bg-warning/12 text-warning";

	return (
		<div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${tone}`}>
			<Icon size={14} strokeWidth={1.75} />
		</div>
	);
}

function describeNotification(notification: NotificationEvent): string {
	const senderShort = truncate(notification.sender);
	switch (notification.kind) {
		case "reply":
			return `${senderShort} replied to your post`;
		case "follow":
			return `${senderShort} followed you`;
		case "new-app":
			return `New app registered by ${senderShort}`;
	}
}

function truncate(hex: string): string {
	const bare = hex.startsWith("0x") ? hex.slice(2) : hex;
	if (bare.length <= 10) return bare;
	return `0x${bare.slice(0, 4)}…${bare.slice(-4)}`;
}

function formatRelative(ts: number): string {
	const diffSec = Math.floor((Date.now() - ts) / 1000);
	if (diffSec < 10) return "just now";
	if (diffSec < 60) return `${diffSec}s ago`;
	const diffMin = Math.floor(diffSec / 60);
	if (diffMin < 60) return `${diffMin}m ago`;
	const diffHr = Math.floor(diffMin / 60);
	if (diffHr < 24) return `${diffHr}h ago`;
	return new Date(ts).toLocaleDateString();
}

function resolveDeepLink(notification: NotificationEvent): string | null {
	switch (notification.kind) {
		case "reply":
			return "/social/feed";
		case "follow":
			return "/social/graph";
		case "new-app":
			return "/social/apps";
	}
}
