import { useEffect, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import { Binary, FixedSizeBinary } from "polkadot-api";
import {
	RefreshCw,
	Lock,
	Globe,
	EyeOff,
	MessageCircle,
	Send,
	CornerDownRight,
	Zap,
	Sparkles,
} from "lucide-react";
import { useSocialApi } from "../../hooks/social/useSocialApi";
import { useSelectedAccount } from "../../hooks/social/useSelectedAccount";
import { useTxTracker } from "../../hooks/social/useTxTracker";
import { useIpfs } from "../../hooks/social/useIpfs";
import {
	sealPostContent,
	uploadRawToIpfs,
	useKeyService,
} from "../../hooks/social/useEncryptedPosts";
import { generateX25519Keypair, stashBuyerSk } from "../../utils/postCrypto";
import RequireProfile from "../../components/social/RequireProfile";
import TxToast from "../../components/social/TxToast";
import ConfirmModal from "../../components/social/ConfirmModal";
import AuthorDisplay from "../../components/social/AuthorDisplay";
import FeeRangeInput from "../../components/social/FeeRangeInput";
import {
	Avatar,
	Badge,
	Button,
	Card,
	EmptyState,
	SectionHeading,
	Skeleton,
	Textarea,
	cn,
} from "../../components/ui";

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

const VISIBILITY_META: Record<
	Visibility,
	{ label: string; tone: "success" | "info" | "warning"; icon: typeof Globe }
> = {
	Public: { label: "Public", tone: "success", icon: Globe },
	Obfuscated: { label: "Obfuscated", tone: "info", icon: EyeOff },
	Private: { label: "Private", tone: "warning", icon: Lock },
};

export default function FeedPage() {
	const { getApi } = useSocialApi();
	const { account } = useSelectedAccount();
	const tracker = useTxTracker();
	const keyService = useKeyService();
	const { uploadPostContent, fetchPostContent } = useIpfs();
	const [posts, setPosts] = useState<PostData[]>([]);
	const [replies, setReplies] = useState<Record<number, PostData[]>>({});
	const [unlocked, setUnlocked] = useState<Set<number>>(new Set());
	const [pendingUnlocks, setPendingUnlocks] = useState<Set<number>>(new Set());
	const [expanded, setExpanded] = useState<Set<number>>(new Set());
	const [loading, setLoading] = useState(true);
	const [uploading, setUploading] = useState(false);

	const [content, setContent] = useState("");
	const [replyFee, setReplyFee] = useState("0");
	const [appId, setAppId] = useState("");
	const [visibility, setVisibility] = useState<Visibility>("Public");
	const [unlockFeeInput, setUnlockFeeInput] = useState("0");

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
			setExpanded(
				new Set(originals.filter((p) => (rMap[p.id]?.length || 0) > 0).map((p) => p.id)),
			);

			let unlockedSet = new Set<number>();
			if (accountAddress) {
				const allUnlocks = await api.query.SocialFeeds.Unlocks.getEntries();
				const mine = allUnlocks.filter(
					(e: { keyArgs: [bigint, string]; value: { wrapped_key: unknown } }) =>
						e.keyArgs[1].toString() === accountAddress,
				);
				unlockedSet = new Set(
					mine.filter((e) => !!e.value.wrapped_key).map((e) => Number(e.keyArgs[0])),
				);
				const pending = new Set(
					mine.filter((e) => !e.value.wrapped_key).map((e) => Number(e.keyArgs[0])),
				);
				setUnlocked(unlockedSet);
				setPendingUnlocks(pending);
			}

			for (const p of originals) {
				if (
					p.visibility === "Public" ||
					p.author === accountAddress ||
					unlockedSet.has(p.id)
				) {
					fetchPostContent(p.contentCid).then((result) => {
						if (result) {
							setPosts((prev) =>
								prev.map((pp) =>
									pp.id === p.id ? { ...pp, resolvedText: result.text } : pp,
								),
							);
						}
					});
				}
			}
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

	useEffect(() => {
		loadPosts();
	}, [loadPosts]);

	useEffect(() => {
		if (pendingUnlocks.size === 0) return;
		const handle = setInterval(() => loadPosts(), 3000);
		return () => clearInterval(handle);
	}, [pendingUnlocks, loadPosts]);

	const busy =
		uploading ||
		tracker.state.stage === "signing" ||
		tracker.state.stage === "broadcasting" ||
		tracker.state.stage === "in_block";

	function toggle(id: number) {
		setExpanded((prev) => {
			const n = new Set(prev);
			if (n.has(id)) n.delete(id);
			else n.add(id);
			return n;
		});
	}

	async function createPost() {
		if (!account || !content.trim()) return;
		try {
			setUploading(true);

			let cid: string;
			let capsule: Uint8Array | undefined;
			if (visibility === "Public") {
				cid = await uploadPostContent(content.trim());
			} else {
				if (!keyService) throw new Error("Key service not configured on-chain");
				const payload = new TextEncoder().encode(JSON.stringify({ text: content.trim() }));
				const sealed = await sealPostContent(payload, keyService.encryptionPk);
				cid = await uploadRawToIpfs(sealed.blob);
				capsule = sealed.capsule;
			}
			setUploading(false);

			const api = getApi();
			const tx = api.tx.SocialFeeds.create_post({
				content: Binary.fromText(cid),
				app_id: appId.trim() ? parseInt(appId) : undefined,
				reply_fee: BigInt(replyFee || "0"),
				visibility: { type: visibility, value: undefined },
				unlock_fee: BigInt(unlockFeeInput || "0"),
				capsule: capsule ? FixedSizeBinary.fromBytes(capsule) : undefined,
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
		} catch (e) {
			setUploading(false);
			console.error("createPost failed", e);
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
		const kp = await generateX25519Keypair();
		stashBuyerSk(postId, kp.secretKey);
		const api = getApi();
		const tx = api.tx.SocialFeeds.unlock_post({
			post_id: BigInt(postId),
			buyer_pk: FixedSizeBinary.fromBytes(kp.publicKey),
		});
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
			<div className="mx-auto max-w-3xl space-y-8">
				<SectionHeading
					eyebrow="Feed"
					title="What's on the chain"
					description="Public posts stream directly from pallet-social-feeds. Private posts require on-chain unlock."
				/>

				{/* ── Composer ───────────────────────────────── */}
				<Card tone="default" padding="lg" className="space-y-4">
					<div className="flex gap-3">
						{account && <Avatar size="md" seed={account.address} alt={account.name} />}
						<div className="flex-1 space-y-2">
							<Textarea
								value={content}
								onChange={(e) => {
									if (e.target.value.length <= MAX_CHARS)
										setContent(e.target.value);
								}}
								placeholder="What's happening on-chain?"
								rows={3}
								className="resize-none border-0 bg-transparent !shadow-none focus:!shadow-none focus:border-transparent px-0 text-base"
							/>
							<div className="flex items-center justify-between">
								<VisibilityPicker value={visibility} onChange={setVisibility} />
								<span
									className={cn(
										"font-mono text-xs tabular",
										charsLeft < 0
											? "text-danger"
											: charsLeft < 50
												? "text-warning"
												: "text-ink-subtle",
									)}
								>
									{charsLeft}
								</span>
							</div>
						</div>
					</div>

					<div className="grid grid-cols-1 gap-3 border-t border-hairline/[0.06] pt-4 sm:grid-cols-3">
						<div>
							<label className="form-label">App ID</label>
							<input
								value={appId}
								onChange={(e) => setAppId(e.target.value)}
								placeholder="Optional"
								className="h-9 w-full rounded-md border border-hairline/[0.08] bg-canvas-sunken px-3 font-mono text-xs text-ink placeholder:text-ink-subtle focus:border-brand/50 focus:outline-none focus:shadow-[0_0_0_3px_rgb(var(--brand)/0.15)]"
							/>
						</div>
						<FeeRangeInput label="Reply Fee" value={replyFee} onChange={setReplyFee} />
						{visibility !== "Public" ? (
							<FeeRangeInput
								label="Unlock Fee"
								value={unlockFeeInput}
								onChange={setUnlockFeeInput}
							/>
						) : (
							<div className="hidden sm:block" />
						)}
					</div>

					<div className="flex items-center justify-between pt-1">
						<p className="text-[10px] text-ink-subtle">
							Content uploads to IPFS before the on-chain call.
						</p>
						<Button
							onClick={createPost}
							variant="primary"
							size="md"
							disabled={!content.trim() || !account || busy}
							loading={uploading}
							leadingIcon={<Send size={14} strokeWidth={1.75} />}
						>
							{uploading ? "Uploading…" : "Post"}
						</Button>
					</div>
				</Card>

				{/* ── Feed ───────────────────────────────────── */}
				<div>
					<div className="mb-4 flex items-center justify-between">
						<div className="flex items-center gap-2">
							<h3 className="font-display text-xl font-medium text-ink">Stream</h3>
							<Badge tone="neutral" size="sm" dot>
								{posts.length} posts
							</Badge>
						</div>
						<Button
							variant="ghost"
							size="sm"
							onClick={loadPosts}
							disabled={loading}
							leadingIcon={
								<RefreshCw
									size={13}
									strokeWidth={1.75}
									className={loading ? "animate-spin" : ""}
								/>
							}
						>
							Refresh
						</Button>
					</div>

					{loading && posts.length === 0 ? (
						<div className="space-y-3">
							{[0, 1, 2].map((i) => (
								<Card key={i} padding="md">
									<div className="flex gap-3">
										<Skeleton rounded="full" className="h-10 w-10" />
										<div className="flex-1 space-y-2.5">
											<Skeleton className="h-3 w-32" />
											<Skeleton className="h-4 w-full" />
											<Skeleton className="h-4 w-3/4" />
										</div>
									</div>
								</Card>
							))}
						</div>
					) : posts.length === 0 ? (
						<Card tone="overlay" padding="lg">
							<EmptyState
								icon={<Sparkles size={20} />}
								title="Nothing here yet"
								description="The feed is quiet. Be the first to post."
							/>
						</Card>
					) : (
						<div className="space-y-3">
							{posts.map((post) => {
								const postReplies = replies[post.id] || [];
								const isExpanded = expanded.has(post.id);
								const visible = canSeeContent(post);
								const meta = VISIBILITY_META[post.visibility];
								const Icon = meta.icon;

								return (
									<Card key={post.id} padding="md" className="space-y-3">
										<div className="flex items-center gap-3">
											<AuthorDisplay address={post.author} size="md" />
											<div className="ml-auto flex items-center gap-2">
												{post.visibility !== "Public" && (
													<Badge
														tone={meta.tone}
														size="sm"
														icon={<Icon size={10} />}
													>
														{meta.label}
													</Badge>
												)}
												{post.appId !== null && (
													<Badge tone="info" size="sm" variant="outline">
														App · {post.appId}
													</Badge>
												)}
												<Link
													to={`/post/${post.id}`}
													className="font-mono text-[11px] tabular text-ink-subtle transition-colors hover:text-brand"
												>
													#{post.id}
												</Link>
											</div>
										</div>

										<div className="pl-[52px]">
											{visible ? (
												<p className="whitespace-pre-wrap break-words text-[15px] leading-relaxed text-ink">
													{post.resolvedText ?? (
														<span className="italic text-ink-subtle">
															Loading content…
														</span>
													)}
												</p>
											) : (
												<div className="flex items-center gap-4 rounded-lg border border-hairline/[0.08] bg-canvas-sunken p-4">
													<div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-brand/10 text-brand">
														<Lock size={16} strokeWidth={1.75} />
													</div>
													<div className="min-w-0 flex-1">
														<p className="text-sm font-medium text-ink">
															Content is{" "}
															{post.visibility.toLowerCase()}
														</p>
														<p className="mt-0.5 font-mono text-[11px] text-ink-subtle">
															unlock_fee = {post.unlockFee.toString()}
														</p>
													</div>
													<Button
														onClick={() => unlockPost(post.id)}
														size="sm"
														variant="primary"
														disabled={busy}
														leadingIcon={
															<Zap size={12} strokeWidth={1.75} />
														}
													>
														Unlock
													</Button>
												</div>
											)}
										</div>

										<div className="flex items-center gap-4 pl-[52px] pt-1 font-mono text-[11px] tabular text-ink-subtle">
											<span className="inline-flex items-center gap-1">
												<span className="h-1 w-1 rounded-full bg-ink-faint" />
												block #{post.createdAt}
											</span>
											{postReplies.length > 0 && (
												<span className="inline-flex items-center gap-1">
													<MessageCircle size={11} strokeWidth={1.75} />
													{postReplies.length}
												</span>
											)}
											{post.replyFee > 0n && (
												<span className="inline-flex items-center gap-1">
													<Zap size={11} strokeWidth={1.75} />
													reply {post.replyFee.toString()}
												</span>
											)}
										</div>

										<div className="flex items-center gap-2 pl-[52px] pt-1">
											{postReplies.length > 0 && visible && (
												<button
													onClick={() => toggle(post.id)}
													className="text-xs font-medium text-ink-muted transition-colors hover:text-ink"
												>
													{isExpanded
														? "Hide replies"
														: `Show ${postReplies.length} replies`}
												</button>
											)}
											{account && visible && (
												<button
													onClick={() =>
														setReplyingTo(
															replyingTo === post.id ? null : post.id,
														)
													}
													className="text-xs font-medium text-brand transition-colors hover:text-ink"
												>
													Reply
												</button>
											)}
										</div>

										{replyingTo === post.id && (
											<div className="ml-[52px] space-y-2 border-l-2 border-brand/30 pl-4">
												<Textarea
													value={replyContent}
													onChange={(e) => {
														if (e.target.value.length <= MAX_CHARS)
															setReplyContent(e.target.value);
													}}
													placeholder="Write a reply…"
													rows={2}
													className="resize-none text-sm"
												/>
												<div className="flex items-center justify-between">
													<span className="font-mono text-[10px] tabular text-ink-subtle">
														{MAX_CHARS - replyContent.length} chars left
													</span>
													<Button
														onClick={() => setConfirmReplyTo(post.id)}
														disabled={!replyContent.trim() || busy}
														variant="primary"
														size="sm"
														leadingIcon={
															<CornerDownRight
																size={13}
																strokeWidth={1.75}
															/>
														}
													>
														Reply
													</Button>
												</div>
											</div>
										)}

										{isExpanded && visible && postReplies.length > 0 && (
											<div className="ml-[52px] space-y-3 border-l-2 border-hairline/[0.06] pl-4">
												{postReplies.map((r) => (
													<div key={r.id} className="space-y-1">
														<div className="flex items-center gap-2 text-xs">
															<AuthorDisplay
																address={r.author}
																size="sm"
															/>
															<span className="font-mono text-[10px] text-ink-subtle">
																#{r.createdAt}
															</span>
														</div>
														<p className="whitespace-pre-wrap break-words text-sm text-ink">
															{r.resolvedText ?? (
																<span className="italic text-ink-subtle">
																	Loading…
																</span>
															)}
														</p>
													</div>
												))}
											</div>
										)}
									</Card>
								);
							})}
						</div>
					)}
				</div>

				<ConfirmModal
					open={confirmReplyTo !== null}
					title="Reply Cost"
					confirmLabel={busy ? "Sending…" : "Confirm & Reply"}
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
						const parent =
							confirmReplyTo !== null
								? posts.find((p) => p.id === confirmReplyTo)
								: null;
						return (
							<div className="space-y-3 text-sm">
								<div className="space-y-2 rounded-lg border border-hairline/[0.06] bg-canvas-sunken p-3">
									<div className="flex items-center justify-between">
										<span className="text-ink-muted">Post fee</span>
										<span className="font-mono font-semibold text-ink">
											Tx Fee
										</span>
									</div>
									{parent && parent.replyFee > 0n ? (
										<div className="flex items-center justify-between">
											<span className="text-ink-muted">
												Reply fee (to author)
											</span>
											<span className="font-mono font-semibold text-ink">
												{parent.replyFee.toString()}
											</span>
										</div>
									) : (
										<div className="flex items-center justify-between">
											<span className="text-ink-muted">Reply fee</span>
											<span className="font-mono text-success">Free</span>
										</div>
									)}
								</div>
								<p className="text-xs text-ink-subtle">
									Fees are deducted when the reply is submitted.
								</p>
							</div>
						);
					})()}
				</ConfirmModal>

				<TxToast state={tracker.state} onDismiss={tracker.reset} />
			</div>
		</RequireProfile>
	);
}

function VisibilityPicker({
	value,
	onChange,
}: {
	value: Visibility;
	onChange: (v: Visibility) => void;
}) {
	const options: Visibility[] = ["Public", "Obfuscated", "Private"];
	return (
		<div className="inline-flex items-center gap-0.5 rounded-md border border-hairline/[0.08] bg-canvas-sunken p-0.5">
			{options.map((opt) => {
				const meta = VISIBILITY_META[opt];
				const Icon = meta.icon;
				const active = value === opt;
				return (
					<button
						key={opt}
						type="button"
						onClick={() => onChange(opt)}
						className={cn(
							"inline-flex items-center gap-1.5 rounded px-2 py-1 text-[11px] font-medium transition-colors",
							active
								? "bg-canvas-raised text-ink shadow-[0_1px_0_0_rgb(255_255_255/0.04)_inset]"
								: "text-ink-subtle hover:text-ink",
						)}
					>
						<Icon size={11} strokeWidth={1.75} />
						{opt}
					</button>
				);
			})}
		</div>
	);
}
