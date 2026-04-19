import { useEffect, useMemo, useState, useCallback } from "react";
import { useParams, Link } from "react-router-dom";
import { Binary } from "polkadot-api";
import { useSocialApi } from "../../hooks/social/useSocialApi";
import { useSelectedAccount } from "../../hooks/social/useSelectedAccount";
import { useTxTracker } from "../../hooks/social/useTxTracker";
import { useIpfs } from "../../hooks/social/useIpfs";
import { useActingAs } from "../../hooks/social/useManagers";
import { useProfileCache } from "../../hooks/social/useProfileCache";
import { useSponsorship } from "../../hooks/social/useSponsorship";
import AddressDisplay from "../../components/social/AddressDisplay";
import AuthorDisplay from "../../components/social/AuthorDisplay";
import ConfirmModal from "../../components/social/ConfirmModal";
import TxToast from "../../components/social/TxToast";
import VerifiedBadge from "../../components/social/VerifiedBadge";

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
	hasImages: boolean;
	createdAt: number;
	status: string;
}

interface PostData {
	id: number;
	author: string;
	contentCid: string;
	resolvedText: string | null;
	resolvedImage: string | null;
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
	const { uploadImage, uploadPostContent, fetchPostContent, fetchProfileMetadata, ipfsUrl } = useIpfs();
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
	const [postImageCid, setPostImageCid] = useState("");
	const [uploadingImage, setUploadingImage] = useState(false);

	// Reply
	const [replyingTo, setReplyingTo] = useState<number | null>(null);
	const [replyContent, setReplyContent] = useState("");
	const [confirmReplyTo, setConfirmReplyTo] = useState<number | null>(null);

	const [feedTab, setFeedTab] = useState<"all" | "mine">("all");

	// "Act as" state. When `postingAs` is non-null, every write in this page
	// (create_post, create_reply, …) is routed through
	// `pallet-social-managers::act_as_manager` so the runtime attributes the
	// action to the owner, not to the signer.
	const [postingAs, setPostingAs] = useState<string | null>(null);
	const [pickerOpen, setPickerOpen] = useState(false);
	const { authorizations, actAs } = useActingAs(account?.address ?? null);

	// Sponsorship: informational only. Fee redirection happens inside
	// the ChargeSponsored TransactionExtension if the signer has a
	// sponsor with a funded pot — the UI mirrors that state so the user
	// knows whether their next post will be gasless.
	const sponsorshipInfo = useSponsorship(account?.address ?? null);

	const numericId = Number(appId);
	const accountAddress = account?.address ?? null;

	// Available scopes, computed once per change of posting target so the UI
	// can disable buttons whose required scope is missing.
	const activeScopes = useMemo(() => {
		if (!postingAs) return null; // self — unrestricted
		const auth = authorizations.find((a) => a.owner === postingAs);
		return auth?.scopes ?? [];
	}, [postingAs, authorizations]);

	const canPost = activeScopes === null || activeScopes.includes("Post");
	const canComment = activeScopes === null || activeScopes.includes("Comment");

	// Drop the "act as" selection if the chosen authorization disappears.
	useEffect(() => {
		if (!postingAs) return;
		if (!authorizations.some((a) => a.owner === postingAs)) setPostingAs(null);
	}, [authorizations, postingAs]);

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
					hasImages: !!appData.has_images,
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
					resolvedImage: null,
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
					fetchPostContent(p.contentCid).then((result) => {
						if (result) setPosts((prev) => prev.map((pp) => pp.id === p.id ? { ...pp, resolvedText: result.text, resolvedImage: result.image ? ipfsUrl(result.image) : null } : pp));
					});
				}
			}
			for (const pid of Object.keys(replyMap)) {
				for (const r of replyMap[Number(pid)]) {
					fetchPostContent(r.contentCid).then((result) => {
						if (result) setReplies((prev) => ({
							...prev,
							[Number(pid)]: (prev[Number(pid)] || []).map((rr) => rr.id === r.id ? { ...rr, resolvedText: result.text } : rr),
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
			const cid = await uploadPostContent(content.trim(), postImageCid || undefined);
			setUploading(false);
			const api = getApi();
			const innerTx = api.tx.SocialFeeds.create_post({
				content: Binary.fromText(cid),
				app_id: numericId,
				reply_fee: BigInt(replyFee || "0"),
				visibility: { type: visibility, value: undefined },
				unlock_fee: BigInt(unlockFeeInput || "0"),
			});
			const ok = postingAs
				? await actAs(postingAs, innerTx, account.signer, "Post (as manager)")
				: await tracker.submit(innerTx, account.signer, "Create Post");
			if (ok) { setContent(""); setReplyFee("0"); setUnlockFeeInput("0"); setVisibility("Public"); setPostImageCid(""); loadApp(); }
		} catch { setUploading(false); }
	}

	async function createReply(parentId: number) {
		if (!account || !replyContent.trim()) return;
		try {
			setUploading(true);
			const cid = await uploadPostContent(replyContent.trim());
			setUploading(false);
			const api = getApi();
			const innerTx = api.tx.SocialFeeds.create_reply({
				parent_post_id: BigInt(parentId),
				content: Binary.fromText(cid),
				app_id: numericId,
			});
			const ok = postingAs
				? await actAs(postingAs, innerTx, account.signer, "Reply (as manager)")
				: await tracker.submit(innerTx, account.signer, "Reply");
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

	const actingAsAuth = postingAs
		? authorizations.find((a) => a.owner === postingAs) ?? null
		: null;

	return (
		<div
			className={`space-y-4 animate-fade-in relative ${
				postingAs ? "act-as-mode" : ""
			}`}
		>
			{/* Subtle brand-tinted overlay while acting as someone else — the
			    visual cue that every action on this page is attributed to
			    another identity. */}
			{postingAs && (
				<>
					<div className="fixed inset-0 pointer-events-none z-0 bg-gradient-to-b from-brand-500/[0.06] via-transparent to-transparent" />
					<div className="fixed top-14 inset-x-0 h-0.5 bg-brand-500/60 z-40" />
				</>
			)}

			{postingAs && actingAsAuth && (
				<ActingAsBanner
					owner={postingAs}
					scopes={actingAsAuth.scopes}
					onExit={() => setPostingAs(null)}
				/>
			)}

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
				<div className={`panel space-y-3 ${postingAs ? "ring-1 ring-brand-500/40" : ""}`}>
					{/* "Act as" entry point — surfaces the feature only when it
					    is available (the wallet has at least one authorization)
					    so first-time users aren't distracted by it. */}
					{authorizations.length > 0 && !postingAs && (
						<button
							type="button"
							onClick={() => setPickerOpen(true)}
							className="w-full flex items-center gap-2 rounded-xl border border-dashed border-surface-700 hover:border-brand-500/50 px-3 py-2 text-xs text-surface-400 hover:text-brand-500 transition-colors"
						>
							<svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.7}>
								<path strokeLinecap="round" strokeLinejoin="round" d="M15 7a3 3 0 11-6 0 3 3 0 016 0zM7.835 11.442a3 3 0 004.33 0M20 19l-2-2m0 0l-2-2m2 2l-2 2m2-2l2-2" />
							</svg>
							Act as someone who authorized you ({authorizations.length})
						</button>
					)}

					{pickerOpen && (
						<ActAsPicker
							authorizations={authorizations}
							current={postingAs}
							onPick={(owner) => { setPostingAs(owner); setPickerOpen(false); }}
							onClose={() => setPickerOpen(false)}
						/>
					)}

					{/* Sponsorship status pill. Fee redirection is automatic when
					    the signer has a sponsor whose pot holds enough to cover
					    the fee — handled entirely by the ChargeSponsored
					    TransactionExtension in the runtime pipeline. */}
					{!postingAs && sponsorshipInfo.mySponsor && (
						<SponsoredByPill
							sponsor={sponsorshipInfo.mySponsor}
							potBalance={sponsorshipInfo.mySponsorPot}
						/>
					)}

					<div className="flex items-center gap-3">
						<ComposerAvatar postingAs={postingAs} fallbackName={account.name} />
						<div className="flex-1">
							<textarea
								value={content}
								onChange={(e) => { if (e.target.value.length <= MAX_CHARS) setContent(e.target.value); }}
								placeholder={
									postingAs
										? `Post in App #${app.id} as someone else…`
										: `Post in App #${app.id}...`
								}
								rows={3}
								className="input resize-none w-full"
								disabled={!canPost}
							/>
							<div className="flex items-center justify-between mt-1">
								<span className={`text-xs ${charsLeft < 50 ? (charsLeft < 0 ? "text-danger" : "text-warning") : "text-surface-500"}`}>
									{charsLeft} characters left
								</span>
							</div>
						</div>
					</div>
					{/* Image upload for image apps — mandatory */}
					{app.hasImages && (
						<div className="space-y-3">
							{postImageCid ? (
								<div className="relative">
									<img src={ipfsUrl(postImageCid)} alt="" className="w-full rounded-xl object-cover max-h-80 bg-surface-800" />
									<button
										type="button"
										onClick={() => setPostImageCid("")}
										className="absolute top-2 right-2 w-8 h-8 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-black/80 transition-colors"
									>
										<svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
											<path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
										</svg>
									</button>
								</div>
							) : (
								<label htmlFor="post-img" className="block cursor-pointer">
									<div className="border-2 border-dashed border-surface-700 rounded-xl p-8 text-center hover:border-brand-500/50 transition-colors">
										<svg className="w-10 h-10 text-surface-500 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
											<path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3.75 21h16.5a2.25 2.25 0 002.25-2.25V5.25a2.25 2.25 0 00-2.25-2.25H3.75A2.25 2.25 0 001.5 5.25v13.5A2.25 2.25 0 003.75 21z" />
										</svg>
										<p className="text-sm text-secondary mt-2">
											{uploadingImage ? "Uploading to IPFS..." : "Click to upload an image"}
										</p>
										<p className="text-[10px] text-surface-500 mt-1">Required for this app</p>
									</div>
								</label>
							)}
							<input type="file" accept="image/*" id="post-img" className="hidden" onChange={async (e) => {
								const file = e.target.files?.[0]; if (!file) return;
								setUploadingImage(true);
								try { setPostImageCid(await uploadImage(file)); } catch { /* */ }
								finally { setUploadingImage(false); e.target.value = ""; }
							}} />
							<style>{`html.light .bg-surface-800 { background: #f4f4f5; } html.light .border-surface-700 { border-color: #e4e4e7; }`}</style>
						</div>
					)}
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
					<button
						onClick={createPost}
						disabled={!content.trim() || busy || (app.hasImages && !postImageCid) || !canPost}
						className="btn-brand w-full"
					>
						{!canPost
							? "Post scope not granted for this owner"
							: uploading
								? "Uploading to IPFS..."
								: postingAs
									? "Publish (as manager)"
									: sponsorshipInfo.mySponsor && sponsorshipInfo.mySponsorPot > 0n
										? "Post (sponsored)"
										: "Post"}
					</button>
				</div>
			)}

			{/* Feed tabs + list */}
			<div className="space-y-3">
				<div className="flex items-center justify-between border-b border-surface-800">
					<div className="flex">
						<button
							onClick={() => setFeedTab("all")}
							className={`relative px-4 py-2.5 text-sm font-medium transition-colors ${feedTab === "all" ? "text-brand-500" : "text-surface-500 hover:text-surface-200"
								}`}
						>
							All Posts
							{feedTab === "all" && <span className="absolute bottom-0 inset-x-2 h-0.5 bg-brand-500 rounded-t-full" />}
						</button>
						{account && (
							<button
								onClick={() => setFeedTab("mine")}
								className={`relative px-4 py-2.5 text-sm font-medium transition-colors ${feedTab === "mine" ? "text-brand-500" : "text-surface-500 hover:text-surface-200"
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
									<div className={app.hasImages ? "" : "pl-[52px]"}>
										{visible ? (
											<div className="space-y-2">
												{post.resolvedImage && (
													<img src={post.resolvedImage} alt="" className="w-full rounded-xl object-cover max-h-96" />
												)}
												{post.resolvedText ? (
													<p className="text-sm whitespace-pre-wrap break-words">{post.resolvedText}</p>
												) : (
													<span className="text-surface-500 italic text-sm">Loading content...</span>
												)}
											</div>
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
												className={`flex items-center gap-1.5 text-xs transition-colors ${!isMine && postReplies.length > 0 && visible
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
										{!isMine && account && visible && canComment && (
											<button
												onClick={() => setReplyingTo(replyingTo === post.id ? null : post.id)}
												className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-brand-500 hover:bg-brand-500/10 transition-colors"
											>
												<svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
													<path strokeLinecap="round" strokeLinejoin="round" d="M9 15L3 9m0 0l6-6M3 9h12a6 6 0 010 12h-3" />
												</svg>
												Reply{postingAs ? " (as manager)" : ""}
											</button>
										)}
										{!isMine && account && visible && !canComment && postingAs && (
											<span className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-surface-500 italic">
												Reply not authorized for this owner
											</span>
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

/* ── Act-as subcomponents ───────────────────────────────────────────── */

/**
 * Sticky banner shown above the app header while a manager is posting on
 * behalf of another profile. Visually it picks up the brand color so the
 * rest of the page's tinted state reads as intentional.
 */
function ActingAsBanner({
	owner,
	scopes,
	onExit,
}: {
	owner: string;
	scopes: string[];
	onExit: () => void;
}) {
	const { getProfile } = useProfileCache();
	const profile = getProfile(owner);
	const truncated = `${owner.slice(0, 6)}…${owner.slice(-4)}`;

	return (
		<div className="sticky top-16 z-30 rounded-2xl border border-brand-500/40 bg-brand-500/10 backdrop-blur-xl p-3 flex items-center gap-3 shadow-sm">
			<div className="relative shrink-0">
				{profile?.avatar ? (
					<img
						src={profile.avatar}
						alt={profile.name}
						className="w-10 h-10 rounded-full object-cover bg-surface-800"
					/>
				) : (
					<div className="w-10 h-10 rounded-full bg-brand-500/20 flex items-center justify-center text-brand-500 text-xs font-bold">
						{profile?.name?.[0]?.toUpperCase() || owner.slice(2, 4)}
					</div>
				)}
				<span className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-brand-500 border-2 border-surface-950 flex items-center justify-center">
					<svg className="w-2 h-2 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
						<path strokeLinecap="round" strokeLinejoin="round" d="M15 7a3 3 0 11-6 0 3 3 0 016 0zM7 21a5 5 0 015-5h0a5 5 0 015 5" />
					</svg>
				</span>
			</div>
			<div className="flex-1 min-w-0">
				<div className="flex items-center gap-1.5">
					<span className="text-[11px] uppercase tracking-wider font-semibold text-brand-500">
						Acting as
					</span>
					<span className="text-sm font-semibold truncate">
						{profile?.name || truncated}
					</span>
					{profile?.verified && <VerifiedBadge size="sm" />}
				</div>
				<div className="flex flex-wrap gap-1 mt-1">
					{scopes.map((s) => (
						<span
							key={s}
							className="inline-flex items-center rounded-md bg-brand-500/15 text-brand-500 px-1.5 py-0.5 text-[10px] font-semibold"
						>
							{s}
						</span>
					))}
				</div>
			</div>
			<button
				onClick={onExit}
				className="shrink-0 px-3 py-1.5 rounded-lg text-xs font-semibold border border-brand-500/40 text-brand-500 hover:bg-brand-500/20 transition-colors"
			>
				Exit
			</button>
		</div>
	);
}

/**
 * Small avatar rendered next to the composer input. Mirrors the current
 * posting identity: the connected wallet's initial by default, or the owner's
 * avatar/initials while acting as someone else. Makes the attribution
 * unmistakable before the user types a single character.
 */
function ComposerAvatar({
	postingAs,
	fallbackName,
}: {
	postingAs: string | null;
	fallbackName: string;
}) {
	const { getProfile } = useProfileCache();
	const profile = postingAs ? getProfile(postingAs) : null;

	if (postingAs) {
		return profile?.avatar ? (
			<img
				src={profile.avatar}
				alt={profile.name}
				className="w-10 h-10 rounded-full object-cover ring-2 ring-brand-500 bg-surface-800 shrink-0"
			/>
		) : (
			<div className="w-10 h-10 rounded-full bg-brand-500 ring-2 ring-brand-300 flex items-center justify-center text-xs font-bold text-white shrink-0">
				{profile?.name?.[0]?.toUpperCase() || postingAs.slice(2, 4)}
			</div>
		);
	}

	return (
		<div className="avatar bg-brand-500 text-xs shrink-0">
			{fallbackName[0]}
		</div>
	);
}

/**
 * Inline picker that lists the owners who authorized the current wallet as a
 * manager. Scopes are surfaced so the user understands which actions they
 * will gain by selecting that identity.
 */
function ActAsPicker({
	authorizations,
	current,
	onPick,
	onClose,
}: {
	authorizations: { owner: string; scopes: string[] }[];
	current: string | null;
	onPick: (owner: string) => void;
	onClose: () => void;
}) {
	return (
		<div className="rounded-xl border border-brand-500/30 bg-brand-500/5 p-3 space-y-2">
			<div className="flex items-center justify-between">
				<span className="text-[11px] uppercase tracking-wider font-semibold text-brand-500">
					Pick whose identity to post under
				</span>
				<button
					onClick={onClose}
					className="text-[11px] text-surface-400 hover:text-surface-100"
				>
					Close
				</button>
			</div>
			<div className="space-y-1.5 max-h-72 overflow-y-auto">
				{authorizations.map((a) => (
					<ActAsOption
						key={a.owner}
						owner={a.owner}
						scopes={a.scopes}
						selected={a.owner === current}
						onClick={() => onPick(a.owner)}
					/>
				))}
			</div>
		</div>
	);
}

function ActAsOption({
	owner,
	scopes,
	selected,
	onClick,
}: {
	owner: string;
	scopes: string[];
	selected: boolean;
	onClick: () => void;
}) {
	const { getProfile } = useProfileCache();
	const profile = getProfile(owner);
	const truncated = `${owner.slice(0, 6)}…${owner.slice(-4)}`;

	return (
		<button
			type="button"
			onClick={onClick}
			className={`w-full text-left flex items-center gap-3 px-3 py-2 rounded-lg border transition-colors ${
				selected
					? "border-brand-500/60 bg-brand-500/10"
					: "border-transparent hover:border-brand-500/30 hover:bg-brand-500/5"
			}`}
		>
			{profile?.avatar ? (
				<img
					src={profile.avatar}
					alt={profile.name}
					className="w-8 h-8 rounded-full object-cover bg-surface-800 shrink-0"
				/>
			) : (
				<div className="w-8 h-8 rounded-full bg-brand-500/20 flex items-center justify-center text-brand-500 text-[10px] font-bold shrink-0">
					{profile?.name?.[0]?.toUpperCase() || owner.slice(2, 4)}
				</div>
			)}
			<div className="flex-1 min-w-0">
				<div className="flex items-center gap-1.5">
					<span className="text-sm font-medium truncate">
						{profile?.name || truncated}
					</span>
					{profile?.verified && <VerifiedBadge size="sm" />}
				</div>
				<div className="flex flex-wrap gap-1 mt-0.5">
					{scopes.map((s) => (
						<span
							key={s}
							className="inline-flex items-center rounded-md bg-brand-500/10 text-brand-500 px-1.5 py-0.5 text-[9px] font-semibold"
						>
							{s}
						</span>
					))}
				</div>
			</div>
		</button>
	);
}

/**
 * Inline pill shown above the composer when the connected account has an
 * active sponsor. Pulls the sponsor's profile so the beneficiary sees who
 * is covering their fees, not just an address.
 */
function SponsoredByPill({
	sponsor,
	potBalance,
}: {
	sponsor: string;
	potBalance: bigint;
}) {
	const { getProfile } = useProfileCache();
	const profile = getProfile(sponsor);
	const truncated = `${sponsor.slice(0, 6)}…${sponsor.slice(-4)}`;
	const potEmpty = potBalance === 0n;

	return (
		<div
			className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-[11px] ${
				potEmpty
					? "border-warning/30 bg-warning/5 text-warning"
					: "border-brand-500/30 bg-brand-500/10 text-brand-500"
			}`}
			title={sponsor}
		>
			<svg
				className="w-3.5 h-3.5 shrink-0"
				fill="none"
				viewBox="0 0 24 24"
				stroke="currentColor"
				strokeWidth={2}
			>
				<path
					strokeLinecap="round"
					strokeLinejoin="round"
					d="M13 10V3L4 14h7v7l9-11h-7z"
				/>
			</svg>
			{profile?.avatar ? (
				<img
					src={profile.avatar}
					alt={profile.name}
					className="w-4 h-4 rounded-full object-cover bg-surface-800 shrink-0"
				/>
			) : null}
			<span className="flex-1 truncate">
				{potEmpty
					? `${profile?.name || truncated}'s pot is empty — you'll pay this fee.`
					: `Sponsored by ${profile?.name || truncated}`}
			</span>
			<span className="font-mono shrink-0">
				{(Number(potBalance) / 1e9).toFixed(2)} UNIT
			</span>
		</div>
	);
}
