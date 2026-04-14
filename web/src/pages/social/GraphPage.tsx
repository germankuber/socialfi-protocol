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
	const [targetInput, setTargetInput] = useState("");

	const loadGraph = useCallback(async () => {
		try {
			setLoading(true);
			const api = getApi();

			// Load following list for this account
			// FollowInfo has a single field `created_at`, which PAPI flattens to just `number`.
			const entries = await api.query.SocialGraph.Follows.getEntries(account.address);
			const followList: FollowData[] = entries.map((entry) => ({
				followed: entry.keyArgs[1].toString(),
				createdAt: Number(entry.value),
			}));
			setFollowing(followList);

			// Load counts
			const [fwerCount, fwingCount] = await Promise.all([
				api.query.SocialGraph.FollowerCount.getValue(account.address),
				api.query.SocialGraph.FollowingCount.getValue(account.address),
			]);
			setFollowerCount(Number(fwerCount));
			setFollowingCount(Number(fwingCount));
		} catch {
			setFollowing([]);
			setFollowerCount(0);
			setFollowingCount(0);
		} finally {
			setLoading(false);
		}
	}, [account.address, getApi]);

	useEffect(() => {
		loadGraph();
	}, [loadGraph]);

	async function followUser() {
		if (!targetInput.trim()) return;
		try {
			tx.setStatus("Submitting follow...");
			const api = getApi();
			const result = await api.tx.SocialGraph.follow({
				target: targetInput.trim(),
			}).signAndSubmit(account.signer);
			if (!result.ok) {
				tx.setError(formatDispatchError(result.dispatchError));
				return;
			}
			tx.setSuccess("Followed!");
			setTargetInput("");
			loadGraph();
		} catch (e) {
			tx.setError(e instanceof Error ? e.message : String(e));
		}
	}

	async function unfollowUser(target: string) {
		try {
			tx.setStatus("Submitting unfollow...");
			const api = getApi();
			const result = await api.tx.SocialGraph.unfollow({
				target,
			}).signAndSubmit(account.signer);
			if (!result.ok) {
				tx.setError(formatDispatchError(result.dispatchError));
				return;
			}
			tx.setSuccess("Unfollowed!");
			loadGraph();
		} catch (e) {
			tx.setError(e instanceof Error ? e.message : String(e));
		}
	}

	return (
		<div className="space-y-6">
			<AccountSelector />

			{/* Follow User */}
			<div className="card space-y-4">
				<h2 className="section-title text-accent-green">Follow User</h2>
				<div>
					<label className="label">Account Address</label>
					<input
						type="text"
						value={targetInput}
						onChange={(e) => setTargetInput(e.target.value)}
						onKeyDown={(e) => e.key === "Enter" && followUser()}
						placeholder="5GrwvaEF..."
						className="input-field w-full"
					/>
				</div>
				<button
					onClick={followUser}
					disabled={!targetInput.trim()}
					className="btn-primary"
				>
					Follow
				</button>
			</div>

			<TxStatusBanner status={tx.status} isError={tx.isError} />

			{/* Stats */}
			<div className="grid grid-cols-2 gap-4">
				<div className="card text-center">
					<p className="text-2xl font-bold font-mono text-accent-green">{followerCount}</p>
					<p className="text-xs text-text-tertiary uppercase tracking-wider mt-1">Followers</p>
				</div>
				<div className="card text-center">
					<p className="text-2xl font-bold font-mono text-accent-blue">{followingCount}</p>
					<p className="text-xs text-text-tertiary uppercase tracking-wider mt-1">Following</p>
				</div>
			</div>

			{/* Following List */}
			<div className="card space-y-4">
				<div className="flex items-center justify-between">
					<h2 className="section-title">Following ({following.length})</h2>
					<button onClick={loadGraph} disabled={loading} className="btn-secondary text-xs">
						{loading ? "Loading..." : "Refresh"}
					</button>
				</div>

				{following.length === 0 ? (
					<p className="text-text-muted text-sm">Not following anyone yet.</p>
				) : (
					<div className="space-y-2">
						{following.map((f) => (
							<div
								key={f.followed}
								className="flex items-center justify-between rounded-lg border border-white/[0.04] bg-white/[0.02] p-3"
							>
								<div className="space-y-0.5">
									<AddressDisplay address={f.followed} />
									<p className="text-xs text-text-muted">
										Since block <span className="font-mono">#{f.createdAt}</span>
									</p>
								</div>
								<button
									onClick={() => unfollowUser(f.followed)}
									className="px-2 py-1 rounded-md bg-accent-red/10 text-accent-red text-xs font-medium hover:bg-accent-red/20 transition-colors"
								>
									Unfollow
								</button>
							</div>
						))}
					</div>
				)}
			</div>
		</div>
	);
}
