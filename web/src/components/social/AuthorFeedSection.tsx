/**
 * Author feed rendered via the `social-feeds` pallet view functions.
 *
 * Uses three new `#[pallet::view_functions]` exposed by the runtime's
 * `RuntimeViewFunction` API:
 *   - `author_post_count(author) -> u32`
 *   - `feed_by_author(author, from?, to?, limit) -> Vec<(PostId, PostInfo)>`
 *   - `post_by_id(post_id) -> Option<PostInfo>`   (wired for single lookups)
 *
 * View functions are free reads — no extrinsic, no fee, no block. The
 * server does the indexing (PostsTimeline) + hydration for us, so the
 * client pays no bandwidth for posts outside the requested page.
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useSocialApi } from "../../hooks/social/useSocialApi";
import { useIpfs } from "../../hooks/social/useIpfs";
import { useSelectedAccount } from "../../hooks/social/useSelectedAccount";

type Visibility = "Public" | "Obfuscated" | "Private";

interface FeedRow {
	id: bigint;
	createdAt: number;
	visibility: Visibility;
	appId: number | null;
	contentCid: string;
	resolvedText: string | null;
	unlockFee: bigint;
}

interface AuthorFeedSectionProps {
	address: string;
	pageSize?: number;
}

export default function AuthorFeedSection({ address, pageSize = 5 }: AuthorFeedSectionProps) {
	const { getApi } = useSocialApi();
	const { fetchPostContent } = useIpfs();
	const { account } = useSelectedAccount();
	// Viewer owns every post in this feed when they are looking at their
	// own profile — obfuscated/private content must render in plain text.
	const isOwnProfile = account?.address === address;

	const [total, setTotal] = useState<number | null>(null);
	const [page, setPage] = useState(0);
	const [rows, setRows] = useState<FeedRow[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	const totalPages = useMemo(() => {
		if (total === null || total === 0) return 0;
		return Math.ceil(total / pageSize);
	}, [total, pageSize]);

	const load = useCallback(async () => {
		if (!address) return;
		setLoading(true);
		setError(null);
		try {
			const api = getApi();

			// Both view calls in parallel — view functions are free RPC.
			const [count, feed] = await Promise.all([
				api.view.SocialFeeds.author_post_count(address),
				// The pallet returns newest-first; to paginate we fetch
				// `(page + 1) * pageSize` and slice client-side. The
				// server still limits the work, so pages > 1 simply
				// re-request a larger head slice — good enough while
				// block-based cursors are not yet exposed.
				api.view.SocialFeeds.feed_by_author(
					address,
					undefined,
					undefined,
					(page + 1) * pageSize,
				),
			]);

			setTotal(count);

			const sliced = feed.slice(page * pageSize, (page + 1) * pageSize);
			const mapped: FeedRow[] = sliced.map(([postId, info]) => ({
				id: postId,
				createdAt: info.created_at,
				visibility: (info.visibility as { type: Visibility }).type,
				appId: info.app_id != null ? Number(info.app_id) : null,
				contentCid: info.content.asText(),
				resolvedText: null,
				unlockFee: info.unlock_fee,
			}));
			setRows(mapped);

			// Hydrate IPFS text in the background. Public posts always
			// hydrate; non-public ones hydrate too when the viewer is
			// the author (they own the keys). The content is only used
			// when `canRead(row)` allows it to render anyway, so this
			// is a fast-path for your own obfuscated/private posts.
			for (const row of mapped) {
				if (row.visibility !== "Public" && !isOwnProfile) continue;
				fetchPostContent(row.contentCid)
					.then((result) => {
						if (!result) return;
						setRows((prev) =>
							prev.map((r) =>
								r.id === row.id ? { ...r, resolvedText: result.text } : r,
							),
						);
					})
					.catch(() => {});
			}
		} catch (e: unknown) {
			const msg = e instanceof Error ? e.message : "Failed to load author feed";
			setError(msg);
			setRows([]);
		} finally {
			setLoading(false);
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [address, page, pageSize, isOwnProfile]);

	useEffect(() => {
		void load();
	}, [load]);

	return (
		<section className="panel space-y-3">
			<div className="flex items-center justify-between">
				<div>
					<h2 className="heading-2">Posts</h2>
					<p className="text-[11px] text-secondary">
						{total === null ? "Loading…" : `${total} total · via view functions`}
					</p>
				</div>
				<button onClick={() => void load()} disabled={loading} className="btn-ghost btn-sm">
					{loading ? "…" : "Refresh"}
				</button>
			</div>

			{error && (
				<div className="rounded-xl border border-danger/30 bg-danger/5 px-3 py-2 text-xs text-danger">
					{error}
				</div>
			)}

			{!error && rows.length === 0 && !loading && (
				<div className="text-center py-6 text-secondary text-sm">
					This author has no posts yet.
				</div>
			)}

			{rows.map((row) => (
				<div
					key={row.id.toString()}
					className="author-feed-card rounded-xl border border-surface-800 bg-surface-900 p-3 space-y-2"
				>
					<div className="flex items-center justify-between text-[11px] text-surface-500 font-mono">
						<span>Block #{row.createdAt}</span>
						<div className="flex items-center gap-2">
							{row.visibility !== "Public" && (
								<span
									className={`badge ${row.visibility === "Obfuscated" ? "badge-info" : "badge-danger"}`}
								>
									{row.visibility}
								</span>
							)}
							{row.appId !== null && (
								<span className="text-info">App #{row.appId}</span>
							)}
							<Link
								to={`/post/${row.id.toString()}`}
								className="hover:text-brand-500 transition-colors"
							>
								#{row.id.toString()}
							</Link>
						</div>
					</div>
					{row.visibility === "Public" || isOwnProfile ? (
						<p className="text-sm whitespace-pre-wrap break-words">
							{row.resolvedText ?? (
								<span className="text-surface-500 italic">Loading content…</span>
							)}
						</p>
					) : (
						<p className="text-xs text-secondary italic">
							Content is {row.visibility.toLowerCase()} — open the post to unlock for{" "}
							{row.unlockFee.toString()} units.
						</p>
					)}
				</div>
			))}

			{totalPages > 1 && (
				<div className="author-feed-pager flex items-center justify-between pt-2 border-t border-surface-800">
					<button
						onClick={() => setPage((p) => Math.max(0, p - 1))}
						disabled={page === 0 || loading}
						className="btn-outline btn-sm"
					>
						Previous
					</button>
					<span className="text-xs text-secondary">
						Page {page + 1} / {totalPages}
					</span>
					<button
						onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
						disabled={page >= totalPages - 1 || loading}
						className="btn-outline btn-sm"
					>
						Next
					</button>
				</div>
			)}

			{/*
			 * Light-mode overrides. The surrounding `.panel` has its own
			 * fix for light mode, but the nested post cards use darker
			 * bg/border tokens that don't flip automatically. Match the
			 * light-mode `.panel` palette (white bg, zinc-200 borders).
			 */}
			<style>{`
				html.light .author-feed-card {
					background: #ffffff;
					border-color: #e4e4e7;
				}
				html.light .author-feed-pager {
					border-color: #e4e4e7;
				}
			`}</style>
		</section>
	);
}
