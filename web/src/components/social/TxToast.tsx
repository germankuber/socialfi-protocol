import { useChainStore } from "../../store/chainStore";
import type { TxState, TxStage } from "../../hooks/social/useTxTracker";

function explorerUrl(wsUrl: string, blockHash: string): string {
	const rpc = encodeURIComponent(wsUrl);
	return `https://polkadot.js.org/apps/?rpc=${rpc}#/explorer/query/${blockHash}`;
}

interface TxToastProps {
	state: TxState;
	onDismiss?: () => void;
}

const STAGE_CONFIG: Record<TxStage, { color: string; bg: string; border: string; icon: "spinner" | "check" | "error" | "none" }> = {
	idle: { color: "", bg: "", border: "", icon: "none" },
	signing: { color: "text-warning", bg: "bg-warning/5", border: "border-warning/20", icon: "spinner" },
	broadcasting: { color: "text-info", bg: "bg-info/5", border: "border-info/20", icon: "spinner" },
	in_block: { color: "text-info", bg: "bg-info/5", border: "border-info/20", icon: "spinner" },
	finalized: { color: "text-success", bg: "bg-success/5", border: "border-success/20", icon: "check" },
	error: { color: "text-danger", bg: "bg-danger/5", border: "border-danger/20", icon: "error" },
};

const STAGE_PROGRESS: Record<TxStage, number> = {
	idle: 0,
	signing: 15,
	broadcasting: 40,
	in_block: 75,
	finalized: 100,
	error: 100,
};

export default function TxToast({ state, onDismiss }: TxToastProps) {
	const wsUrl = useChainStore((s) => s.wsUrl);

	if (state.stage === "idle") return null;

	const config = STAGE_CONFIG[state.stage];
	const progress = STAGE_PROGRESS[state.stage];

	return (
		<div className="fixed bottom-6 right-6 z-50 animate-slide-up w-96 max-w-[calc(100vw-2rem)]">
			<div className={`rounded-2xl border ${config.border} ${config.bg} backdrop-blur-xl p-4 shadow-lg`}>
				{/* Progress bar */}
				<div className="h-1 rounded-full bg-surface-800 mb-3 overflow-hidden">
					<div
						className={`h-full rounded-full transition-all duration-700 ease-out ${
							state.stage === "error" ? "bg-danger" :
							state.stage === "finalized" ? "bg-success" : "bg-info"
						}`}
						style={{ width: `${progress}%` }}
					/>
				</div>
				<style>{`html.light .bg-surface-800 { background: #e4e4e7; }`}</style>

				<div className="flex items-start gap-3">
					{/* Icon */}
					<div className={`shrink-0 mt-0.5 ${config.color}`}>
						{config.icon === "spinner" && (
							<svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
								<circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
								<path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
							</svg>
						)}
						{config.icon === "check" && (
							<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
								<path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
							</svg>
						)}
						{config.icon === "error" && (
							<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
								<path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
							</svg>
						)}
					</div>

					{/* Content */}
					<div className="flex-1 min-w-0">
						<p className={`text-sm font-semibold ${config.color}`}>
							{state.stage === "signing" && "Signing"}
							{state.stage === "broadcasting" && "Broadcasting"}
							{state.stage === "in_block" && "In Block"}
							{state.stage === "finalized" && "Finalized"}
							{state.stage === "error" && "Failed"}
						</p>
						<p className="text-xs text-secondary mt-0.5 break-words">
							{state.message}
						</p>
						{state.blockHash && (
							<a
								href={explorerUrl(wsUrl, state.blockHash)}
								target="_blank"
								rel="noopener noreferrer"
								className="inline-flex items-center gap-1 text-[11px] font-mono text-brand-500 hover:text-brand-400 mt-1.5 transition-colors"
							>
								View on Polkadot.js Apps
								<svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
									<path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
								</svg>
							</a>
						)}
					</div>

					{/* Dismiss */}
					{(state.stage === "finalized" || state.stage === "error") && onDismiss && (
						<button onClick={onDismiss} className="shrink-0 text-surface-500 hover:text-surface-300 transition-colors">
							<svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
								<path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
							</svg>
						</button>
					)}
				</div>
			</div>
		</div>
	);
}
