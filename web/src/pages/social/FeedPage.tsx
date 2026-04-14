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
	const [expandedPosts, setExpandedPosts] = useState<Set<number>>(new Set());
	const [loading, setLoading] = useState(true);
	const [contentInput, setContentInput] = useState("");
	const [replyFeeInput, setReplyFeeInput] = useState("0");
	const [appIdInput, setAppIdInput] = useState("");
	const [replyingTo, setReplyingTo] = useState<number | null>(null);
	const [replyContentInput, setReplyContentInput] = useState("");
	const [replyAppIdInput, setReplyAppIdInput] = useState("");

	const loadPosts = useCallback(async () => {
		try {
			setLoading(true);
			const api = getApi();
			const entries = await api.query.SocialFeeds.Posts.getEntries();
			const allPosts: PostData[] = entries.map((entry) => ({
				id: Number(entry.keyArgs[0]),
				author: entry.value.author.toString(),
				content: entry.value.content.asText(),
				appId: entry.value.app_id != null ? Number(entry.value.app_id) : null,
				parentPost: entry.value.parent_post != null ? Number(entry.value.parent_post) : null,
				replyFee: entry.value.reply_fee,
				createdAt: Number(entry.value.created_at),
			}));

			const originals = allPosts
				.filter((p) => p.parentPost === null)
				.sort((a, b) => b.id - a.id);
			setPosts(originals);

			const replyMap: Record<number, PostData[]> = {};
			for (const p of allPosts) {
				if (p.parentPost !== null) {
					if (!replyMap[p.parentPost]) replyMap[p.parentPost] = [];
					replyMap[p.parentPost].push(p);
				}
			}
			setReplies(replyMap);
		} catch {
			setPosts([]);
			setReplies({});
		} finally {
			setLoading(false);
		}
	}, [getApi]);

	useEffect(() => {
		loadPosts();
	}, [loadPosts]);

	function toggleReplies(postId: number) {
		setExpandedPosts((prev) => {
			const next = new Set(prev);
			if (next.has(postId)) next.delete(postId);
			else next.add(postId);
			return next;
		});
	}

	async function createPost() {
		if (!contentInput.trim()) return;
		try {
			tx.setStatus("Submitting create_post...");
			const api = getApi();
			const appId = appIdInput.trim() ? parseInt(appIdInput) : undefined;
			const result = await api.tx.SocialFeeds.create_post({
				content: Binary.fromText(contentInput),
				app_id: appId,
				reply_fee: BigInt(replyFeeInput || "0"),
			}).signAndSubmit(account.signer);
			if (!result.ok) {
				tx.setError(formatDispatchError(result.dispatchError));
				return;
			}
			tx.setSuccess("Post created!");
			setContentInput("");
			setReplyFeeInput("0");
			setAppIdInput("");
			loadPosts();
		} catch (e) {
			tx.setError(e instanceof Error ? e.message : String(e));
		}
	}

	async function createReply(parentPostId: number) {
		if (!replyContentInput.trim()) return;
		try {
			tx.setStatus("Submitting create_reply...");
			const api = getApi();
			const appId = replyAppIdInput.trim() ? parseInt(replyAppIdInput) : undefined;
			const result = await api.tx.SocialFeeds.create_reply({
				parent_post_id: BigInt(parentPostId),
				content: Binary.fromText(replyContentInput),
				app_id: appId,
			}).signAndSubmit(account.signer);
			if (!result.ok) {
				tx.setError(formatDispatchError(result.dispatchError));
				return;
			}
			tx.setSuccess("Reply created!");
			setReplyContentInput("");
			setReplyAppIdInput("");
			setReplyingTo(null);
			loadPosts();
		} catch (e) {
			tx.setError(e instanceof Error ? e.message : String(e));
		}
	}

	function formatBalance(value: bigint): string {
		if (value === 0n) return "0 (free)";
		return value.toString();
	}

	return (
		<div className="space-y-6">
			<AccountSelector />

			{/* Create Post */}
			<div className="card space-y-4">
				<h2 className="section-title text-accent-blue">Create Post</h2>
				<div>
					<label className="label">Content CID</label>
					<input
						type="text"
						value={contentInput}
						onChange={(e) => setContentInput(e.target.value)}
						placeholder="QmYourPostContent..."
						className="input-field w-full"
					/>
				</div>
				<div className="grid grid-cols-2 gap-4">
					<div>
						<label className="label">App ID (optional)</label>
						<input
							type="text"
							value={appIdInput}
							onChange={(e) => setAppIdInput(e.target.value)}
							placeholder="None"
							className="input-field w-full"
						/>
					</div>
					<div>
						<label className="label">Reply Fee</label>
						<input
							type="text"
							value={replyFeeInput}
							onChange={(e) => setReplyFeeInput(e.target.value)}
							placeholder="0"
							className="input-field w-full"
						/>
					</div>
				</div>
				<button
					onClick={createPost}
					disabled={!contentInput.trim()}
					className="btn-primary"
				>
					Create Post
				</button>
			</div>

			<TxStatusBanner status={tx.status} isError={tx.isError} />

			{/* Posts Feed */}
			<div className="card space-y-4">
				<div className="flex items-center justify-between">
					<h2 className="section-title">Recent Posts</h2>
					<button onClick={loadPosts} disabled={loading} className="btn-secondary text-xs">
						{loading ? "Loading..." : "Refresh"}
					</button>
				</div>

				{posts.length === 0 ? (
					<p className="text-text-muted text-sm">No posts yet.</p>
				) : (
					<div className="space-y-3">
						{posts.map((post) => {
							const postReplies = replies[post.id] || [];
							const expanded = expandedPosts.has(post.id);

							return (
								<div
									key={post.id}
									className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-4 space-y-3"
								>
									{/* Post header */}
									<div className="flex items-center gap-2 text-xs text-text-tertiary">
										<AddressDisplay address={post.author} />
										<span>·</span>
										<span className="font-mono">Block #{post.createdAt}</span>
										{post.appId !== null && (
											<>
												<span>·</span>
												<span className="text-accent-orange">App #{post.appId}</span>
											</>
										)}
									</div>

									{/* Content */}
									<p className="font-mono text-sm text-text-secondary break-all">
										{post.content}
									</p>

									{/* Footer */}
									<div className="flex items-center gap-3 text-xs">
										<span className="text-text-muted">
											Reply Fee: {formatBalance(post.replyFee)}
										</span>
										{postReplies.length > 0 && (
											<button
												onClick={() => toggleReplies(post.id)}
												className="text-accent-blue hover:underline"
											>
												{expanded ? "Hide" : "Show"} {postReplies.length} {postReplies.length === 1 ? "reply" : "replies"}
											</button>
										)}
										<button
											onClick={() => setReplyingTo(replyingTo === post.id ? null : post.id)}
											className="text-accent-blue hover:underline"
										>
											Reply
										</button>
									</div>

									{/* Reply form */}
									{replyingTo === post.id && (
										<div className="mt-3 pl-4 border-l-2 border-accent-blue/20 space-y-3">
											<input
												type="text"
												value={replyContentInput}
												onChange={(e) => setReplyContentInput(e.target.value)}
												onKeyDown={(e) => e.key === "Enter" && createReply(post.id)}
												placeholder="QmReplyContent..."
												className="input-field w-full"
											/>
											<div className="flex gap-2">
												<input
													type="text"
													value={replyAppIdInput}
													onChange={(e) => setReplyAppIdInput(e.target.value)}
													placeholder="App ID (optional)"
													className="input-field flex-1"
												/>
												<button
													onClick={() => createReply(post.id)}
													disabled={!replyContentInput.trim()}
													className="btn-primary text-xs"
												>
													Send Reply
												</button>
											</div>
										</div>
									)}

									{/* Replies */}
									{expanded &&
										postReplies.map((reply) => (
											<div
												key={reply.id}
												className="ml-4 pl-4 border-l-2 border-white/[0.06] rounded-r-lg bg-white/[0.01] p-3 space-y-1"
											>
												<div className="flex items-center gap-2 text-xs text-text-tertiary">
													<AddressDisplay address={reply.author} />
													<span>·</span>
													<span className="font-mono">Block #{reply.createdAt}</span>
													{reply.appId !== null && (
														<>
															<span>·</span>
															<span className="text-accent-orange">App #{reply.appId}</span>
														</>
													)}
												</div>
												<p className="font-mono text-xs text-text-muted break-all">
													{reply.content}
												</p>
											</div>
										))}
								</div>
							);
						})}
					</div>
				)}
			</div>
		</div>
	);
}
