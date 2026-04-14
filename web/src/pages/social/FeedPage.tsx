import { useEffect, useState, useCallback } from "react";
import { Binary } from "polkadot-api";
import { useSocialApi } from "../../hooks/social/useSocialApi";
import { useSelectedAccount } from "../../hooks/social/useSelectedAccount";
import { useTxStatus } from "../../hooks/social/useTxStatus";
import { formatDispatchError } from "../../utils/format";
import AccountSelector from "../../components/social/AccountSelector";
import TxStatusBanner from "../../components/social/TxStatusBanner";
import AddressDisplay from "../../components/social/AddressDisplay";

interface PostData {
	id: number;
	author: string;
	content: string;
	appId: number | null;
	parentPost: number | null;
	replyFee: bigint;
	createdAt: number;
}

export default function FeedPage() {
	const { getApi } = useSocialApi();
	const { account } = useSelectedAccount();
	const tx = useTxStatus();
	const [posts, setPosts] = useState<PostData[]>([]);
	const [replies, setReplies] = useState<Record<number, PostData[]>>({});
	const [expanded, setExpanded] = useState<Set<number>>(new Set());
	const [loading, setLoading] = useState(true);
	const [content, setContent] = useState("");
	const [replyFee, setReplyFee] = useState("0");
	const [appId, setAppId] = useState("");
	const [replyingTo, setReplyingTo] = useState<number | null>(null);
	const [replyContent, setReplyContent] = useState("");
	const [replyAppId, setReplyAppId] = useState("");

	const loadPosts = useCallback(async () => {
		try {
			setLoading(true);
			const api = getApi();
			const entries = await api.query.SocialFeeds.Posts.getEntries();
			const all: PostData[] = entries.map((e) => ({
				id: Number(e.keyArgs[0]),
				author: e.value.author.toString(),
				content: e.value.content.asText(),
				appId: e.value.app_id != null ? Number(e.value.app_id) : null,
				parentPost: e.value.parent_post != null ? Number(e.value.parent_post) : null,
				replyFee: e.value.reply_fee,
				createdAt: Number(e.value.created_at),
			}));
			setPosts(all.filter((p) => p.parentPost === null).sort((a, b) => b.id - a.id));
			const rMap: Record<number, PostData[]> = {};
			for (const p of all) {
				if (p.parentPost !== null) {
					if (!rMap[p.parentPost]) rMap[p.parentPost] = [];
					rMap[p.parentPost].push(p);
				}
			}
			setReplies(rMap);
		} catch {
			setPosts([]);
		} finally {
			setLoading(false);
		}
	// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	useEffect(() => { loadPosts(); }, [loadPosts]);

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
			tx.setStatus("Creating post...");
			const api = getApi();
			const result = await api.tx.SocialFeeds.create_post({
				content: Binary.fromText(content),
				app_id: appId.trim() ? parseInt(appId) : undefined,
				reply_fee: BigInt(replyFee || "0"),
			}).signAndSubmit(account.signer);
			if (!result.ok) { tx.setError(formatDispatchError(result.dispatchError)); return; }
			tx.setSuccess("Post created!");
			setContent(""); setReplyFee("0"); setAppId("");
			loadPosts();
		} catch (e) { tx.setError(e instanceof Error ? e.message : String(e)); }
	}

	async function createReply(parentId: number) {
		if (!account || !replyContent.trim()) return;
		try {
			tx.setStatus("Creating reply...");
			const api = getApi();
			const result = await api.tx.SocialFeeds.create_reply({
				parent_post_id: BigInt(parentId),
				content: Binary.fromText(replyContent),
				app_id: replyAppId.trim() ? parseInt(replyAppId) : undefined,
			}).signAndSubmit(account.signer);
			if (!result.ok) { tx.setError(formatDispatchError(result.dispatchError)); return; }
			tx.setSuccess("Reply created!");
			setReplyContent(""); setReplyAppId(""); setReplyingTo(null);
			loadPosts();
		} catch (e) { tx.setError(e instanceof Error ? e.message : String(e)); }
	}

	return (
		<div className="space-y-4">
			<AccountSelector />
			<TxStatusBanner status={tx.status} isError={tx.isError} />

			{/* Compose */}
			<div className="panel space-y-3">
				<h2 className="heading-2">New Post</h2>
				<input
					type="text"
					value={content}
					onChange={(e) => setContent(e.target.value)}
					placeholder="Content CID (QmYour...)"
					className="input"
				/>
				<div className="grid grid-cols-2 gap-3">
					<div>
						<label className="form-label">App ID</label>
						<input value={appId} onChange={(e) => setAppId(e.target.value)} placeholder="Optional" className="input" />
					</div>
					<div>
						<label className="form-label">Reply Fee</label>
						<input value={replyFee} onChange={(e) => setReplyFee(e.target.value)} placeholder="0" className="input" />
					</div>
				</div>
				<button onClick={createPost} disabled={!content.trim()} className="btn-brand w-full">
					Post
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

						return (
							<div key={post.id} className="panel space-y-3">
								{/* Author line */}
								<div className="flex items-center gap-3">
									<div className="avatar bg-brand-500 text-xs">
										{post.author.slice(2, 4)}
									</div>
									<div className="flex-1 min-w-0">
										<AddressDisplay address={post.author} />
										<p className="text-[11px] text-surface-500 font-mono">
											Block #{post.createdAt}
											{post.appId !== null && <span className="ml-2 text-info">App #{post.appId}</span>}
										</p>
									</div>
									<span className="text-[11px] font-mono text-surface-600">
										#{post.id}
									</span>
								</div>

								{/* Content */}
								<p className="text-sm font-mono break-all pl-[52px]">{post.content}</p>

								{/* Actions */}
								<div className="flex items-center gap-4 pl-[52px] text-xs">
									<span className="text-surface-500">
										Reply fee: {post.replyFee === 0n ? "Free" : post.replyFee.toString()}
									</span>
									{postReplies.length > 0 && (
										<button onClick={() => toggle(post.id)} className="text-info hover:underline">
											{isExpanded ? "Hide" : "Show"} {postReplies.length} {postReplies.length === 1 ? "reply" : "replies"}
										</button>
									)}
									<button
										onClick={() => setReplyingTo(replyingTo === post.id ? null : post.id)}
										className="text-brand-500 hover:underline"
									>
										Reply
									</button>
								</div>

								{/* Reply form */}
								{replyingTo === post.id && (
									<div className="ml-[52px] pl-4 border-l-2 border-brand-500/20 space-y-2">
										<input
											value={replyContent}
											onChange={(e) => setReplyContent(e.target.value)}
											onKeyDown={(e) => e.key === "Enter" && createReply(post.id)}
											placeholder="Reply content CID..."
											className="input"
										/>
										<div className="flex gap-2">
											<input
												value={replyAppId}
												onChange={(e) => setReplyAppId(e.target.value)}
												placeholder="App ID (opt.)"
												className="input flex-1"
											/>
											<button
												onClick={() => createReply(post.id)}
												disabled={!replyContent.trim()}
												className="btn-brand btn-sm"
											>
												Reply
											</button>
										</div>
									</div>
								)}

								{/* Replies */}
								{isExpanded && postReplies.map((r) => (
									<div key={r.id} className="ml-[52px] pl-4 border-l-2 border-surface-800 py-2 space-y-1">
										<div className="flex items-center gap-2 text-xs">
											<AddressDisplay address={r.author} />
											<span className="text-surface-600 font-mono">#{r.createdAt}</span>
											{r.appId !== null && <span className="text-info">App #{r.appId}</span>}
										</div>
										<p className="text-xs font-mono text-surface-400 break-all">{r.content}</p>
									</div>
								))}
							</div>
						);
					})
				)}
			</div>
		</div>
	);
}
