import { useEffect, useState } from "react";
import { useSelectedAccount } from "../../hooks/social/useSelectedAccount";
import { useSocialApi } from "../../hooks/social/useSocialApi";
import { useChainStore } from "../../store/chainStore";
import RequireWallet from "../../components/social/RequireWallet";
import AuthorDisplay from "../../components/social/AuthorDisplay";
import { Link } from "react-router-dom";

function explorerUrl(wsUrl: string, blockHash: string): string {
	return `https://polkadot.js.org/apps/?rpc=${encodeURIComponent(wsUrl)}#/explorer/query/${blockHash}`;
}

const INDEXER_URL = "http://localhost:3001";
const DECIMALS = 12n;
const UNIT = 10n ** DECIMALS;

function formatAmount(raw: string): string {
	const val = BigInt(raw || "0");
	if (val === 0n) return "0";
	const whole = val / UNIT;
	const frac = val % UNIT;
	if (frac === 0n) return whole.toString();
	const fracStr = frac.toString().padStart(Number(DECIMALS), "0").replace(/0+$/, "");
	return `${whole}.${fracStr}`;
}

interface TxRecord {
	id: number;
	blockNumber: number;
	blockHash: string;
	kind: string;
	from: string;
	to: string;
	amount: string;
	postId: number | null;
	appId: number | null;
	timestamp: number;
}

const KIND_CONFIG: Record<
	string,
	{ label: string; color: string; icon: string; direction: "out" | "in" | "neutral" }
> = {
	ProfileCreated: {
		label: "Profile Created",
		color: "text-info",
		icon: "M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z",
		direction: "neutral",
	},
	ProfileUpdated: {
		label: "Profile Updated",
		color: "text-info",
		icon: "M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z",
		direction: "neutral",
	},
	ProfileDeleted: {
		label: "Profile Deleted",
		color: "text-danger",
		icon: "M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z",
		direction: "neutral",
	},
	FollowFeeUpdated: {
		label: "Follow Fee Updated",
		color: "text-info",
		icon: "M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z",
		direction: "neutral",
	},
	AppRegistered: {
		label: "App Registered",
		color: "text-info",
		icon: "M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6z",
		direction: "neutral",
	},
	AppDeregistered: {
		label: "App Deregistered",
		color: "text-danger",
		icon: "M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6z",
		direction: "neutral",
	},
	PostCreated: {
		label: "Post Created",
		color: "text-info",
		icon: "M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z",
		direction: "neutral",
	},
	ReplyCreated: {
		label: "Reply Created",
		color: "text-info",
		icon: "M9 15L3 9m0 0l6-6M3 9h12a6 6 0 010 12h-3",
		direction: "neutral",
	},
	PostFeePaid: {
		label: "Post Fee",
		color: "text-danger",
		icon: "M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0",
		direction: "out",
	},
	PostFeeEarned: {
		label: "Post Fee Earned",
		color: "text-success",
		icon: "M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0",
		direction: "in",
	},
	ReplyFeePaid: {
		label: "Reply Fee",
		color: "text-danger",
		icon: "M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0",
		direction: "out",
	},
	ReplyFeeEarned: {
		label: "Reply Fee Earned",
		color: "text-success",
		icon: "M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0",
		direction: "in",
	},
	FollowFeePaid: {
		label: "Follow Fee",
		color: "text-danger",
		icon: "M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7",
		direction: "out",
	},
	FollowFeeEarned: {
		label: "Follow Fee Earned",
		color: "text-success",
		icon: "M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7",
		direction: "in",
	},
	Unfollowed: {
		label: "Unfollowed",
		color: "text-secondary",
		icon: "M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7",
		direction: "neutral",
	},
	UnlockFeePaid: {
		label: "Unlock Fee",
		color: "text-danger",
		icon: "M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75",
		direction: "out",
	},
	UnlockFeeEarned: {
		label: "Unlock Fee Earned",
		color: "text-success",
		icon: "M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75",
		direction: "in",
	},
};

export default function TransactionsPage() {
	const { account } = useSelectedAccount();
	const { getApi } = useSocialApi();
	const wsUrl = useChainStore((s) => s.wsUrl);
	const [txs, setTxs] = useState<TxRecord[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [balance, setBalance] = useState<{
		free: bigint;
		reserved: bigint;
		frozen: bigint;
	} | null>(null);

	useEffect(() => {
		if (!account) {
			setBalance(null);
			return;
		}
		let cancelled = false;
		const api = getApi();
		api.query.System.Account.getValue(account.address).then((info) => {
			if (!cancelled)
				setBalance({
					free: info.data.free,
					reserved: info.data.reserved,
					frozen: info.data.frozen,
				});
		});
		return () => {
			cancelled = true;
		};
	}, [account, getApi]);

	useEffect(() => {
		if (!account) {
			setTxs([]);
			setLoading(false);
			return;
		}
		loadTxs(account.address);
	}, [account]);

	async function loadTxs(address: string) {
		try {
			setLoading(true);
			setError(null);
			const res = await fetch(`${INDEXER_URL}/api/tx/${address}?limit=100`);
			if (!res.ok) throw new Error("Indexer unavailable");
			setTxs(await res.json());
		} catch {
			setError(
				"Could not connect to indexer. Make sure ./scripts/start-indexer.sh is running.",
			);
		} finally {
			setLoading(false);
		}
	}

	// Compute totals — "Earned" txs have from=myAddress (receiver), "Paid" txs have from=myAddress (payer)
	const addr = account?.address || "";
	const totalEarned = txs
		.filter((t) => t.kind.endsWith("Earned") && t.from === addr && !(t.to && t.from === t.to))
		.reduce((s, t) => s + BigInt(t.amount || "0"), 0n);
	const totalSpent = txs
		.filter((t) => t.kind.endsWith("Paid") && t.from === addr && !(t.to && t.from === t.to))
		.reduce((s, t) => s + BigInt(t.amount || "0"), 0n);

	return (
		<RequireWallet>
			<div className="space-y-4">
				{/* On-chain balance */}
				{balance && (
					<div className="panel text-center py-5">
						<p className="text-3xl font-bold font-mono">
							{formatAmount(balance.free.toString())}
						</p>
						<p className="text-xs text-secondary uppercase tracking-wider mt-1">
							Total Balance
						</p>
						{(balance.reserved > 0n || balance.frozen > 0n) && (
							<div className="flex justify-center gap-4 mt-2 text-xs text-secondary font-mono">
								{balance.reserved > 0n && (
									<span>
										Reserved: {formatAmount(balance.reserved.toString())}
									</span>
								)}
								{balance.frozen > 0n && (
									<span>Frozen: {formatAmount(balance.frozen.toString())}</span>
								)}
							</div>
						)}
					</div>
				)}

				{/* Totals */}
				<div className="grid grid-cols-2 gap-3">
					<div className="panel text-center py-4">
						<p className="text-2xl font-bold font-mono text-success">
							+{formatAmount(totalEarned.toString())}
						</p>
						<p className="text-xs text-secondary uppercase tracking-wider mt-1">
							Total Earned
						</p>
					</div>
					<div className="panel text-center py-4">
						<p className="text-2xl font-bold font-mono text-danger">
							-{formatAmount(totalSpent.toString())}
						</p>
						<p className="text-xs text-secondary uppercase tracking-wider mt-1">
							Total Spent
						</p>
					</div>
				</div>

				{/* Transaction list */}
				<div className="panel space-y-1">
					<div className="flex items-center justify-between mb-3">
						<h2 className="heading-2">Transactions</h2>
						<button
							onClick={() => account && loadTxs(account.address)}
							disabled={loading}
							className="btn-ghost btn-sm"
						>
							{loading ? "..." : "Refresh"}
						</button>
					</div>

					{error && (
						<div className="rounded-xl px-4 py-3 text-sm bg-danger/10 text-danger border border-danger/20 mb-3">
							{error}
						</div>
					)}

					{loading ? (
						<div className="flex items-center justify-center py-8">
							<div className="w-5 h-5 border-2 border-surface-600 border-t-brand-500 rounded-full animate-spin" />
						</div>
					) : txs.length === 0 ? (
						<p className="text-secondary text-sm text-center py-8">
							No transactions yet.
						</p>
					) : (
						<div className="divide-y divide-surface-800">
							{txs.map((tx) => {
								const baseConfig = KIND_CONFIG[tx.kind] || {
									label: tx.kind,
									color: "text-secondary",
									icon: "M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z",
									direction: "neutral" as const,
								};

								// Determine direction from user's perspective
								// "Earned" txs: from=receiver. If I'm the receiver (from=me), it's "in". If I'm "to" (the payer), skip or show as reference.
								// "Paid" txs: from=payer. If I'm the payer (from=me), it's "out". If I'm "to" (the receiver), skip.
								const iAmFrom = tx.from === addr;
								let direction = baseConfig.direction;
								if (baseConfig.direction === "in" && !iAmFrom)
									direction = "neutral"; // I'm the payer side of someone else's earning
								if (baseConfig.direction === "out" && !iAmFrom)
									direction = "neutral"; // I'm the receiver side of someone else's payment

								const config = { ...baseConfig, direction };
								const isPayment = direction === "in" || direction === "out";
								const hasAmount =
									isPayment && tx.amount !== "0" && tx.amount !== "";
								const counterpart =
									tx.to && tx.to !== addr
										? tx.to
										: tx.from !== addr
											? tx.from
											: "";

								// Only show money transactions (Earned/Paid) where I'm the actor
								if (!tx.kind.endsWith("Earned") && !tx.kind.endsWith("Paid"))
									return null;
								if (!iAmFrom) return null;
								// Skip self-payments (paying yourself, e.g. posting in your own app)
								if (tx.to && tx.from === tx.to) return null;

								return (
									<div
										key={tx.id}
										className="py-3 first:pt-0 last:pb-0 flex items-center gap-3"
									>
										{/* Icon */}
										<div
											className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
												config.direction === "in"
													? "bg-success/10"
													: config.direction === "out"
														? "bg-danger/10"
														: "bg-surface-800"
											}`}
										>
											<svg
												className={`w-4 h-4 ${config.color}`}
												fill="none"
												viewBox="0 0 24 24"
												stroke="currentColor"
												strokeWidth={1.5}
											>
												<path
													strokeLinecap="round"
													strokeLinejoin="round"
													d={config.icon}
												/>
											</svg>
										</div>

										{/* Info */}
										<div className="flex-1 min-w-0">
											<div className="flex items-center gap-2">
												<span
													className={`text-sm font-medium ${config.color}`}
												>
													{config.label}
												</span>
												{tx.postId !== null && (
													<Link
														to={`/post/${tx.postId}`}
														className="text-[10px] font-mono text-surface-500 hover:text-brand-500"
													>
														Post #{tx.postId}
													</Link>
												)}
												{tx.appId !== null && (
													<Link
														to={`/app/${tx.appId}`}
														className="text-[10px] font-mono text-surface-500 hover:text-brand-500"
													>
														App #{tx.appId}
													</Link>
												)}
											</div>
											<div className="flex items-center gap-2 mt-0.5">
												{counterpart && (
													<AuthorDisplay
														address={counterpart}
														size="sm"
													/>
												)}
												{tx.blockHash ? (
													<a
														href={explorerUrl(wsUrl, tx.blockHash)}
														target="_blank"
														rel="noopener noreferrer"
														className="text-[10px] font-mono text-brand-500 hover:underline flex items-center gap-0.5"
													>
														#{tx.blockNumber}
														<svg
															className="w-2.5 h-2.5"
															fill="none"
															viewBox="0 0 24 24"
															stroke="currentColor"
															strokeWidth={2}
														>
															<path
																strokeLinecap="round"
																strokeLinejoin="round"
																d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
															/>
														</svg>
													</a>
												) : (
													<span className="text-[10px] text-surface-500 font-mono">
														#{tx.blockNumber}
													</span>
												)}
											</div>
										</div>

										{/* Amount */}
										{hasAmount && (
											<span
												className={`font-mono text-sm font-semibold shrink-0 ${
													config.direction === "in"
														? "text-success"
														: config.direction === "out"
															? "text-danger"
															: "text-secondary"
												}`}
											>
												{config.direction === "in"
													? "+"
													: config.direction === "out"
														? "-"
														: ""}
												{formatAmount(tx.amount)}
											</span>
										)}
									</div>
								);
							})}
							<style>{`html.light .divide-surface-800 { --tw-divide-opacity: 1; --tw-divide-color: #e4e4e7; } html.light .bg-surface-800 { background: #f4f4f5; }`}</style>
						</div>
					)}
				</div>
			</div>
		</RequireWallet>
	);
}
