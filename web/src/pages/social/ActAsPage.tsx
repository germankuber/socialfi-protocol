import { useMemo, useState } from "react";
import { Binary } from "polkadot-api";
import { useSelectedAccount } from "../../hooks/social/useSelectedAccount";
import { useSocialApi } from "../../hooks/social/useSocialApi";
import {
	useActingAs,
	type ManagerScopeKey,
} from "../../hooks/social/useManagers";
import { useIpfs } from "../../hooks/social/useIpfs";
import { useProfileCache } from "../../hooks/social/useProfileCache";
import RequireWallet from "../../components/social/RequireWallet";
import TxToast from "../../components/social/TxToast";
import VerifiedBadge from "../../components/social/VerifiedBadge";
import { Link } from "react-router-dom";

/**
 * Executor-facing dashboard: the account currently selected in the wallet is
 * shown the list of owners that have authorized them as a manager, plus a
 * "post as X" form that dispatches through `act_as_manager`.
 *
 * We keep the composer deliberately minimal (text + app_id? + visibility) so
 * the demo story — "Bob is posting, but the chain credits Alice" — is
 * visually unambiguous.
 */
export default function ActAsPage() {
	const { account } = useSelectedAccount();
	const { getApi } = useSocialApi();
	const { uploadPostContent } = useIpfs();
	const managerAddress = account?.address ?? null;
	const { authorizations, loading, tracker, actAs } = useActingAs(managerAddress);

	const [selectedOwner, setSelectedOwner] = useState<string | null>(null);
	const [content, setContent] = useState("");
	const [uploading, setUploading] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const selectedAuth = useMemo(
		() => authorizations.find((a) => a.owner === selectedOwner) ?? null,
		[authorizations, selectedOwner],
	);

	const canPost =
		selectedAuth !== null &&
		selectedAuth.scopes.includes("Post") &&
		content.trim().length > 0 &&
		!uploading &&
		tracker.state.stage === "idle";

	async function handlePost() {
		if (!account || !selectedOwner) return;
		try {
			setError(null);
			setUploading(true);
			const cid = await uploadPostContent(content.trim());
			setUploading(false);

			const api = getApi();
			const innerCall = api.tx.SocialFeeds.create_post({
				content: Binary.fromText(cid),
				app_id: undefined,
				reply_fee: 0n,
				visibility: { type: "Public", value: undefined },
				unlock_fee: 0n,
			});

			const ok = await actAs(
				selectedOwner,
				innerCall,
				account.signer,
				"Post as manager",
			);
			if (ok) setContent("");
		} catch (e) {
			setUploading(false);
			setError(e instanceof Error ? e.message : "Failed to post");
		}
	}

	return (
		<RequireWallet>
			<div className="space-y-6 animate-fade-in">
				<header className="space-y-2">
					<h1 className="heading-1">Act as</h1>
					<p className="text-secondary text-sm max-w-2xl">
						Owners who authorized you as a manager. Pick one, write the post,
						and sign with your own keys — the chain records the action under
						their profile.
					</p>
				</header>

				{loading ? (
					<div className="panel flex items-center justify-center py-10">
						<div className="w-5 h-5 border-2 border-brand-500/30 border-t-brand-500 rounded-full animate-spin" />
					</div>
				) : authorizations.length === 0 ? (
					<div className="panel text-center py-10 space-y-2">
						<h3 className="text-sm font-semibold">
							Nobody has authorized you yet
						</h3>
						<p className="text-xs text-surface-500 max-w-sm mx-auto">
							When a profile owner adds you as a manager, they will show up
							here and you'll be able to act on their behalf.
						</p>
					</div>
				) : (
					<>
						<section className="space-y-3">
							<h2 className="text-sm font-semibold uppercase tracking-wide text-surface-400">
								Authorized by ({authorizations.length})
							</h2>
							<div className="space-y-2">
								{authorizations.map((auth) => (
									<OwnerPill
										key={auth.owner}
										owner={auth.owner}
										scopes={auth.scopes}
										selected={auth.owner === selectedOwner}
										onClick={() => setSelectedOwner(auth.owner)}
									/>
								))}
							</div>
						</section>

						<section className="panel space-y-4">
							<div className="flex items-center gap-2">
								<h2 className="text-base font-semibold">Post as</h2>
								{selectedAuth ? (
									<code className="text-xs font-mono bg-brand-500/10 text-brand-500 px-2 py-0.5 rounded">
										{selectedAuth.owner.slice(0, 6)}…
										{selectedAuth.owner.slice(-4)}
									</code>
								) : (
									<span className="text-xs text-surface-500">
										pick someone above
									</span>
								)}
							</div>

							<textarea
								value={content}
								onChange={(e) => setContent(e.target.value)}
								placeholder="What's happening?"
								rows={4}
								disabled={!selectedAuth}
								className="input w-full resize-none"
							/>

							{selectedAuth && !selectedAuth.scopes.includes("Post") && (
								<div className="rounded-lg px-3 py-2 text-xs bg-warning/10 text-warning border border-warning/20">
									This authorization does not grant the Post scope. Try one of
									the other actions or ask the owner to extend your scopes.
								</div>
							)}

							{error && (
								<div className="rounded-lg px-3 py-2 text-xs bg-danger/10 text-danger border border-danger/20">
									{error}
								</div>
							)}

							<button
								onClick={handlePost}
								disabled={!canPost}
								className="btn-brand w-full"
							>
								{uploading ? "Uploading to IPFS…" : "Publish"}
							</button>
						</section>
					</>
				)}

				<TxToast state={tracker.state} onDismiss={tracker.reset} />
			</div>
		</RequireWallet>
	);
}

/* ────────────────────────────────────────────────────────────────────── */

function OwnerPill({
	owner,
	scopes,
	selected,
	onClick,
}: {
	owner: string;
	scopes: ManagerScopeKey[];
	selected: boolean;
	onClick: () => void;
}) {
	const { getProfile } = useProfileCache();
	const profile = getProfile(owner);
	const truncated = `${owner.slice(0, 8)}…${owner.slice(-6)}`;

	return (
		<button
			onClick={onClick}
			className={`panel w-full text-left flex items-center gap-3 p-3 transition-colors ${
				selected
					? "border-brand-500/40 bg-brand-500/5"
					: "hover:border-surface-500"
			}`}
		>
			<div className="w-10 h-10 rounded-full bg-brand-500/20 flex items-center justify-center text-brand-500 text-xs font-bold shrink-0">
				{profile?.name?.[0]?.toUpperCase() || owner.slice(2, 4)}
			</div>
			<div className="flex-1 min-w-0">
				<div className="flex items-center gap-1.5">
					<span className="text-sm font-medium truncate">
						{profile?.name || truncated}
					</span>
					{profile?.verified && <VerifiedBadge size="sm" />}
				</div>
				<Link
					to={`/profile/${owner}`}
					onClick={(e) => e.stopPropagation()}
					className="text-[11px] font-mono text-surface-500 hover:text-brand-500 truncate"
				>
					{truncated}
				</Link>
			</div>
			<div className="flex flex-wrap gap-1 justify-end">
				{scopes.map((s) => (
					<span
						key={s}
						className="inline-flex items-center rounded-md bg-surface-700/50 text-surface-300 px-1.5 py-0.5 text-[10px] font-semibold"
					>
						{s}
					</span>
				))}
			</div>
		</button>
	);
}
