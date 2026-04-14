import { useEffect, useState, useCallback } from "react";
import { useParams, Link } from "react-router-dom";
import { Binary } from "polkadot-api";
import { useSocialApi } from "../../hooks/social/useSocialApi";
import { useSelectedAccount } from "../../hooks/social/useSelectedAccount";
import { useTxTracker } from "../../hooks/social/useTxTracker";
import { useIpfs } from "../../hooks/social/useIpfs";
import AddressDisplay from "../../components/social/AddressDisplay";
import AuthorDisplay from "../../components/social/AuthorDisplay";
import ConfirmModal from "../../components/social/ConfirmModal";
import TxToast from "../../components/social/TxToast";

type Visibility = "Public" | "Obfuscated" | "Private";
const MAX_CHARS = 400;

interface AppMeta {
	name?: string;
	description?: string;
	icon?: string;
	website?: string;
}

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
	const { uploadPostContent, fetchPostContent, fetchProfileMetadata, ipfsUrl } = useIpfs();
	const [app, setApp] = useState<AppData | null>(null);
	const [appMeta, setAppMeta] = useState<AppMeta | null>(null);
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
	const [confirmReplyTo, setConfirmReplyTo] = useState<number | null>(null);

	const [feedTab, setFeedTab] = useState<"all" | "mine">("all");

	const numericId = Number(appId);
	const accountAddress = account?.address ?? null;

	const loadApp = useCallback(async () => {
		try {
			setLoading(true);
			const api = getApi();

			const appData = await api.query.SocialAppRegistry.Apps.getValue(numericId);
			if (appData) {
				const metaCid = appData.metadata.asText();
				setApp({
					id: numericId,
					owner: appData.owner.toString(),
					metadata: metaCid,
					createdAt: Number(appData.created_at),
					status: appData.status.type,
				});

				// Resolve app metadata from IPFS
				fetchProfileMetadata(metaCid).then((meta) => {
					if (meta) setAppMeta(meta as unknown as AppMeta);
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

			// Auto-expand posts that have replies
			setExpanded(new Set(appPosts.filter((p) => (replyCountMap[p.id] || 0) > 0).map((p) => p.id)));

			let unlockedSet = new Set<number>();
			if (accountAddress) {
				const unlockedEntries = await api.query.SocialFeeds.UnlockedPosts.getEntries(accountAddress);
				unlockedSet = new Set(unlockedEntries.map((e) => Number(e.keyArgs[1])));
				setUnlocked(unlockedSet);
			}

			// Resolve content from IPFS in background
			// Public: always. Non-public: if author or unlocked.
			for (const p of appPosts) {
				const shouldResolve =
					p.visibility === "Public" ||
					p.author === accountAddress ||
					unlockedSet.has(p.id);
				if (shouldResolve) {
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
				<div className="flex items-start gap-4">
					{/* Icon */}
					{appMeta?.icon ? (
						<img src={ipfsUrl(appMeta.icon)} alt={appMeta.name || ""} className="w-14 h-14 rounded-xl object-cover bg-surface-800 shrink-0" />
					) : (
						<div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${gradient} flex items-center justify-center text-white text-xl font-bold shrink-0`}>
							{app.id}
						</div>
					)}
					<div className="flex-1 min-w-0">
						<div className="flex items-center gap-2">
							<h1 className="heading-2">{appMeta?.name || `App #${app.id}`}</h1>
							<span className={app.status === "Active" ? "badge-success" : "badge-danger"}>{app.status}</span>
						</div>
						{appMeta?.description && (
							<p className="text-sm text-secondary mt-1">{appMeta.description}</p>
						)}
						<div className="flex items-center gap-3 mt-2 text-xs text-secondary">
							<AddressDisplay address={app.owner} chars={6} />
							<span>·</span>
							<span>{posts.length} posts</span>
							<span>·</span>
							<span className="font-mono">Block #{app.createdAt}</span>
							{appMeta?.website && (
								<>
									<span>·</span>
									<a href={appMeta.website} target="_blank" rel="noopener noreferrer" className="text-brand-500 hover:underline">
										{appMeta.website.replace(/^https?:\/\//, "")}
									</a>
								</>
							)}
						</div>
					</div>
				</div>
				<style>{`html.light .bg-surface-800 { background: #f4f4f5; }`}</style>
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
					const isMine = feedTab === "mine";
					const filtered = isMine && accountAddress
						? posts.filter((p) => p.author === accountAddress)
						: posts.filter((p) => p.visibility !== "Private");

					return filtered.length === 0 ? (
						<div className="panel text-center py-8 text-secondary text-sm">
							{isMine ? "You haven't posted in this app yet." : "No posts in this app yet. Be the first!"}
						</div>
					) : (
						filtered.map((post) => {
						// In "My Posts" tab, author always sees their own content
						const visible = isMine || canSee(post);
						const postReplies = isMine ? [] : (replies[post.id] || []);
						const isExpanded = isMine ? false : expanded.has(post.id);

						return (
							<div key={post.id} className="panel space-y-3">
								{/* Author */}
								<div className="flex items-center gap-3">
									<AuthorDisplay address={post.author} size="md" />
									<div className="flex-1 min-w-0">
										<p className="text-[11px] text-surface-500 font-mono">Block #{post.createdAt}</p>
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
								<div className="flex items-center justify-between pl-[52px] pt-1 border-t border-surface-800/50 mt-2">
									<div className="flex items-center gap-4">
										{/* Reply count with icon */}
										<button
											onClick={() => !isMine && postReplies.length > 0 && visible && toggle(post.id)}
											className={`flex items-center gap-1.5 text-xs transition-colors ${
												!isMine && postReplies.length > 0 && visible
													? "text-surface-400 hover:text-info cursor-pointer"
													: "text-surface-500 cursor-default"
											}`}
										>
											<svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
												<path strokeLinecap="round" strokeLinejoin="round" d="M12 20.25c4.97 0 9-3.694 9-8.25s-4.03-8.25-9-8.25S3 7.444 3 12c0 2.104.859 4.023 2.273 5.48.432.447.74 1.04.586 1.641a4.483 4.483 0 01-.923 1.785A5.969 5.969 0 006 21c1.282 0 2.47-.402 3.445-1.087.81.22 1.668.337 2.555.337z" />
											</svg>
											{post.replyCount}
										</button>

										{/* Reply fee */}
										{!isMine && post.replyFee > 0n && (
											<span className="flex items-center gap-1 text-xs text-surface-500">
												<svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
													<path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
												</svg>
												{post.replyFee.toString()}
											</span>
										)}

										{/* Visibility badge */}
										{post.visibility !== "Public" && post.unlockFee > 0n && (
											<span className="flex items-center gap-1 text-xs text-surface-500">
												<svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
													<path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
												</svg>
												{post.unlockFee.toString()}
											</span>
										)}
									</div>

									{/* Reply button */}
									{!isMine && account && visible && (
										<button
											onClick={() => setReplyingTo(replyingTo === post.id ? null : post.id)}
											className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-brand-500 hover:bg-brand-500/10 transition-colors"
										>
											<svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
												<path strokeLinecap="round" strokeLinejoin="round" d="M9 15L3 9m0 0l6-6M3 9h12a6 6 0 010 12h-3" />
											</svg>
											Reply
										</button>
									)}
								</div>
								<style>{`html.light .border-surface-800\\/50 { border-color: rgba(228,228,231,0.5); }`}</style>

								{/* Reply compose */}
								{replyingTo === post.id && (
									<div className="ml-[52px] pl-4 border-l-2 border-brand-500/20 space-y-2">
										<textarea
											value={replyContent}
											onChange={(e) => { if (e.target.value.length <= MAX_CHARS) setReplyContent(e.target.value); }}
											placeholder="Write a reply..."
											rows={2}
											className="input resize-none w-full"
										/>
										<div className="flex items-center justify-between">
											<span className="text-[10px] text-surface-500">{MAX_CHARS - replyContent.length} chars left</span>
											<button
												onClick={() => setConfirmReplyTo(post.id)}
												disabled={!replyContent.trim() || busy}
												className="btn-brand btn-sm"
											>
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
				);
				})()}
			</div>

			{/* Reply cost confirmation */}
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
					const postFee = "Post fee (to app/treasury)";
					return (
						<div className="space-y-3 text-sm">
							<div className="rounded-xl bg-surface-800 p-3 space-y-2">
								<div className="flex items-center justify-between">
									<span className="text-secondary">{postFee}</span>
									<span className="font-mono font-semibold">Post Fee</span>
								</div>
								{parent && parent.replyFee > 0n && (
									<div className="flex items-center justify-between">
										<span className="text-secondary">Reply fee (to post author)</span>
										<span className="font-mono font-semibold">{parent.replyFee.toString()}</span>
									</div>
								)}
							</div>
							<p className="text-xs text-secondary">
								These fees will be deducted from your balance when the reply is submitted.
							</p>
							<style>{`html.light .bg-surface-800 { background: #f4f4f5; }`}</style>
						</div>
					);
				})()}
			</ConfirmModal>

			<TxToast state={tracker.state} onDismiss={tracker.reset} />
		</div>
	);
}
