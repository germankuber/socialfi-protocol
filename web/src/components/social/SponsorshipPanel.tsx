import { useState } from "react";
import { useSponsorship } from "../../hooks/social/useSponsorship";
import { useSelectedAccount } from "../../hooks/social/useSelectedAccount";
import TxToast from "./TxToast";

/**
 * Compact widget that shows the community sponsorship pot balance and lets
 * anyone top it up. It is the owner-side surface of the gasless feature —
 * the transaction extension that actually consumes from the pot lives in
 * the runtime pipeline, not here.
 */
export default function SponsorshipPanel() {
	const { account } = useSelectedAccount();
	const { potBalance, potAccount, topUp, tracker } = useSponsorship();
	const [amount, setAmount] = useState("10");
	const busy = tracker.state.stage !== "idle" && tracker.state.stage !== "error";

	async function handleTopUp() {
		if (!account) return;
		const planck = BigInt(amount || "0") * 10n ** 9n; // ~ 1 UNIT each.
		if (planck === 0n) return;
		await topUp(planck, account.signer);
	}

	return (
		<>
			<section className="panel space-y-4">
				<div className="flex items-start gap-3">
					<div className="w-10 h-10 rounded-xl bg-brand-500/10 flex items-center justify-center shrink-0">
						<svg
							className="w-5 h-5 text-brand-500"
							fill="none"
							viewBox="0 0 24 24"
							stroke="currentColor"
							strokeWidth={1.7}
						>
							<path
								strokeLinecap="round"
								strokeLinejoin="round"
								d="M13 10V3L4 14h7v7l9-11h-7z"
							/>
						</svg>
					</div>
					<div className="flex-1 min-w-0">
						<h2 className="text-base font-semibold">Sponsorship pot</h2>
						<p className="text-[11px] text-secondary mt-0.5">
							Donations here pay the fees of transactions flagged with the
							ChargeSponsored extension — a custom TransactionExtension
							wired into the runtime pipeline.
						</p>
					</div>
				</div>

				<div className="rounded-xl border border-brand-500/20 bg-brand-500/5 px-4 py-3 flex items-baseline justify-between">
					<span className="text-[11px] uppercase tracking-wider font-semibold text-brand-500">
						Available
					</span>
					<span className="text-xl font-bold text-brand-500 font-mono">
						{(Number(potBalance) / 1e9).toFixed(3)}{" "}
						<span className="text-[11px] text-secondary font-normal">UNIT</span>
					</span>
				</div>

				{potAccount && (
					<p className="text-[10px] font-mono text-surface-500 truncate">
						pot: {potAccount}
					</p>
				)}

				{account ? (
					<div className="flex gap-2">
						<input
							type="number"
							min={1}
							value={amount}
							onChange={(e) => setAmount(e.target.value)}
							disabled={busy}
							className="input flex-1"
							placeholder="Amount (UNIT)"
						/>
						<button
							onClick={handleTopUp}
							disabled={busy || !amount}
							className="btn-brand shrink-0"
						>
							Top up
						</button>
					</div>
				) : (
					<p className="text-xs text-secondary">Connect a wallet to donate.</p>
				)}
			</section>

			<TxToast state={tracker.state} onDismiss={tracker.reset} />
		</>
	);
}
