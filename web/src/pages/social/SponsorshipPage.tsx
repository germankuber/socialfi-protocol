import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useSponsorship } from "../../hooks/social/useSponsorship";
import { useSelectedAccount } from "../../hooks/social/useSelectedAccount";
import { useSocialApi } from "../../hooks/social/useSocialApi";
import { useProfileCache } from "../../hooks/social/useProfileCache";
import RequireWallet from "../../components/social/RequireWallet";
import VerifiedBadge from "../../components/social/VerifiedBadge";
import TxToast from "../../components/social/TxToast";

/**
 * Directed-sponsorship dashboard.
 *
 * Two panels stacked vertically:
 *
 * 1. "My pot" — the caller's role as sponsor. Shows the deposited amount,
 *    lets them top up / withdraw, and manage the list of beneficiaries.
 * 2. "My sponsor" — the caller's role as beneficiary. Shows who is
 *    paying their fees (if anyone) and a one-click exit button.
 *
 * Both panels always render; if no data exists the empty state explains
 * what the caller would get by using that side of the feature.
 */
export default function SponsorshipPage() {
	const { account } = useSelectedAccount();
	const address = account?.address ?? null;
	const s = useSponsorship(address);

	return (
		<RequireWallet>
			<div className="space-y-6 animate-fade-in">
				<header className="space-y-2">
					<h1 className="heading-1">Sponsorship</h1>
					<p className="text-secondary text-sm max-w-2xl">
						Pay another account's transaction fees from a personal pot.
						Their extrinsics sign with their own keys; the runtime's
						<code className="text-brand-500 mx-1">ChargeSponsored</code>
						transaction extension redirects the fee to your pot inside
						the dispatch pipeline.
					</p>
					<div className="inline-flex items-center gap-2 rounded-full border border-brand-500/30 bg-brand-500/10 px-3 py-1 text-[11px] font-semibold text-brand-500">
						<svg
							className="w-3 h-3"
							fill="none"
							viewBox="0 0 24 24"
							stroke="currentColor"
							strokeWidth={2.2}
						>
							<path
								strokeLinecap="round"
								strokeLinejoin="round"
								d="M13 10V3L4 14h7v7l9-11h-7z"
							/>
						</svg>
						Custom FRAME TransactionExtension · per-signer fee redirection
					</div>
				</header>

				<SponsorPanel
					ownAddress={address}
					myPot={s.myPot}
					beneficiaries={s.myBeneficiaries}
					disabled={s.tracker.state.stage !== "idle"}
					onTopUp={(amt) => account && s.topUp(amt, account.signer)}
					onWithdraw={(amt) => account && s.withdraw(amt, account.signer)}
					onRegister={(who) =>
						account && s.registerBeneficiary(who, account.signer)
					}
					onRevoke={(who) =>
						account && s.revokeBeneficiary(who, account.signer)
					}
				/>

				<BeneficiaryPanel
					mySponsor={s.mySponsor}
					mySponsorPot={s.mySponsorPot}
					disabled={s.tracker.state.stage !== "idle"}
					onLeave={() => account && s.revokeMySponsor(account.signer)}
				/>

				<TxToast state={s.tracker.state} onDismiss={s.tracker.reset} />
			</div>
		</RequireWallet>
	);
}

/* ── Sponsor side ──────────────────────────────────────────────────── */

interface SponsorPanelProps {
	ownAddress: string | null;
	myPot: bigint;
	beneficiaries: string[];
	disabled: boolean;
	onTopUp: (amount: bigint) => void;
	onWithdraw: (amount: bigint) => void;
	onRegister: (who: string) => void;
	onRevoke: (who: string) => void;
}

function SponsorPanel({
	ownAddress,
	myPot,
	beneficiaries,
	disabled,
	onTopUp,
	onWithdraw,
	onRegister,
	onRevoke,
}: SponsorPanelProps) {
	const [topUpAmount, setTopUpAmount] = useState("5");
	const [withdrawAmount, setWithdrawAmount] = useState("1");
	const [pickerOpen, setPickerOpen] = useState(false);

	const excluded = useMemo(() => {
		const set = new Set(beneficiaries);
		if (ownAddress) set.add(ownAddress);
		return set;
	}, [beneficiaries, ownAddress]);

	const potUnits = useMemo(() => (Number(myPot) / 1e9).toFixed(3), [myPot]);

	return (
		<section className="panel space-y-5">
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
							d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7"
						/>
					</svg>
				</div>
				<div className="flex-1 min-w-0">
					<h2 className="text-base font-semibold">My sponsor pot</h2>
					<p className="text-[11px] text-secondary mt-0.5">
						Balance available to cover transaction fees for the
						accounts you sponsor.
					</p>
				</div>
			</div>

			<div className="rounded-xl border border-brand-500/20 bg-brand-500/5 px-4 py-3 flex items-baseline justify-between">
				<span className="text-[11px] uppercase tracking-wider font-semibold text-brand-500">
					Available
				</span>
				<span className="text-xl font-bold text-brand-500 font-mono">
					{potUnits}{" "}
					<span className="text-[11px] text-secondary font-normal">
						UNIT
					</span>
				</span>
			</div>

			<div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
				<div className="space-y-1.5">
					<label className="form-label">Top up</label>
					<div className="flex gap-2">
						<input
							type="number"
							min={1}
							value={topUpAmount}
							onChange={(e) => setTopUpAmount(e.target.value)}
							disabled={disabled}
							className="input flex-1"
							placeholder="UNIT"
						/>
						<button
							onClick={() => {
								const amt = BigInt(topUpAmount || "0") * 10n ** 9n;
								if (amt > 0n) onTopUp(amt);
							}}
							disabled={disabled || !topUpAmount}
							className="btn-brand shrink-0"
						>
							Deposit
						</button>
					</div>
				</div>

				<div className="space-y-1.5">
					<label className="form-label">Withdraw</label>
					<div className="flex gap-2">
						<input
							type="number"
							min={1}
							value={withdrawAmount}
							onChange={(e) => setWithdrawAmount(e.target.value)}
							disabled={disabled || myPot === 0n}
							className="input flex-1"
							placeholder="UNIT"
						/>
						<button
							onClick={() => {
								const amt =
									BigInt(withdrawAmount || "0") * 10n ** 9n;
								if (amt > 0n) onWithdraw(amt);
							}}
							disabled={disabled || myPot === 0n || !withdrawAmount}
							className="btn-outline shrink-0"
						>
							Withdraw
						</button>
					</div>
				</div>
			</div>

			{/* Beneficiary list */}
			<div className="space-y-3 pt-2 border-t border-surface-800">
				<div className="flex items-baseline justify-between">
					<h3 className="text-sm font-semibold uppercase tracking-wide text-surface-400">
						Beneficiaries ({beneficiaries.length})
					</h3>
				</div>

				{pickerOpen ? (
					<ProfilePicker
						excluded={excluded}
						disabled={disabled}
						onPick={(addr) => {
							onRegister(addr);
							setPickerOpen(false);
						}}
						onClose={() => setPickerOpen(false)}
					/>
				) : (
					<button
						onClick={() => setPickerOpen(true)}
						disabled={disabled}
						className="w-full flex items-center justify-center gap-2 rounded-xl border border-dashed border-surface-700 hover:border-brand-500/50 px-3 py-2.5 text-xs font-medium text-surface-400 hover:text-brand-500 transition-colors"
					>
						<svg
							className="w-4 h-4"
							fill="none"
							viewBox="0 0 24 24"
							stroke="currentColor"
							strokeWidth={2}
						>
							<path
								strokeLinecap="round"
								strokeLinejoin="round"
								d="M12 4v16m8-8H4"
							/>
						</svg>
						Add a beneficiary
					</button>
				)}

				{beneficiaries.length === 0 ? (
					<p className="text-xs text-secondary">
						Add any account here and the runtime will cover their
						transaction fees from your pot. The beneficiary does not
						need to know or accept — they will just notice their
						fee went to zero.
					</p>
				) : (
					<div className="space-y-2">
						{beneficiaries.map((addr) => (
							<BeneficiaryRow
								key={addr}
								address={addr}
								disabled={disabled}
								onRemove={() => onRevoke(addr)}
							/>
						))}
					</div>
				)}
			</div>
		</section>
	);
}

function BeneficiaryRow({
	address,
	disabled,
	onRemove,
}: {
	address: string;
	disabled: boolean;
	onRemove: () => void;
}) {
	const { getProfile } = useProfileCache();
	const profile = getProfile(address);
	const truncated = `${address.slice(0, 6)}…${address.slice(-4)}`;

	return (
		<div className="flex items-center gap-3 rounded-xl border border-surface-800 px-3 py-2">
			<Link to={`/profile/${address}`} className="flex items-center gap-3 flex-1 min-w-0">
				{profile?.avatar ? (
					<img
						src={profile.avatar}
						alt={profile.name}
						className="w-9 h-9 rounded-full object-cover bg-surface-800 shrink-0"
					/>
				) : (
					<div className="w-9 h-9 rounded-full bg-brand-500/20 flex items-center justify-center text-brand-500 text-xs font-bold shrink-0">
						{profile?.name?.[0]?.toUpperCase() || address.slice(2, 4)}
					</div>
				)}
				<div className="min-w-0">
					<div className="flex items-center gap-1.5">
						<span className="text-sm font-medium truncate">
							{profile?.name || truncated}
						</span>
						{profile?.verified && <VerifiedBadge size="sm" />}
					</div>
					<span className="text-[11px] font-mono text-surface-500 truncate">
						{truncated}
					</span>
				</div>
			</Link>
			<button
				onClick={onRemove}
				disabled={disabled}
				className="text-[11px] font-semibold text-danger border border-danger/30 rounded-lg px-2.5 py-1 hover:bg-danger/10 transition-colors shrink-0"
			>
				Revoke
			</button>
		</div>
	);
}

/* ── Beneficiary side ──────────────────────────────────────────────── */

function BeneficiaryPanel({
	mySponsor,
	mySponsorPot,
	disabled,
	onLeave,
}: {
	mySponsor: string | null;
	mySponsorPot: bigint;
	disabled: boolean;
	onLeave: () => void;
}) {
	const { getProfile } = useProfileCache();
	const profile = mySponsor ? getProfile(mySponsor) : null;
	const truncated = mySponsor
		? `${mySponsor.slice(0, 6)}…${mySponsor.slice(-4)}`
		: "";
	const potUnits = (Number(mySponsorPot) / 1e9).toFixed(3);

	if (!mySponsor) {
		return (
			<section className="panel space-y-2">
				<h2 className="text-base font-semibold">My sponsor</h2>
				<p className="text-sm text-secondary">
					Nobody is covering your fees right now. When a sponsor adds
					you here, your next transactions will be paid from their pot
					— with no extra steps on your side.
				</p>
			</section>
		);
	}

	const potEmpty = mySponsorPot === 0n;

	return (
		<section
			className={`panel space-y-4 ${potEmpty ? "" : "ring-1 ring-brand-500/40"}`}
		>
			<h2 className="text-base font-semibold">My sponsor</h2>
			<div className="flex items-center gap-3">
				{profile?.avatar ? (
					<img
						src={profile.avatar}
						alt={profile.name}
						className="w-12 h-12 rounded-full object-cover bg-surface-800 shrink-0"
					/>
				) : (
					<div className="w-12 h-12 rounded-full bg-brand-500/20 flex items-center justify-center text-brand-500 text-sm font-bold shrink-0">
						{profile?.name?.[0]?.toUpperCase() || mySponsor.slice(2, 4)}
					</div>
				)}
				<div className="flex-1 min-w-0">
					<div className="flex items-center gap-1.5">
						<Link
							to={`/profile/${mySponsor}`}
							className="text-sm font-semibold truncate hover:text-brand-500"
						>
							{profile?.name || truncated}
						</Link>
						{profile?.verified && <VerifiedBadge size="sm" />}
					</div>
					<span className="text-[11px] font-mono text-surface-500 truncate">
						{truncated}
					</span>
				</div>
				<button
					onClick={onLeave}
					disabled={disabled}
					className="text-[11px] font-semibold text-danger border border-danger/30 rounded-lg px-2.5 py-1 hover:bg-danger/10 transition-colors shrink-0"
				>
					Leave
				</button>
			</div>

			<div
				className={`rounded-xl px-4 py-3 flex items-center justify-between ${
					potEmpty
						? "border border-warning/30 bg-warning/5 text-warning"
						: "border border-brand-500/20 bg-brand-500/5 text-brand-500"
				}`}
			>
				<span className="text-[11px] uppercase tracking-wider font-semibold">
					Sponsor's pot
				</span>
				<span className="text-sm font-mono font-bold">
					{potUnits} UNIT
				</span>
			</div>
			{potEmpty && (
				<p className="text-[11px] text-secondary">
					Their pot is empty — next transactions will fall through to
					regular fee payment. When they top it up, your txs become
					gasless again automatically.
				</p>
			)}
		</section>
	);
}

/* ── Profile picker ────────────────────────────────────────────────── */

/**
 * Visual account picker backed by the set of existing profiles on chain.
 *
 * Lists every `SocialProfiles::Profiles` entry as a clickable card with
 * avatar + name (falling back to initials + truncated address). The
 * `excluded` set hides the caller's own account and anyone already on
 * their beneficiary list so a pick can't be a no-op or a self-delegation.
 */
function ProfilePicker({
	excluded,
	disabled,
	onPick,
	onClose,
}: {
	excluded: Set<string>;
	disabled: boolean;
	onPick: (address: string) => void;
	onClose: () => void;
}) {
	const { getApi } = useSocialApi();
	const [profiles, setProfiles] = useState<string[]>([]);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		let cancelled = false;
		(async () => {
			try {
				setLoading(true);
				setError(null);
				const entries =
					await getApi().query.SocialProfiles.Profiles.getEntries();
				if (cancelled) return;
				setProfiles(entries.map((e) => e.keyArgs[0].toString()));
			} catch (e) {
				if (!cancelled)
					setError(e instanceof Error ? e.message : "Failed to load profiles");
			} finally {
				if (!cancelled) setLoading(false);
			}
		})();
		return () => {
			cancelled = true;
		};
	}, [getApi]);

	const pickable = useMemo(
		() => profiles.filter((a) => !excluded.has(a)),
		[profiles, excluded],
	);

	return (
		<div className="rounded-xl border border-brand-500/30 bg-brand-500/5 p-3 space-y-2">
			<div className="flex items-center justify-between">
				<span className="text-[11px] uppercase tracking-wider font-semibold text-brand-500">
					Pick an account to sponsor
				</span>
				<button
					type="button"
					onClick={onClose}
					className="text-[11px] text-surface-400 hover:text-surface-100"
				>
					Close
				</button>
			</div>

			{loading ? (
				<div className="flex items-center justify-center py-8">
					<div className="w-5 h-5 border-2 border-brand-500/30 border-t-brand-500 rounded-full animate-spin" />
				</div>
			) : error ? (
				<p className="rounded-lg bg-danger/10 border border-danger/20 px-3 py-2 text-xs text-danger">
					{error}
				</p>
			) : pickable.length === 0 ? (
				<div className="rounded-lg border border-surface-800 px-3 py-4 text-center space-y-1">
					<p className="text-xs font-medium">No accounts to pick</p>
					<p className="text-[11px] text-secondary">
						{profiles.length === 0
							? "No profiles exist on chain yet."
							: "You already sponsor everyone, or the remaining profiles are excluded."}
					</p>
				</div>
			) : (
				<div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-80 overflow-y-auto pr-1">
					{pickable.map((addr) => (
						<ProfileCard
							key={addr}
							address={addr}
							disabled={disabled}
							onClick={() => onPick(addr)}
						/>
					))}
				</div>
			)}
		</div>
	);
}

function ProfileCard({
	address,
	disabled,
	onClick,
}: {
	address: string;
	disabled: boolean;
	onClick: () => void;
}) {
	const { getProfile } = useProfileCache();
	const profile = getProfile(address);
	const truncated = `${address.slice(0, 6)}…${address.slice(-4)}`;

	return (
		<button
			type="button"
			onClick={onClick}
			disabled={disabled}
			className="flex items-center gap-3 px-3 py-2.5 rounded-xl border border-surface-700 hover:border-brand-500/40 hover:bg-brand-500/5 text-left transition-colors"
		>
			{profile?.avatar ? (
				<img
					src={profile.avatar}
					alt={profile.name}
					className="w-9 h-9 rounded-full object-cover bg-surface-800 shrink-0"
				/>
			) : (
				<div className="w-9 h-9 rounded-full bg-brand-500/20 flex items-center justify-center text-brand-500 text-xs font-bold shrink-0">
					{profile?.name?.[0]?.toUpperCase() || address.slice(2, 4)}
				</div>
			)}
			<div className="min-w-0 flex-1">
				<div className="flex items-center gap-1.5">
					<span className="text-sm font-medium truncate">
						{profile?.name || truncated}
					</span>
					{profile?.verified && <VerifiedBadge size="sm" />}
				</div>
				<span className="text-[11px] font-mono text-surface-500 truncate">
					{truncated}
				</span>
			</div>
		</button>
	);
}
