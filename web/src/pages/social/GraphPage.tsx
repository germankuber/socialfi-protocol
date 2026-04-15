import { useEffect, useState, useCallback } from "react";
import { useSocialApi } from "../../hooks/social/useSocialApi";
import { useSelectedAccount } from "../../hooks/social/useSelectedAccount";
import { useTxTracker } from "../../hooks/social/useTxTracker";
import RequireProfile from "../../components/social/RequireProfile";
import TxToast from "../../components/social/TxToast";
import AuthorDisplay from "../../components/social/AuthorDisplay";

interface FollowData {
	followed: string;
	createdAt: number;
}

export default function GraphPage() {
	const { getApi } = useSocialApi();
	const { account } = useSelectedAccount();
	const tracker = useTxTracker();
	const [following, setFollowing] = useState<FollowData[]>([]);
	const [followers, setFollowers] = useState<FollowData[]>([]);
	const [followerCount, setFollowerCount] = useState(0);
	const [followingCount, setFollowingCount] = useState(0);
	const [graphTab, setGraphTab] = useState<"following" | "followers">("following");
	const [loading, setLoading] = useState(false);
	const [target, setTarget] = useState("");

	const accountAddress = account?.address ?? null;

	const loadGraph = useCallback(async () => {
		if (!accountAddress) {
			setFollowing([]); setFollowers([]);
			setFollowerCount(0); setFollowingCount(0);
			return;
		}
		try {
			setLoading(true);
			const api = getApi();

			// Who I follow
			const followingEntries = await api.query.SocialGraph.Follows.getEntries(accountAddress);
			setFollowing(followingEntries.map((e) => ({
				followed: e.keyArgs[1].toString(),
				createdAt: Number(e.value),
			})));

			// Who follows me — get all entries and filter where second key = me
			const allFollows = await api.query.SocialGraph.Follows.getEntries();
			const myFollowers = allFollows
				.filter((e) => e.keyArgs[1].toString() === accountAddress)
				.map((e) => ({
					followed: e.keyArgs[0].toString(),
					createdAt: Number(e.value),
				}));
			setFollowers(myFollowers);

			const [fc, fgc] = await Promise.all([
				api.query.SocialGraph.FollowerCount.getValue(accountAddress),
				api.query.SocialGraph.FollowingCount.getValue(accountAddress),
			]);
			setFollowerCount(Number(fc));
			setFollowingCount(Number(fgc));
		} catch {
			setFollowing([]);
		} finally {
			setLoading(false);
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [accountAddress]);

	useEffect(() => { loadGraph(); }, [loadGraph]);

	const busy = tracker.state.stage === "signing" || tracker.state.stage === "broadcasting" || tracker.state.stage === "in_block";

	async function followUser() {
		if (!account || !target.trim()) return;
		const api = getApi();
		const tx = api.tx.SocialGraph.follow({ target: target.trim() });
		const ok = await tracker.submit(tx, account.signer, "Follow");
		if (ok) { setTarget(""); loadGraph(); }
	}

	async function unfollowUser(addr: string) {
		if (!account) return;
		const api = getApi();
		const tx = api.tx.SocialGraph.unfollow({ target: addr });
		const ok = await tracker.submit(tx, account.signer, "Unfollow");
		if (ok) loadGraph();
	}

	return (
		<RequireProfile>
		<div className="space-y-4">

			<div className="panel space-y-3">
				<h2 className="heading-2">Follow User</h2>
				<div className="flex gap-2">
					<input
						value={target}
						onChange={(e) => setTarget(e.target.value)}
						onKeyDown={(e) => e.key === "Enter" && followUser()}
						placeholder="SS58 address..."
						className="input flex-1"
					/>
					<button onClick={followUser} disabled={!target.trim() || !account || busy} className="btn-brand shrink-0">
						Follow
					</button>
				</div>
			</div>

			<div className="grid grid-cols-2 gap-3">
				<div className="panel text-center py-4">
					<p className="text-3xl font-bold font-mono">{followerCount}</p>
					<p className="text-xs text-secondary uppercase tracking-wider mt-1">Followers</p>
				</div>
				<div className="panel text-center py-4">
					<p className="text-3xl font-bold font-mono">{followingCount}</p>
					<p className="text-xs text-secondary uppercase tracking-wider mt-1">Following</p>
				</div>
			</div>

			<div className="panel space-y-4">
				<div className="flex items-center justify-between border-b border-surface-800">
					<div className="flex">
						<button onClick={() => setGraphTab("following")}
							className={`relative px-4 py-2.5 text-sm font-medium transition-colors ${graphTab === "following" ? "text-brand-500" : "text-surface-500 hover:text-surface-200"}`}>
							Following ({followingCount})
							{graphTab === "following" && <span className="absolute bottom-0 inset-x-2 h-0.5 bg-brand-500 rounded-t-full" />}
						</button>
						<button onClick={() => setGraphTab("followers")}
							className={`relative px-4 py-2.5 text-sm font-medium transition-colors ${graphTab === "followers" ? "text-brand-500" : "text-surface-500 hover:text-surface-200"}`}>
							Followers ({followerCount})
							{graphTab === "followers" && <span className="absolute bottom-0 inset-x-2 h-0.5 bg-brand-500 rounded-t-full" />}
						</button>
					</div>
					<button onClick={loadGraph} disabled={loading} className="btn-ghost btn-sm">
						{loading ? "..." : "Refresh"}
					</button>
				</div>
				<style>{`html.light .border-surface-800 { border-color: #e4e4e7; }`}</style>

				{graphTab === "following" && (
					following.length === 0 ? (
						<p className="text-secondary text-sm text-center py-4">Not following anyone.</p>
					) : (
						<div className="divide-y divide-surface-800">
							{following.map((f) => (
								<div key={f.followed} className="flex items-center justify-between py-3 first:pt-0 last:pb-0">
									<AuthorDisplay address={f.followed} size="md" />
									<button onClick={() => unfollowUser(f.followed)} disabled={busy} className="btn-danger btn-sm">
										Unfollow
									</button>
								</div>
							))}
							<style>{`html.light .divide-surface-800 { --tw-divide-opacity: 1; --tw-divide-color: #e4e4e7; }`}</style>
						</div>
					)
				)}

				{graphTab === "followers" && (
					followers.length === 0 ? (
						<p className="text-secondary text-sm text-center py-4">No followers yet.</p>
					) : (
						<div className="divide-y divide-surface-800">
							{followers.map((f) => (
								<div key={f.followed} className="flex items-center justify-between py-3 first:pt-0 last:pb-0">
									<AuthorDisplay address={f.followed} size="md" />
								</div>
							))}
							<style>{`html.light .divide-surface-800 { --tw-divide-opacity: 1; --tw-divide-color: #e4e4e7; }`}</style>
						</div>
					)
				)}
			</div>

			<TxToast state={tracker.state} onDismiss={tracker.reset} />
		</div>
		</RequireProfile>
	);
}
