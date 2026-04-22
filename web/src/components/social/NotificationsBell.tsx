import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
	useNotifications,
	type NotificationEvent,
} from "../../hooks/social/useNotifications";

/**
 * Bell icon + dropdown showing live Statement Store notifications for the
 * selected account. Unread count resets once the dropdown is opened.
 *
 * Notifications feed in through `useNotifications`, which opens a
 * `StatementStoreClient` subscription against the connected node — no
 * polling, no indexer.
 */
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
				className="relative flex items-center justify-center w-9 h-9 rounded-lg hover:bg-surface-800 transition-colors"
				title={connected ? "Notifications" : "Notifications (disconnected)"}
				aria-label="Notifications"
			>
				<svg
					className={`w-5 h-5 ${connected ? "text-surface-300" : "text-surface-600"}`}
					fill="none"
					viewBox="0 0 24 24"
					stroke="currentColor"
					strokeWidth={1.8}
				>
					<path
						strokeLinecap="round"
						strokeLinejoin="round"
						d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0"
					/>
				</svg>
				{unreadCount > 0 && (
					<span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] rounded-full bg-brand-500 text-[10px] font-bold text-white flex items-center justify-center px-1">
						{unreadCount > 99 ? "99+" : unreadCount}
					</span>
				)}
			</button>

			{open && (
				<div className="absolute right-0 top-full mt-2 w-96 rounded-xl border border-surface-700 bg-surface-900 shadow-lg overflow-hidden z-50 animate-fade-in">
					<div className="px-4 py-3 border-b border-surface-800 flex items-center gap-2">
						<p className="text-sm font-semibold">Notifications</p>
						<span
							className={`ml-auto text-[11px] ${
								connected ? "text-success" : "text-surface-500"
							}`}
						>
							{connected ? "live" : "connecting…"}
						</span>
					</div>

					{error && (
						<div className="px-4 py-3 text-xs text-danger border-b border-surface-800">
							{error}
						</div>
					)}

					{items.length === 0 ? (
						<div className="px-4 py-10 text-center space-y-1">
							<p className="text-sm text-secondary">No notifications yet</p>
							<p className="text-[11px] text-surface-500">
								Replies, follows and new app launches will show up here in real time.
							</p>
						</div>
					) : (
						<ul className="max-h-96 overflow-y-auto divide-y divide-surface-800">
							{items.map((notification) => (
								<li key={notification.id}>
									<button
										onClick={() => handleNotificationClick(notification)}
										className="w-full text-left px-4 py-3 hover:bg-surface-800 transition-colors flex items-start gap-3"
									>
										<NotificationIcon kind={notification.kind} />
										<div className="flex-1 min-w-0">
											<p className="text-sm text-surface-100">
												{describeNotification(notification)}
											</p>
											<p className="text-[10px] text-surface-500 mt-0.5">
												block #{notification.block} ·{" "}
												{formatRelative(notification.receivedAt)}
											</p>
										</div>
									</button>
								</li>
							))}
						</ul>
					)}

					<style>{`
						html.light .bg-surface-900 { background: white; }
						html.light .border-surface-700, html.light .border-surface-800 { border-color: #e4e4e7; }
						html.light .hover\\:bg-surface-800:hover { background: #f4f4f5; }
						html.light .divide-surface-800 > * + * { border-color: #e4e4e7; }
					`}</style>
				</div>
			)}
		</div>
	);
}

function NotificationIcon({ kind }: { kind: NotificationEvent["kind"] }) {
	const path =
		kind === "reply"
			? "M2.25 12.76c0 1.6 1.123 2.994 2.707 3.227 1.068.157 2.148.279 3.238.364.466.037.893.281 1.153.671L12 21l2.652-3.978c.26-.39.687-.634 1.153-.67 1.09-.086 2.17-.208 3.238-.365 1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z"
			: kind === "follow"
				? "M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z"
				: "M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z";
	return (
		<div
			className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
				kind === "reply"
					? "bg-brand-500/10 text-brand-500"
					: kind === "follow"
						? "bg-purple-500/10 text-purple-500"
						: "bg-amber-500/10 text-amber-500"
			}`}
		>
			<svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
				<path strokeLinecap="round" strokeLinejoin="round" d={path} />
			</svg>
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
	// Accept both 0x-prefixed and bare hex.
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
	// `entity` is hex-encoded SCALE bytes — u32/u64 for posts/apps, a
	// 32-byte account for follows. We keep the deep-linking conservative
	// because social routes currently key on ss58 addresses, not raw hex.
	switch (notification.kind) {
		case "reply":
			// Post detail routes accept post ids, but this event carries
			// the *reply* id (the new post). The feed refresh is enough
			// to surface it — no deep-link target today.
			return "/social/feed";
		case "follow":
			return "/social/graph";
		case "new-app":
			return "/social/apps";
	}
}
