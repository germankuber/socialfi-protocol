import { useEffect, useState, useCallback } from "react";
import { useParams, Link } from "react-router-dom";
import { Binary } from "polkadot-api";
import { useSocialApi } from "../../hooks/social/useSocialApi";
import { useSelectedAccount } from "../../hooks/social/useSelectedAccount";
import { useTxTracker } from "../../hooks/social/useTxTracker";
import { useIpfs } from "../../hooks/social/useIpfs";
import AddressDisplay from "../../components/social/AddressDisplay";
import TxToast from "../../components/social/TxToast";

type Visibility = "Public" | "Obfuscated" | "Private";
const MAX_CHARS = 400;

interface AppData {
	id: number;
	owner: string;
	metadata: string;
	createdAt: number;
	status: string;
}

interface PostData {
	id: number;
	author: string;
	contentCid: string;
	resolvedText: string | null;
	replyFee: bigint;
	visibility: Visibility;
	unlockFee: bigint;
	createdAt: number;
	replyCount: number;
}

interface ReplyData {
	id: number;
	author: string;
	contentCid: string;
	resolvedText: string | null;
	createdAt: number;
}

const APP_COLORS = [
	"from-brand-500 to-purple-600",
	"from-blue-500 to-cyan-500",
	"from-emerald-500 to-teal-500",
	"from-orange-500 to-amber-500",
	"from-pink-500 to-rose-500",
	"from-indigo-500 to-violet-500",
];

export default function AppDetailPage() {
	const { appId } = useParams<{ appId: string }>();
	const { getApi } = useSocialApi();
	const { account } = useSelectedAccount();
	const tracker = useTxTracker();
	const { uploadPostContent, fetchPostContent } = useIpfs();
	const [app, setApp] = useState<AppData | null>(null);
	const [posts, setPosts] = useState<PostData[]>([]);
	const [replies, setReplies] = useState<Record<number, ReplyData[]>>({});
	const [unlocked, setUnlocked] = useState<Set<number>>(new Set());
	const [expanded, setExpanded] = useState<Set<number>>(new Set());
	const [loading, setLoading] = useState(true);
	const [uploading, setUploading] = useState(false);

	// Compose
	const [content, setContent] = useState("");
	const [replyFee, setReplyFee] = useState("0");
	const [visibility, setVisibility] = useState<Visibility>("Public");
	const [unlockFeeInput, setUnlockFeeInput] = useState("0");

	// Reply
	const [replyingTo, setReplyingTo] = useState<number | null>(null);
	const [replyContent, setReplyContent] = useState("");

	const [feedTab, setFeedTab] = useState<"all" | "mine">("all");

	const numericId = Number(appId);
	const accountAddress = account?.address ?? null;

	const loadApp = useCallback(async () => {
		try {
			setLoading(true);
			const api = getApi();

			const appData = await api.query.SocialAppRegistry.Apps.getValue(numericId);
			if (appData) {
				setApp({
					id: numericId,
					owner: appData.owner.toString(),
					metadata: appData.metadata.asText(),
					createdAt: Number(appData.created_at),
					status: appData.status.type,
				});
			}

			const allPosts = await api.query.SocialFeeds.Posts.getEntries();
			const allRepliesEntries = await api.query.SocialFeeds.Replies.getEntries();

			const replyCountMap: Record<number, number> = {};
			for (const r of allRepliesEntries) {
				replyCountMap[Number(r.keyArgs[0])] = r.value.length;
			}

			// Build replies map from all posts
			const replyMap: Record<number, ReplyData[]> = {};
			for (const e of allPosts) {
				const parentPost = e.value.parent_post;
				if (parentPost != null) {
					const pid = Number(parentPost);
					if (!replyMap[pid]) replyMap[pid] = [];
					replyMap[pid].push({
						id: Number(e.keyArgs[0]),
						author: e.value.author.toString(),
						contentCid: e.value.content.asText(),
						resolvedText: null,
						createdAt: Number(e.value.created_at),
					});
				}
			}

			// Keep ALL posts including Private — we filter in the UI per tab
			const appPosts = allPosts
				.filter((e) => e.value.app_id != null && Number(e.value.app_id) === numericId)
				.filter((e) => e.value.parent_post == null)
				.map((e) => ({
					id: Number(e.keyArgs[0]),
					author: e.value.author.toString(),
					contentCid: e.value.content.asText(),
					resolvedText: null,
					replyFee: e.value.reply_fee,
					visibility: (e.value.visibility as { type: Visibility }).type,
					unlockFee: e.value.unlock_fee,
					createdAt: Number(e.value.created_at),
					replyCount: replyCountMap[Number(e.keyArgs[0])] || 0,
				}))
				.sort((a, b) => b.id - a.id);
			setPosts(appPosts);
			setReplies(replyMap);

			if (accountAddress) {
				const unlockedEntries = await api.query.SocialFeeds.UnlockedPosts.getEntries(accountAddress);
				setUnlocked(new Set(unlockedEntries.map((e) => Number(e.keyArgs[1]))));
			}

			// Resolve content from IPFS in background
			for (const p of appPosts) {
				if (p.visibility === "Public") {
					fetchPostContent(p.contentCid).then((text) => {
						if (text) setPosts((prev) => prev.map((pp) => pp.id === p.id ? { ...pp, resolvedText: text } : pp));
					});
				}
			}
			for (const pid of Object.keys(replyMap)) {
				for (const r of replyMap[Number(pid)]) {
					fetchPostContent(r.contentCid).then((text) => {
						if (text) setReplies((prev) => ({
							...prev,
							[Number(pid)]: (prev[Number(pid)] || []).map((rr) => rr.id === r.id ? { ...rr, resolvedText: text } : rr),
						}));
					});
				}
			}
		} catch {
			setApp(null);
		} finally {
			setLoading(false);
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [numericId, accountAddress]);

	useEffect(() => { loadApp(); }, [loadApp]);

	const busy = uploading || tracker.state.stage === "signing" || tracker.state.stage === "broadcasting" || tracker.state.stage === "in_block";

	function toggle(id: number) {
		setExpanded((prev) => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
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
				app_id: numericId,
				reply_fee: BigInt(replyFee || "0"),
				visibility: { type: visibility, value: undefined },
				unlock_fee: BigInt(unlockFeeInput || "0"),
			});
			const ok = await tracker.submit(tx, account.signer, "Create Post");
			if (ok) { setContent(""); setReplyFee("0"); setUnlockFeeInput("0"); setVisibility("Public"); loadApp(); }
		} catch { setUploading(false); }
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
				app_id: numericId,
			});
			const ok = await tracker.submit(tx, account.signer, "Reply");
			if (ok) { setReplyContent(""); setReplyingTo(null); loadApp(); }
		} catch { setUploading(false); }
	}

	async function unlockPost(postId: number) {
		if (!account) return;
		const api = getApi();
		const tx = api.tx.SocialFeeds.unlock_post({ post_id: BigInt(postId) });
		const ok = await tracker.submit(tx, account.signer, "Unlock Post");
		if (ok) loadApp();
	}

	function canSee(post: PostData): boolean {
		if (post.visibility === "Public") return true;
		if (post.author === accountAddress) return true;
		return unlocked.has(post.id);
	}

	if (loading) {
		return (
			<div className="flex items-center justify-center py-16">
				<div className="w-6 h-6 border-2 border-surface-600 border-t-brand-500 rounded-full animate-spin" />
			</div>
		);
	}

	if (!app) {
		return (
			<div className="panel text-center py-12 space-y-3">
				<p className="text-danger font-semibold">App #{appId} not found</p>
				<Link to="/social" className="btn-outline btn-sm inline-flex">Back</Link>
			</div>
		);
	}

	const gradient = APP_COLORS[app.id % APP_COLORS.length];
	const charsLeft = MAX_CHARS - content.length;

	return (
		<div className="space-y-4 animate-fade-in">
			{/* App header */}
			<div className="panel">
				<Link to="/" className="inline-flex items-center gap-1 text-xs text-secondary hover:text-surface-100 transition-colors mb-3">
					<svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
						<path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
					</svg>
					Back
				</Link>
				<div className="flex items-center gap-4">
					<div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${gradient} flex items-center justify-center text-white text-lg font-bold shrink-0`}>
						{app.id}
					</div>
					<div className="flex-1 min-w-0">
						<div className="flex items-center gap-2">
							<h1 className="heading-2">App #{app.id}</h1>
							<span className={app.status === "Active" ? "badge-success" : "badge-danger"}>{app.status}</span>
						</div>
						<div className="flex items-center gap-3 mt-1 text-xs text-secondary">
							<span className="font-mono truncate" title={app.metadata}>{app.metadata}</span>
							<span>·</span>
							<AddressDisplay address={app.owner} chars={6} />
							<span>·</span>
							<span>{posts.length} posts</span>
						</div>
					</div>
				</div>
			</div>

			{/* Compose — app_id is automatic */}
			{account && (
				<div className="panel space-y-3">
					<div className="flex items-center gap-3">
						<div className="avatar bg-brand-500 text-xs shrink-0">{account.name[0]}</div>
						<div className="flex-1">
							<textarea
								value={content}
								onChange={(e) => { if (e.target.value.length <= MAX_CHARS) setContent(e.target.value); }}
								placeholder={`Post in App #${app.id}...`}
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
					<div className="grid grid-cols-3 gap-3">
						<div>
							<label className="form-label">Visibility</label>
							<select value={visibility} onChange={(e) => setVisibility(e.target.value as Visibility)} className="input">
								<option value="Public">Public</option>
								<option value="Obfuscated">Obfuscated</option>
								<option value="Private">Private</option>
							</select>
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
					<button onClick={createPost} disabled={!content.trim() || busy} className="btn-brand w-full">
						{uploading ? "Uploading to IPFS..." : "Post"}
					</button>
				</div>
			)}

			{/* Feed tabs + list */}
			<div className="space-y-3">
				<div className="flex items-center justify-between border-b border-surface-800">
					<div className="flex">
						<button
							onClick={() => setFeedTab("all")}
							className={`relative px-4 py-2.5 text-sm font-medium transition-colors ${
								feedTab === "all" ? "text-brand-500" : "text-surface-500 hover:text-surface-200"
							}`}
						>
							All Posts
							{feedTab === "all" && <span className="absolute bottom-0 inset-x-2 h-0.5 bg-brand-500 rounded-t-full" />}
						</button>
						{account && (
							<button
								onClick={() => setFeedTab("mine")}
								className={`relative px-4 py-2.5 text-sm font-medium transition-colors ${
									feedTab === "mine" ? "text-brand-500" : "text-surface-500 hover:text-surface-200"
								}`}
							>
								My Posts
								{feedTab === "mine" && <span className="absolute bottom-0 inset-x-2 h-0.5 bg-brand-500 rounded-t-full" />}
							</button>
						)}
					</div>
					<button onClick={loadApp} disabled={loading} className="btn-ghost btn-sm">Refresh</button>
				</div>
				<style>{`html.light .border-surface-800 { border-color: #e4e4e7; }`}</style>

				{(() => {
					const filtered = feedTab === "mine" && accountAddress
						? posts.filter((p) => p.author === accountAddress)
						: posts;

					return filtered.length === 0 ? (
						<div className="panel text-center py-8 text-secondary text-sm">
							{feedTab === "mine" ? "You haven't posted in this app yet." : "No posts in this app yet. Be the first!"}
						</div>
					) : (
						filtered.map((post) => {
						const visible = canSee(post);
						const postReplies = replies[post.id] || [];
						const isExpanded = expanded.has(post.id);

						return (
							<div key={post.id} className="panel space-y-3">
								{/* Author */}
								<div className="flex items-center gap-3">
									<div className="avatar bg-brand-500 text-xs">{post.author.slice(2, 4)}</div>
									<div className="flex-1 min-w-0">
										<AddressDisplay address={post.author} />
										<p className="text-[11px] text-surface-500 font-mono">Block #{post.createdAt}</p>
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
											{account && (
												<button onClick={() => unlockPost(post.id)} disabled={busy} className="btn-brand btn-sm">
													Unlock for {post.unlockFee.toString()} units
												</button>
											)}
											<style>{`html.light .bg-surface-800 { background: #f4f4f5; } html.light .border-surface-700 { border-color: #e4e4e7; }`}</style>
										</div>
									)}
								</div>

								{/* Footer */}
								<div className="flex items-center gap-4 pl-[52px] text-xs">
									<span className="text-surface-500">{post.replyCount} {post.replyCount === 1 ? "reply" : "replies"}</span>
									{post.replyFee > 0n && <span className="text-surface-500">Reply fee: {post.replyFee.toString()}</span>}
									{postReplies.length > 0 && visible && (
										<button onClick={() => toggle(post.id)} className="text-info hover:underline">
											{isExpanded ? "Hide" : "Show"}
										</button>
									)}
									{account && visible && (
										<button onClick={() => setReplyingTo(replyingTo === post.id ? null : post.id)} className="text-brand-500 hover:underline">
											Reply
										</button>
									)}
								</div>

								{/* Reply compose */}
								{replyingTo === post.id && (
									<div className="ml-[52px] pl-4 border-l-2 border-brand-500/20 space-y-2">
										<textarea
											value={replyContent}
											onChange={(e) => { if (e.target.value.length <= MAX_CHARS) setReplyContent(e.target.value); }}
											onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); createReply(post.id); } }}
											placeholder="Write a reply..."
											rows={2}
											className="input resize-none w-full"
										/>
										<div className="flex items-center justify-between">
											<span className="text-[10px] text-surface-500">{MAX_CHARS - replyContent.length} chars left</span>
											<button onClick={() => createReply(post.id)} disabled={!replyContent.trim() || busy} className="btn-brand btn-sm">
												{uploading ? "..." : "Reply"}
											</button>
										</div>
									</div>
								)}

								{/* Replies */}
								{isExpanded && visible && postReplies.map((r) => (
									<div key={r.id} className="ml-[52px] pl-4 border-l-2 border-surface-800 py-2 space-y-1">
										<div className="flex items-center gap-2 text-xs">
											<AddressDisplay address={r.author} />
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
				);
				})()}
			</div>

			<TxToast state={tracker.state} onDismiss={tracker.reset} />
		</div>
	);
}
