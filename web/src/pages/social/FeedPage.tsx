import { useEffect, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import { Binary } from "polkadot-api";
import { useSocialApi } from "../../hooks/social/useSocialApi";
import { useSelectedAccount } from "../../hooks/social/useSelectedAccount";
import { useTxTracker } from "../../hooks/social/useTxTracker";
import { useIpfs } from "../../hooks/social/useIpfs";
import RequireProfile from "../../components/social/RequireProfile";
import TxToast from "../../components/social/TxToast";
import ConfirmModal from "../../components/social/ConfirmModal";
import AuthorDisplay from "../../components/social/AuthorDisplay";

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

export default function FeedPage() {
	const { getApi } = useSocialApi();
	const { account } = useSelectedAccount();
	const tracker = useTxTracker();
	const { uploadPostContent, fetchPostContent } = useIpfs();
	const [posts, setPosts] = useState<PostData[]>([]);
	const [replies, setReplies] = useState<Record<number, PostData[]>>({});
	const [unlocked, setUnlocked] = useState<Set<number>>(new Set());
	const [expanded, setExpanded] = useState<Set<number>>(new Set());
	const [loading, setLoading] = useState(true);
	const [uploading, setUploading] = useState(false);

	// Compose state
	const [content, setContent] = useState("");
	const [replyFee, setReplyFee] = useState("0");
	const [appId, setAppId] = useState("");
	const [visibility, setVisibility] = useState<Visibility>("Public");
	const [unlockFeeInput, setUnlockFeeInput] = useState("0");

	// Reply state
	const [replyingTo, setReplyingTo] = useState<number | null>(null);
	const [replyContent, setReplyContent] = useState("");
	const [replyAppId, setReplyAppId] = useState("");
	const [confirmReplyTo, setConfirmReplyTo] = useState<number | null>(null);

	const accountAddress = account?.address ?? null;

	const loadPosts = useCallback(async () => {
		try {
			setLoading(true);
			const api = getApi();
			const entries = await api.query.SocialFeeds.Posts.getEntries();
			const all: PostData[] = entries.map((e) => ({
				id: Number(e.keyArgs[0]),
				author: e.value.author.toString(),
				contentCid: e.value.content.asText(),
				resolvedText: null,
				appId: e.value.app_id != null ? Number(e.value.app_id) : null,
				parentPost: e.value.parent_post != null ? Number(e.value.parent_post) : null,
				replyFee: e.value.reply_fee,
				visibility: (e.value.visibility as { type: Visibility }).type,
				unlockFee: e.value.unlock_fee,
				createdAt: Number(e.value.created_at),
			}));

			const originals = all
				.filter((p) => p.parentPost === null && p.visibility !== "Private")
				.sort((a, b) => b.id - a.id);
			setPosts(originals);

			const rMap: Record<number, PostData[]> = {};
			for (const p of all) {
				if (p.parentPost !== null) {
					if (!rMap[p.parentPost]) rMap[p.parentPost] = [];
					rMap[p.parentPost].push(p);
				}
			}
			setReplies(rMap);

			// Auto-expand posts that have replies
			setExpanded(new Set(originals.filter((p) => (rMap[p.id]?.length || 0) > 0).map((p) => p.id)));

			let unlockedSet = new Set<number>();
			if (accountAddress) {
				const unlockedEntries = await api.query.SocialFeeds.UnlockedPosts.getEntries(accountAddress);
				unlockedSet = new Set(unlockedEntries.map((e) => Number(e.keyArgs[1])));
				setUnlocked(unlockedSet);
			}

			// Resolve text content from IPFS in background
			// Public: always. Non-public: if author or unlocked.
			for (const p of originals) {
				if (p.visibility === "Public" || p.author === accountAddress || unlockedSet.has(p.id)) {
					fetchPostContent(p.contentCid).then((result) => {
						if (result) {
							setPosts((prev) => prev.map((pp) => pp.id === p.id ? { ...pp, resolvedText: result.text } : pp));
						}
					});
				}
			}
			// Also resolve replies
			for (const parentId of Object.keys(rMap)) {
				for (const r of rMap[Number(parentId)]) {
					fetchPostContent(r.contentCid).then((result) => {
						if (result) {
							setReplies((prev) => ({
								...prev,
								[Number(parentId)]: (prev[Number(parentId)] || []).map((rr) =>
									rr.id === r.id ? { ...rr, resolvedText: result.text } : rr,
								),
							}));
						}
					});
				}
			}
		} catch {
			setPosts([]);
		} finally {
			setLoading(false);
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [accountAddress]);

	useEffect(() => { loadPosts(); }, [loadPosts]);

	const busy = uploading || tracker.state.stage === "signing" || tracker.state.stage === "broadcasting" || tracker.state.stage === "in_block";

	function toggle(id: number) {
		setExpanded((prev) => {
			const n = new Set(prev);
			n.has(id) ? n.delete(id) : n.add(id);
			return n;
		});
	}

	async function createPost() {
		if (!account || !content.trim()) return;
		try {
			setUploading(true);
			const cid = await uploadPostContent(content.trim());
			setUploading(false);

			const api = getApi();
			const tx = api.tx.SocialFeeds.create_post({
				content: Binary.fromText(cid),
				app_id: appId.trim() ? parseInt(appId) : undefined,
				reply_fee: BigInt(replyFee || "0"),
				visibility: { type: visibility, value: undefined },
				unlock_fee: BigInt(unlockFeeInput || "0"),
			});
			const ok = await tracker.submit(tx, account.signer, "Create Post");
			if (ok) {
				setContent("");
				setReplyFee("0");
				setAppId("");
				setUnlockFeeInput("0");
				setVisibility("Public");
				loadPosts();
			}
		} catch {
			setUploading(false);
		}
	}

	async function createReply(parentId: number) {
		if (!account || !replyContent.trim()) return;
		try {
			setUploading(true);
			const cid = await uploadPostContent(replyContent.trim());
			setUploading(false);

			const api = getApi();
			const tx = api.tx.SocialFeeds.create_reply({
				parent_post_id: BigInt(parentId),
				content: Binary.fromText(cid),
				app_id: replyAppId.trim() ? parseInt(replyAppId) : undefined,
			});
			const ok = await tracker.submit(tx, account.signer, "Reply");
			if (ok) {
				setReplyContent("");
				setReplyAppId("");
				setReplyingTo(null);
				loadPosts();
			}
		} catch {
			setUploading(false);
		}
	}

	async function unlockPost(postId: number) {
		if (!account) return;
		const api = getApi();
		const tx = api.tx.SocialFeeds.unlock_post({ post_id: BigInt(postId) });
		const ok = await tracker.submit(tx, account.signer, "Unlock Post");
		if (ok) loadPosts();
	}

	function canSeeContent(post: PostData): boolean {
		if (post.visibility === "Public") return true;
		if (post.author === accountAddress) return true;
		return unlocked.has(post.id);
	}

	const charsLeft = MAX_CHARS - content.length;

	return (
		<RequireProfile>
			<div className="space-y-4">

				{/* Compose */}
				<div className="panel space-y-3">
					<div className="flex items-center gap-3">
						{account && (
							<div className="avatar bg-brand-500 text-xs shrink-0">
								{account.name[0]}
							</div>
						)}
						<div className="flex-1">
							<textarea
								value={content}
								onChange={(e) => {
									if (e.target.value.length <= MAX_CHARS) setContent(e.target.value);
								}}
								placeholder="What's happening?"
								rows={3}
								className="input resize-none w-full"
							/>
							<div className="flex items-center justify-between mt-1">
								<span className={`text-xs ${charsLeft < 50 ? (charsLeft < 0 ? "text-danger" : "text-warning") : "text-surface-500"}`}>
									{charsLeft} characters left
								</span>
							</div>
						</div>
					</div>

					{/* Options row */}
					<div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
						<div>
							<label className="form-label">Visibility</label>
							<select value={visibility} onChange={(e) => setVisibility(e.target.value as Visibility)} className="input">
								<option value="Public">Public</option>
								<option value="Obfuscated">Obfuscated</option>
								<option value="Private">Private</option>
							</select>
						</div>
						<div>
							<label className="form-label">App ID</label>
							<input value={appId} onChange={(e) => setAppId(e.target.value)} placeholder="Optional" className="input" />
						</div>
						<div>
							<label className="form-label">Reply Fee</label>
							<input value={replyFee} onChange={(e) => setReplyFee(e.target.value)} placeholder="0" className="input" />
						</div>
						{visibility !== "Public" && (
							<div>
								<label className="form-label">Unlock Fee</label>
								<input value={unlockFeeInput} onChange={(e) => setUnlockFeeInput(e.target.value)} placeholder="0" className="input" />
							</div>
						)}
					</div>

					<button onClick={createPost} disabled={!content.trim() || !account || busy} className="btn-brand w-full">
						{uploading ? "Uploading to IPFS..." : "Post"}
					</button>
				</div>

				{/* Feed */}
				<div className="space-y-3">
					<div className="flex items-center justify-between">
						<h2 className="heading-2">Feed</h2>
						<button onClick={loadPosts} disabled={loading} className="btn-ghost btn-sm">
							{loading ? "..." : "Refresh"}
						</button>
					</div>

					{posts.length === 0 ? (
						<div className="panel text-center py-8 text-secondary text-sm">No posts yet.</div>
					) : (
						posts.map((post) => {
							const postReplies = replies[post.id] || [];
							const isExpanded = expanded.has(post.id);
							const visible = canSeeContent(post);

							return (
								<div key={post.id} className="panel space-y-3">
									{/* Header */}
									<div className="flex items-center gap-3">
										<AuthorDisplay address={post.author} size="md" />
										<div className="flex-1 min-w-0">
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
											<Link to={`/post/${post.id}`} className="text-[11px] font-mono text-surface-600 hover:text-brand-500 transition-colors">#{post.id}</Link>
										</div>
									</div>

									{/* Content */}
									<div className="pl-[52px]">
										{visible ? (
											<p className="text-sm whitespace-pre-wrap break-words">
												{post.resolvedText ?? <span className="text-surface-500 italic">Loading content...</span>}
											</p>
										) : (
											<div className="rounded-xl bg-surface-800 border border-surface-700 p-4 text-center space-y-2">
												<svg className="w-6 h-6 text-surface-500 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
													<path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
												</svg>
												<p className="text-xs text-secondary">Content is {post.visibility.toLowerCase()}</p>
												<button onClick={() => unlockPost(post.id)} disabled={busy} className="btn-brand btn-sm">
													Unlock for {post.unlockFee.toString()} units
												</button>
												<style>{`html.light .bg-surface-800 { background: #f4f4f5; } html.light .border-surface-700 { border-color: #e4e4e7; }`}</style>
											</div>
										)}
									</div>

									{/* Footer */}
									<div className="flex items-center gap-4 pl-[52px] text-xs">
										<span className="text-surface-500">
											{postReplies.length} {postReplies.length === 1 ? "reply" : "replies"}
										</span>
										{post.replyFee > 0n && (
											<span className="text-surface-500">Reply fee: {post.replyFee.toString()}</span>
										)}
										{postReplies.length > 0 && visible && (
											<button onClick={() => toggle(post.id)} className="text-info hover:underline">
												{isExpanded ? "Hide" : "Show"}
											</button>
										)}
										{account && visible && (
											<button
												onClick={() => setReplyingTo(replyingTo === post.id ? null : post.id)}
												className="text-brand-500 hover:underline"
											>
												Reply
											</button>
										)}
									</div>

									{/* Reply compose */}
									{replyingTo === post.id && (
										<div className="ml-[52px] pl-4 border-l-2 border-brand-500/20 space-y-2">
											<textarea
												value={replyContent}
												onChange={(e) => {
													if (e.target.value.length <= MAX_CHARS) setReplyContent(e.target.value);
												}}
												placeholder="Write a reply..."
												rows={2}
												className="input resize-none w-full"
											/>
											<div className="flex items-center justify-between">
												<span className="text-[10px] text-surface-500">
													{MAX_CHARS - replyContent.length} chars left
												</span>
												<button onClick={() => setConfirmReplyTo(post.id)} disabled={!replyContent.trim() || busy}
													className="btn-brand btn-sm">
													Reply
												</button>
											</div>
										</div>
									)}

									{/* Replies */}
									{isExpanded && visible && postReplies.map((r) => (
										<div key={r.id} className="ml-[52px] pl-4 border-l-2 border-surface-800 py-2 space-y-1">
											<div className="flex items-center gap-2 text-xs">
												<AuthorDisplay address={r.author} size="sm" />
												<span className="text-surface-600 font-mono">#{r.createdAt}</span>
											</div>
											<p className="text-sm whitespace-pre-wrap break-words">
												{r.resolvedText ?? <span className="text-surface-500 italic">Loading...</span>}
											</p>
										</div>
									))}
								</div>
							);
						})
					)}
				</div>

				<ConfirmModal
					open={confirmReplyTo !== null}
					title="Reply Cost"
					confirmLabel={busy ? "Sending..." : "Confirm & Reply"}
					confirmDisabled={busy}
					onCancel={() => setConfirmReplyTo(null)}
					onConfirm={async () => {
						if (confirmReplyTo !== null) {
							const pid = confirmReplyTo;
							setConfirmReplyTo(null);
							await createReply(pid);
						}
					}}
				>
					{(() => {
						const parent = confirmReplyTo !== null ? posts.find((p) => p.id === confirmReplyTo) : null;
						return (
							<div className="space-y-3 text-sm">
								<div className="rounded-xl bg-surface-800 p-3 space-y-2">
									<div className="flex items-center justify-between">
										<span className="text-secondary">Post fee</span>
										<span className="font-mono font-semibold">Post Fee</span>
									</div>
									{parent && parent.replyFee > 0n && (
										<div className="flex items-center justify-between">
											<span className="text-secondary">Reply fee (to author)</span>
											<span className="font-mono font-semibold">{parent.replyFee.toString()}</span>
										</div>
									)}
									{parent && parent.replyFee === 0n && (
										<div className="flex items-center justify-between">
											<span className="text-secondary">Reply fee</span>
											<span className="font-mono text-success">Free</span>
										</div>
									)}
								</div>
								<p className="text-xs text-secondary">Fees are deducted when the reply is submitted.</p>
								<style>{`html.light .bg-surface-800 { background: #f4f4f5; }`}</style>
							</div>
						);
					})()}
				</ConfirmModal>

				<TxToast state={tracker.state} onDismiss={tracker.reset} />
			</div>
		</RequireProfile>
	);
}
