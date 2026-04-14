import { useEffect, useState, useCallback } from "react";
import { useSocialApi } from "../../hooks/social/useSocialApi";
import { useSelectedAccount } from "../../hooks/social/useSelectedAccount";
import { useTxStatus } from "../../hooks/social/useTxStatus";
import { formatDispatchError } from "../../utils/format";
import AccountSelector from "../../components/social/AccountSelector";
import TxStatusBanner from "../../components/social/TxStatusBanner";
import AddressDisplay from "../../components/social/AddressDisplay";

interface FollowData {
	followed: string;
	createdAt: number;
}

export default function GraphPage() {
	const { getApi } = useSocialApi();
	const { account } = useSelectedAccount();
	const tx = useTxStatus();
	const [following, setFollowing] = useState<FollowData[]>([]);
	const [followerCount, setFollowerCount] = useState(0);
	const [followingCount, setFollowingCount] = useState(0);
	const [loading, setLoading] = useState(true);
	const [target, setTarget] = useState("");

	const accountAddress = account?.address ?? null;

	const loadGraph = useCallback(async () => {
		if (!accountAddress) {
			setFollowing([]);
			setFollowerCount(0);
			setFollowingCount(0);
			setLoading(false);
			return;
		}
		try {
			setLoading(true);
			const api = getApi();
			const entries = await api.query.SocialGraph.Follows.getEntries(accountAddress);
			setFollowing(entries.map((e) => ({
				followed: e.keyArgs[1].toString(),
				createdAt: Number(e.value),
			})));
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

	async function followUser() {
		if (!account || !target.trim()) return;
		try {
			tx.setStatus("Following...");
			const api = getApi();
			const result = await api.tx.SocialGraph.follow({ target: target.trim() }).signAndSubmit(account.signer);
			if (!result.ok) { tx.setError(formatDispatchError(result.dispatchError)); return; }
			tx.setSuccess("Followed!");
			setTarget("");
			loadGraph();
		} catch (e) { tx.setError(e instanceof Error ? e.message : String(e)); }
	}

	async function unfollowUser(addr: string) {
		if (!account) return;
		try {
			tx.setStatus("Unfollowing...");
			const api = getApi();
			const result = await api.tx.SocialGraph.unfollow({ target: addr }).signAndSubmit(account.signer);
			if (!result.ok) { tx.setError(formatDispatchError(result.dispatchError)); return; }
			tx.setSuccess("Unfollowed!");
			loadGraph();
		} catch (e) { tx.setError(e instanceof Error ? e.message : String(e)); }
	}

	return (
		<div className="space-y-4">
			<AccountSelector />
			<TxStatusBanner status={tx.status} isError={tx.isError} />

			{/* Follow form */}
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
					<button onClick={followUser} disabled={!target.trim()} className="btn-brand shrink-0">
						Follow
					</button>
				</div>
			</div>

			{/* Stats */}
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

			{/* Following list */}
			<div className="panel space-y-4">
				<div className="flex items-center justify-between">
					<h2 className="heading-2">Following</h2>
					<button onClick={loadGraph} disabled={loading} className="btn-ghost btn-sm">
						{loading ? "..." : "Refresh"}
					</button>
				</div>

				{following.length === 0 ? (
					<p className="text-secondary text-sm text-center py-4">Not following anyone.</p>
				) : (
					<div className="divide-y divide-surface-800">
						{following.map((f) => (
							<div key={f.followed} className="flex items-center justify-between py-3 first:pt-0 last:pb-0">
								<div>
									<AddressDisplay address={f.followed} />
									<p className="text-[11px] text-surface-500 font-mono mt-0.5">
										Since block #{f.createdAt}
									</p>
								</div>
								<button onClick={() => unfollowUser(f.followed)} className="btn-danger btn-sm">
									Unfollow
								</button>
							</div>
						))}
						<style>{`html.light .divide-surface-800 { --tw-divide-opacity: 1; --tw-divide-color: #e4e4e7; }`}</style>
					</div>
				)}
			</div>
		</div>
	);
}
