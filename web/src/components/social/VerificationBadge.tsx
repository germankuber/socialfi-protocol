import VerifiedBadge from "./VerifiedBadge";

/**
 * Three-state identity verification indicator driven by the Polkadot
 * People parachain.
 *
 * - `verified`    — identity set AND a registrar has issued a
 *                   `Reasonable` or `KnownGood` judgement.
 * - `pending`     — identity set, judgement absent or still `FeePaid` /
 *                   `Erroneous` / `OutOfDate` / `LowQuality`.
 * - `none`        — no identity registered on People for this account.
 *
 * The `size` prop controls the icon used for the `verified` state, and
 * the `showNoneLabel` prop lets callers suppress the "Unverified" pill
 * when the surrounding UI already makes that fact obvious.
 */
export type VerificationStatus = "verified" | "pending" | "none";

interface VerificationBadgeProps {
	status: VerificationStatus;
	size?: "sm" | "md";
	/** Render the "Unverified" pill when `status === "none"`. Default: true. */
	showNoneLabel?: boolean;
}

export default function VerificationBadge({
	status,
	size = "sm",
	showNoneLabel = true,
}: VerificationBadgeProps) {
	if (status === "verified") {
		return (
			<span className="inline-flex items-center gap-1">
				<VerifiedBadge size={size} />
				<span
					className={`inline-flex items-center rounded-full bg-success/10 px-2 py-0.5 font-semibold text-success ${textSize(size)}`}
				>
					Verified
				</span>
			</span>
		);
	}

	if (status === "pending") {
		return (
			<span
				className={`inline-flex items-center rounded-full bg-warning/10 px-2 py-0.5 font-semibold text-warning ${textSize(size)}`}
				title="Identity registered on People chain. Awaiting registrar judgement."
			>
				In process
			</span>
		);
	}

	if (!showNoneLabel) return null;

	return (
		<span
			className={`inline-flex items-center rounded-full bg-surface-700/30 px-2 py-0.5 font-semibold text-surface-400 ${textSize(size)}`}
			title="No identity registered on the Polkadot People parachain."
		>
			Unverified
		</span>
	);
}

function textSize(size: "sm" | "md"): string {
	return size === "md" ? "text-[10px]" : "text-[9px]";
}

/** Derive the status triple from a `useIdentity` result. */
export function identityStatus(
	identity:
		| {
				hasIdentity?: boolean;
				verified?: boolean;
		  }
		| null
		| undefined,
): VerificationStatus {
	if (identity?.verified) return "verified";
	if (identity?.hasIdentity) return "pending";
	return "none";
}
