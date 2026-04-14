import { useEffect, useState, useCallback } from "react";
import { useParams, Link } from "react-router-dom";
import { Binary } from "polkadot-api";
import { useSocialApi } from "../../hooks/social/useSocialApi";
import { useSelectedAccount } from "../../hooks/social/useSelectedAccount";
import { useTxTracker } from "../../hooks/social/useTxTracker";
import { useIpfs } from "../../hooks/social/useIpfs";
import AddressDisplay from "../../components/social/AddressDisplay";
import ConfirmModal from "../../components/social/ConfirmModal";
import TxToast from "../../components/social/TxToast";

type Visibility = "Public" | "Obfuscated" | "Private";
const MAX_CHARS = 400;

interface PostData {
	id: number;
	author: string;
	contentCid: string;
	resolvedText: string | null;
	appId: number | null;
	parentPost: number | null;
	replyFee: bigint;
	visibility: Visibility;
	unlockFee: bigint;
	createdAt: number;
}

export default function PostDetailPage() {
	const { postId } = useParams<{ postId: string }>();
	const { getApi } = useSocialApi();
	const { account } = useSelectedAccount();
	const tracker = useTxTracker();
	const { fetchPostContent, uploadPostContent } = useIpfs();
	const [post, setPost] = useState<PostData | null>(null);
	const [replies, setReplies] = useState<PostData[]>([]);
	const [isUnlocked, setIsUnlocked] = useState(false);
	const [loading, setLoading] = useState(true);
	const [replyContent, setReplyContent] = useState("");
	const [uploading, setUploading] = useState(false);
	const [showConfirm, setShowConfirm] = useState(false);

	const numericId = Number(postId);
	const accountAddress = account?.address ?? null;

	const loadPost = useCallback(async () => {
		try {
			setLoading(true);
			const api = getApi();

			const data = await api.query.SocialFeeds.Posts.getValue(BigInt(numericId));
			if (!data) { setPost(null); return; }

			const p: PostData = {
				id: numericId,
				author: data.author.toString(),
				contentCid: data.content.asText(),
				resolvedText: null,
				appId: data.app_id != null ? Number(data.app_id) : null,
				parentPost: data.parent_post != null ? Number(data.parent_post) : null,
				replyFee: data.reply_fee,
				visibility: (data.visibility as { type: Visibility }).type,
				unlockFee: data.unlock_fee,
				createdAt: Number(data.created_at),
			};
			setPost(p);

			// Check unlock status
			let unlockedNow = false;
			if (accountAddress && p.visibility !== "Public") {
				const unlockVal = await api.query.SocialFeeds.UnlockedPosts.getValue(accountAddress, BigInt(numericId));
				unlockedNow = !!unlockVal;
				setIsUnlocked(unlockedNow);
			}

			// Resolve content if allowed
			const canSee = p.visibility === "Public" || p.author === accountAddress || unlockedNow;
			if (canSee) {
				const text = await fetchPostContent(p.contentCid);
				if (text) setPost((prev) => prev ? { ...prev, resolvedText: text } : prev);
			}

			// Load replies
			const replyIds = await api.query.SocialFeeds.Replies.getValue(BigInt(numericId));
			const replyPosts: PostData[] = [];
			for (const rid of replyIds) {
				const rd = await api.query.SocialFeeds.Posts.getValue(rid);
				if (rd) {
					const rp: PostData = {
						id: Number(rid),
						author: rd.author.toString(),
						contentCid: rd.content.asText(),
						resolvedText: null,
						appId: rd.app_id != null ? Number(rd.app_id) : null,
						parentPost: rd.parent_post != null ? Number(rd.parent_post) : null,
						replyFee: rd.reply_fee,
						visibility: (rd.visibility as { type: Visibility }).type,
						unlockFee: rd.unlock_fee,
						createdAt: Number(rd.created_at),
					};
					replyPosts.push(rp);
				}
			}
			setReplies(replyPosts);

			// Resolve reply content
			for (const r of replyPosts) {
				fetchPostContent(r.contentCid).then((text) => {
					if (text) setReplies((prev) => prev.map((rr) => rr.id === r.id ? { ...rr, resolvedText: text } : rr));
				});
			}
		} catch {
			setPost(null);
		} finally {
			setLoading(false);
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [numericId, accountAddress, isUnlocked]);

	useEffect(() => { loadPost(); }, [loadPost]);

	const busy = uploading || tracker.state.stage === "signing" || tracker.state.stage === "broadcasting" || tracker.state.stage === "in_block";

	function canSeeContent(): boolean {
		if (!post) return false;
		if (post.visibility === "Public") return true;
		if (post.author === accountAddress) return true;
		return isUnlocked;
	}

	async function unlockPost() {
		if (!account || !post) return;
		const api = getApi();
		const tx = api.tx.SocialFeeds.unlock_post({ post_id: BigInt(post.id) });
		const ok = await tracker.submit(tx, account.signer, "Unlock Post");
		if (ok) { setIsUnlocked(true); loadPost(); }
	}

	async function createReply() {
		if (!account || !post || !replyContent.trim()) return;
		try {
			setUploading(true);
			const cid = await uploadPostContent(replyContent.trim());
			setUploading(false);
			const api = getApi();
			const tx = api.tx.SocialFeeds.create_reply({
				parent_post_id: BigInt(post.id),
				content: Binary.fromText(cid),
				app_id: post.appId != null ? post.appId : undefined,
			});
			const ok = await tracker.submit(tx, account.signer, "Reply");
			if (ok) { setReplyContent(""); loadPost(); }
		} catch { setUploading(false); }
	}

	if (loading) {
		return (
			<div className="flex items-center justify-center py-16">
				<div className="w-6 h-6 border-2 border-surface-600 border-t-brand-500 rounded-full animate-spin" />
			</div>
		);
	}

	if (!post) {
		return (
			<div className="panel text-center py-12 space-y-3">
				<p className="text-danger font-semibold">Post #{postId} not found</p>
				<Link to="/" className="btn-outline btn-sm inline-flex">Back</Link>
			</div>
		);
	}

	const visible = canSeeContent();

	return (
		<div className="space-y-4 animate-fade-in">
			{/* Back */}
			<Link to={post.appId != null ? `/app/${post.appId}` : "/social/feed"} className="inline-flex items-center gap-1 text-xs text-secondary hover:text-surface-100 transition-colors">
				<svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
					<path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
				</svg>
				Back
			</Link>

			{/* Post */}
			<div className="panel space-y-4">
				<div className="flex items-center gap-3">
					<div className="avatar bg-brand-500 text-xs">{post.author.slice(2, 4)}</div>
					<div className="flex-1 min-w-0">
						<AddressDisplay address={post.author} />
						<p className="text-[11px] text-surface-500 font-mono">
							Block #{post.createdAt}
							{post.appId !== null && <span className="ml-2 text-info">App #{post.appId}</span>}
						</p>
					</div>
					<div className="flex items-center gap-2">
						{post.visibility !== "Public" && (
							<span className={`badge ${post.visibility === "Obfuscated" ? "badge-info" : "badge-danger"}`}>
								{post.visibility}
							</span>
						)}
						<span className="text-[11px] font-mono text-surface-600">#{post.id}</span>
					</div>
				</div>

				{/* Content */}
				{visible ? (
					<p className="text-base whitespace-pre-wrap break-words leading-relaxed">
						{post.resolvedText ?? <span className="text-surface-500 italic">Loading content...</span>}
					</p>
				) : (
					<div className="rounded-xl bg-surface-800 border border-surface-700 p-6 text-center space-y-3">
						<svg className="w-8 h-8 text-surface-500 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
							<path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
						</svg>
						<p className="text-sm text-secondary">This post is {post.visibility.toLowerCase()}.</p>
						{account && (
							<button onClick={unlockPost} disabled={busy} className="btn-brand">
								Unlock for {post.unlockFee.toString()} units
							</button>
						)}
						<style>{`html.light .bg-surface-800 { background: #f4f4f5; } html.light .border-surface-700 { border-color: #e4e4e7; }`}</style>
					</div>
				)}

				{/* Meta */}
				<div className="flex items-center gap-4 text-xs text-surface-500 pt-2 border-t border-surface-800/50">
					<span>{replies.length} {replies.length === 1 ? "reply" : "replies"}</span>
					{post.replyFee > 0n && <span>Reply fee: {post.replyFee.toString()}</span>}
					{post.unlockFee > 0n && post.visibility !== "Public" && <span>Unlock fee: {post.unlockFee.toString()}</span>}
				</div>
			</div>

			{/* Reply compose */}
			{account && visible && (
				<div className="panel space-y-3">
					<textarea
						value={replyContent}
						onChange={(e) => { if (e.target.value.length <= MAX_CHARS) setReplyContent(e.target.value); }}
						placeholder="Write a reply..."
						rows={3}
						className="input resize-none w-full"
					/>
					<div className="flex items-center justify-between">
						<span className="text-xs text-surface-500">{MAX_CHARS - replyContent.length} chars left</span>
						<button onClick={() => setShowConfirm(true)} disabled={!replyContent.trim() || busy} className="btn-brand btn-sm">
							Reply
						</button>
					</div>
				</div>
			)}

			{/* Replies */}
			{visible && replies.length > 0 && (
				<div className="space-y-2">
					{replies.map((r) => (
						<div key={r.id} className="panel space-y-2">
							<div className="flex items-center gap-3">
								<div className="avatar bg-surface-700 text-xs">{r.author.slice(2, 4)}</div>
								<div className="flex-1 min-w-0">
									<AddressDisplay address={r.author} />
									<p className="text-[11px] text-surface-500 font-mono">Block #{r.createdAt}</p>
								</div>
								<span className="text-[11px] font-mono text-surface-600">#{r.id}</span>
							</div>
							<p className="text-sm whitespace-pre-wrap break-words pl-[52px]">
								{r.resolvedText ?? <span className="text-surface-500 italic">Loading...</span>}
							</p>
						</div>
					))}
				</div>
			)}

			<ConfirmModal
				open={showConfirm}
				title="Reply Cost"
				confirmLabel={busy ? "Sending..." : "Confirm & Reply"}
				confirmDisabled={busy}
				onCancel={() => setShowConfirm(false)}
				onConfirm={async () => {
					setShowConfirm(false);
					await createReply();
				}}
			>
				<div className="space-y-3 text-sm">
					<div className="rounded-xl bg-surface-800 p-3 space-y-2">
						<div className="flex items-center justify-between">
							<span className="text-secondary">Post fee</span>
							<span className="font-mono font-semibold">Post Fee</span>
						</div>
						{post && post.replyFee > 0n && (
							<div className="flex items-center justify-between">
								<span className="text-secondary">Reply fee (to author)</span>
								<span className="font-mono font-semibold">{post.replyFee.toString()}</span>
							</div>
						)}
						{post && post.replyFee === 0n && (
							<div className="flex items-center justify-between">
								<span className="text-secondary">Reply fee</span>
								<span className="font-mono text-success">Free</span>
							</div>
						)}
					</div>
					<p className="text-xs text-secondary">Fees are deducted when the reply is submitted.</p>
					<style>{`html.light .bg-surface-800 { background: #f4f4f5; }`}</style>
				</div>
			</ConfirmModal>

			<TxToast state={tracker.state} onDismiss={tracker.reset} />
		</div>
	);
}
