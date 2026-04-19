import { useEffect, useMemo, useState } from "react";
import { useSelectedAccount } from "../../hooks/social/useSelectedAccount";
import { useChainStore } from "../../store/chainStore";
import {
	ALL_SCOPE_KEYS,
	SCOPE_DESCRIPTIONS,
	useManagers,
	type ManagerScopeKey,
} from "../../hooks/social/useManagers";
import { useSocialApi } from "../../hooks/social/useSocialApi";
import RequireProfile from "../../components/social/RequireProfile";
import TxToast from "../../components/social/TxToast";
import { useProfileCache, type CachedProfile } from "../../hooks/social/useProfileCache";
import { Link } from "react-router-dom";
import VerifiedBadge from "../../components/social/VerifiedBadge";

/**
 * Lens-style Profile Manager dashboard.
 *
 * The page is split into three sections that mirror the three operations a
 * profile owner performs on their delegation set:
 *
 * 1. AddManagerCard — grant a new authorization with scopes and optional
 *    expiration.
 * 2. ManagersList — inspect and revoke individual managers.
 * 3. PanicButton — atomic revoke-all, surfaced prominently because it's the
 *    "lost my keys" emergency action and should be easy to find.
 */
export default function ManagersPage() {
	const { account } = useSelectedAccount();
	const blockNumber = useChainStore((s) => s.blockNumber);
	const ownerAddress = account?.address ?? null;
	const {
		managers,
		loading,
		error,
		tracker,
		addManager,
		removeManager,
		removeAllManagers,
	} = useManagers(ownerAddress);

	return (
		<RequireProfile>
			<div className="space-y-6 animate-fade-in">
				<header className="space-y-3">
					<h1 className="heading-1">Profile Managers</h1>
					<p className="text-secondary text-sm max-w-2xl">
						Let another account post, follow, or update your profile on your
						behalf — without handing over your keys. Each authorization is
						scoped, optionally expires, and can be revoked instantly.
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
						Custom FRAME pallet · synthesized origins + dynamic call filters
					</div>
				</header>

				{error && (
					<div className="rounded-xl px-4 py-3 text-sm font-medium bg-danger/10 text-danger border border-danger/20">
						{error}
					</div>
				)}

				<AddManagerCard
					ownerAddress={ownerAddress}
					existingManagers={managers.map((m) => m.manager)}
					disabled={!account || tracker.state.stage !== "idle"}
					onAdd={async (mgr, scopes, expiresAt) => {
						if (!account) return false;
						return addManager(mgr, scopes, expiresAt, account.signer);
					}}
				/>

				<ManagersList
					managers={managers}
					loading={loading}
					currentBlock={blockNumber}
					onRemove={async (mgr) => {
						if (!account) return;
						await removeManager(mgr, account.signer);
					}}
				/>

				{managers.length > 1 && (
					<PanicButton
						onRevokeAll={async () => {
							if (!account) return;
							await removeAllManagers(account.signer);
						}}
					/>
				)}

				<TxToast state={tracker.state} onDismiss={tracker.reset} />
			</div>
		</RequireProfile>
	);
}

/* ────────────────────────────────────────────────────────────────────── */

interface AddManagerCardProps {
	ownerAddress: string | null;
	existingManagers: string[];
	disabled: boolean;
	onAdd: (
		manager: string,
		scopes: ManagerScopeKey[],
		expiresAt: number | null,
	) => Promise<boolean>;
}

/**
 * Form used to grant a new authorization.
 *
 * The manager picker is a two-mode control: by default we present the list of
 * accounts the owner already follows (those are the people they know and are
 * most likely to delegate to), with a "paste an address" escape hatch for the
 * less-common case of authorizing a fresh account.
 */
function AddManagerCard({
	ownerAddress,
	existingManagers,
	disabled,
	onAdd,
}: AddManagerCardProps) {
	const [manager, setManager] = useState("");
	const [selectedScopes, setSelectedScopes] = useState<ManagerScopeKey[]>([
		"Post",
	]);
	const [duration, setDuration] = useState<"7d" | "30d" | "90d" | "never">(
		"30d",
	);
	const [pickerMode, setPickerMode] = useState<"following" | "address">(
		"following",
	);
	const [localError, setLocalError] = useState<string | null>(null);
	const blockNumber = useChainStore((s) => s.blockNumber);

	const excludedAddresses = useMemo(() => {
		const set = new Set(existingManagers);
		if (ownerAddress) set.add(ownerAddress);
		return set;
	}, [existingManagers, ownerAddress]);

	function toggleScope(scope: ManagerScopeKey) {
		setSelectedScopes((prev) =>
			prev.includes(scope) ? prev.filter((s) => s !== scope) : [...prev, scope],
		);
	}

	function computeExpiry(): number | null {
		if (duration === "never") return null;
		// Average block time ~6s → slots per day ~14_400.
		const daysByCode: Record<string, number> = { "7d": 7, "30d": 30, "90d": 90 };
		const blocks = daysByCode[duration] * 14_400;
		return blockNumber + blocks;
	}

	async function handleSubmit(e: React.FormEvent) {
		e.preventDefault();
		setLocalError(null);
		if (!manager.trim()) {
			setLocalError("Pick someone to authorize");
			return;
		}
		if (selectedScopes.length === 0) {
			setLocalError("Pick at least one scope");
			return;
		}
		const ok = await onAdd(manager.trim(), selectedScopes, computeExpiry());
		if (ok) {
			setManager("");
			setSelectedScopes(["Post"]);
			setDuration("30d");
		}
	}

	return (
		<form onSubmit={handleSubmit} className="panel space-y-5">
			<div className="flex items-center gap-3">
				<div className="w-10 h-10 rounded-xl bg-brand-500/10 flex items-center justify-center">
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
							d="M12 4v16m8-8H4"
						/>
					</svg>
				</div>
				<div>
					<h2 className="text-base font-semibold">Authorize a manager</h2>
					<p className="text-[11px] text-surface-500">
						They sign with their own keys; the action runs under your profile.
					</p>
				</div>
			</div>

			<div className="space-y-3">
				<div className="flex items-center justify-between">
					<label className="form-label mb-0">Pick a manager</label>
					<div className="flex gap-1 text-[11px]">
						<button
							type="button"
							onClick={() => {
								setPickerMode("following");
								setManager("");
							}}
							className={`px-2.5 py-1 rounded-lg font-semibold transition-colors ${
								pickerMode === "following"
									? "bg-brand-500/10 text-brand-500"
									: "text-surface-500 hover:text-surface-300"
							}`}
						>
							Following
						</button>
						<button
							type="button"
							onClick={() => {
								setPickerMode("address");
								setManager("");
							}}
							className={`px-2.5 py-1 rounded-lg font-semibold transition-colors ${
								pickerMode === "address"
									? "bg-brand-500/10 text-brand-500"
									: "text-surface-500 hover:text-surface-300"
							}`}
						>
							Paste address
						</button>
					</div>
				</div>

				{pickerMode === "following" ? (
					<FollowingPicker
						ownerAddress={ownerAddress}
						excluded={excludedAddresses}
						selected={manager}
						onSelect={setManager}
						disabled={disabled}
					/>
				) : (
					<input
						type="text"
						value={manager}
						onChange={(e) => setManager(e.target.value)}
						placeholder="5F3sa2TJAWMqDhXG6jhV4N8ko9SxwGy8TpaNS1repo5EYjQX"
						className="input font-mono text-xs"
						disabled={disabled}
					/>
				)}
			</div>

			<div className="space-y-2">
				<label className="form-label">Authorized scopes</label>
				<div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
					{ALL_SCOPE_KEYS.map((scope) => {
						const checked = selectedScopes.includes(scope);
						return (
							<button
								type="button"
								key={scope}
								onClick={() => toggleScope(scope)}
								disabled={disabled}
								className={`text-left px-3 py-2.5 rounded-xl border transition-colors ${
									checked
										? "border-brand-500/40 bg-brand-500/10"
										: "border-surface-700 hover:border-surface-500"
								}`}
							>
								<div className="flex items-start gap-2">
									<div
										className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 mt-0.5 ${
											checked
												? "border-brand-500 bg-brand-500"
												: "border-surface-500"
										}`}
									>
										{checked && (
											<svg
												className="w-3 h-3 text-white"
												fill="none"
												viewBox="0 0 24 24"
												stroke="currentColor"
												strokeWidth={3}
											>
												<path
													strokeLinecap="round"
													strokeLinejoin="round"
													d="M5 13l4 4L19 7"
												/>
											</svg>
										)}
									</div>
									<div className="min-w-0">
										<div className="text-sm font-medium">{scope}</div>
										<div className="text-[11px] text-surface-500 mt-0.5">
											{SCOPE_DESCRIPTIONS[scope]}
										</div>
									</div>
								</div>
							</button>
						);
					})}
				</div>
			</div>

			<div className="space-y-2">
				<label className="form-label">Expiration</label>
				<div className="flex gap-2 flex-wrap">
					{(["7d", "30d", "90d", "never"] as const).map((code) => (
						<button
							type="button"
							key={code}
							onClick={() => setDuration(code)}
							disabled={disabled}
							className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
								duration === code
									? "bg-brand-500 text-white"
									: "border border-surface-700 text-surface-400 hover:text-surface-100"
							}`}
						>
							{code === "never" ? "Never" : code.replace("d", " days")}
						</button>
					))}
				</div>
				<p className="text-[11px] text-surface-500">
					Short expirations are a defence-in-depth move: even if you forget to
					revoke, the authorization dies on its own.
				</p>
			</div>

			{localError && (
				<div className="rounded-lg px-3 py-2 text-xs bg-danger/10 text-danger border border-danger/20">
					{localError}
				</div>
			)}

			<button
				type="submit"
				className="btn-brand w-full"
				disabled={disabled || !manager.trim() || selectedScopes.length === 0}
			>
				{manager.trim()
					? "Authorize manager"
					: pickerMode === "following"
						? "Pick someone to continue"
						: "Paste an address to continue"}
			</button>
		</form>
	);
}

/* ────────────────────────────────────────────────────────────────────── */

interface ManagersListProps {
	managers: ReturnType<typeof useManagers>["managers"];
	loading: boolean;
	currentBlock: number;
	onRemove: (manager: string) => Promise<void>;
}

function ManagersList({
	managers,
	loading,
	currentBlock,
	onRemove,
}: ManagersListProps) {
	if (loading) {
		return (
			<div className="panel flex items-center justify-center py-10">
				<div className="w-5 h-5 border-2 border-brand-500/30 border-t-brand-500 rounded-full animate-spin" />
			</div>
		);
	}

	if (managers.length === 0) {
		return (
			<div className="panel text-center py-10 space-y-3">
				<div className="w-14 h-14 rounded-2xl bg-brand-500/10 border border-brand-500/20 flex items-center justify-center mx-auto">
					<svg
						className="w-7 h-7 text-brand-500"
						fill="none"
						viewBox="0 0 24 24"
						stroke="currentColor"
						strokeWidth={1.6}
					>
						<path
							strokeLinecap="round"
							strokeLinejoin="round"
							d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"
						/>
					</svg>
				</div>
				<h3 className="text-base font-semibold">No managers yet</h3>
				<p className="text-sm text-secondary max-w-sm mx-auto">
					Authorize another account above to let them post or interact on your
					behalf without sharing your keys.
				</p>
			</div>
		);
	}

	return (
		<section className="space-y-3">
			<div className="flex items-baseline justify-between">
				<h2 className="text-sm font-semibold uppercase tracking-wide text-surface-400">
					Active managers ({managers.length})
				</h2>
			</div>

			<div className="space-y-2">
				{managers.map((m) => (
					<ManagerRow
						key={m.manager}
						manager={m.manager}
						scopes={m.scopes}
						expiresAt={m.expiresAt}
						deposit={m.deposit}
						currentBlock={currentBlock}
						onRemove={() => onRemove(m.manager)}
					/>
				))}
			</div>
		</section>
	);
}

interface ManagerRowProps {
	manager: string;
	scopes: ManagerScopeKey[];
	expiresAt: number | null;
	deposit: bigint;
	currentBlock: number;
	onRemove: () => Promise<void>;
}

function ManagerRow({
	manager,
	scopes,
	expiresAt,
	currentBlock,
	deposit,
	onRemove,
}: ManagerRowProps) {
	const { getProfile } = useProfileCache();
	const profile = getProfile(manager);
	const truncated = `${manager.slice(0, 8)}…${manager.slice(-6)}`;

	const expiresInBlocks =
		expiresAt === null ? null : Math.max(0, expiresAt - currentBlock);
	const expiresInDays =
		expiresInBlocks === null ? null : Math.floor(expiresInBlocks / 14_400);
	const isExpired = expiresAt !== null && expiresAt <= currentBlock;

	return (
		<div className="panel flex flex-col sm:flex-row sm:items-center gap-3 p-4">
			<Link to={`/profile/${manager}`} className="flex items-center gap-3 flex-1 min-w-0">
				{profile?.avatar ? (
					<img
						src={profile.avatar}
						alt={profile.name}
						className="w-10 h-10 rounded-full object-cover bg-surface-800 shrink-0"
					/>
				) : (
					<div className="w-10 h-10 rounded-full bg-purple-500/20 flex items-center justify-center text-purple-400 text-xs font-bold shrink-0">
						{profile?.name?.[0]?.toUpperCase() || manager.slice(2, 4)}
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

			<div className="flex flex-wrap gap-1 sm:max-w-xs">
				{scopes.map((s) => (
					<span
						key={s}
						className="inline-flex items-center rounded-md bg-brand-500/10 text-brand-500 px-1.5 py-0.5 text-[10px] font-semibold"
					>
						{s}
					</span>
				))}
			</div>

			<div className="text-right">
				{expiresAt === null ? (
					<span className="text-[11px] text-surface-500">Never expires</span>
				) : isExpired ? (
					<span className="text-[11px] text-danger font-medium">Expired</span>
				) : (
					<span className="text-[11px] text-surface-400">
						~{expiresInDays}d left
					</span>
				)}
				{deposit > 0n && (
					<div className="text-[10px] text-surface-600 mt-0.5">
						{deposit.toString()} planck reserved
					</div>
				)}
			</div>

			<button
				onClick={onRemove}
				className="px-3 py-1.5 rounded-lg text-xs font-medium text-danger border border-danger/30 hover:bg-danger/10 transition-colors shrink-0"
			>
				Revoke
			</button>
		</div>
	);
}

/* ────────────────────────────────────────────────────────────────────── */

function PanicButton({ onRevokeAll }: { onRevokeAll: () => Promise<void> }) {
	const [armed, setArmed] = useState(false);

	return (
		<section className="rounded-2xl border border-danger/30 bg-danger/5 p-5 space-y-3">
			<div className="flex items-center gap-3">
				<div className="w-10 h-10 rounded-xl bg-danger/10 flex items-center justify-center shrink-0">
					<svg
						className="w-5 h-5 text-danger"
						fill="none"
						viewBox="0 0 24 24"
						stroke="currentColor"
						strokeWidth={1.7}
					>
						<path
							strokeLinecap="round"
							strokeLinejoin="round"
							d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
						/>
					</svg>
				</div>
				<div className="flex-1">
					<h3 className="text-sm font-semibold text-danger">
						Revoke every manager
					</h3>
					<p className="text-[11px] text-surface-400 mt-0.5">
						Wipes every authorization in a single transaction and refunds all
						reserved deposits. Use if you suspect key compromise.
					</p>
				</div>
			</div>

			{!armed ? (
				<button
					onClick={() => setArmed(true)}
					className="w-full px-3 py-2 rounded-lg text-xs font-semibold text-danger border border-danger/40 hover:bg-danger/10 transition-colors"
				>
					Arm emergency revoke
				</button>
			) : (
				<div className="flex gap-2">
					<button
						onClick={() => setArmed(false)}
						className="flex-1 px-3 py-2 rounded-lg text-xs font-medium border border-surface-700 hover:border-surface-500 transition-colors"
					>
						Cancel
					</button>
					<button
						onClick={async () => {
							await onRevokeAll();
							setArmed(false);
						}}
						className="flex-1 px-3 py-2 rounded-lg text-xs font-semibold bg-danger text-white hover:bg-danger/90 transition-colors"
					>
						Confirm revoke-all
					</button>
				</div>
			)}
		</section>
	);
}

/* ────────────────────────────────────────────────────────────────────── */

interface FollowingPickerProps {
	ownerAddress: string | null;
	/** Accounts that must not be selectable (self + already-authorized). */
	excluded: Set<string>;
	/** Currently-picked address, or empty string when nothing is selected. */
	selected: string;
	onSelect: (address: string) => void;
	disabled: boolean;
}

/**
 * Visual picker: a grid of cards for every account the owner follows, each
 * with avatar + display name. Clicking a card sets it as the manager
 * candidate. Accounts already-authorized as managers (or self) are excluded
 * from the list so the user never picks a dead-end entry.
 */
function FollowingPicker({
	ownerAddress,
	excluded,
	selected,
	onSelect,
	disabled,
}: FollowingPickerProps) {
	const { getApi } = useSocialApi();
	const [following, setFollowing] = useState<string[]>([]);
	const [loading, setLoading] = useState(false);
	const [loadError, setLoadError] = useState<string | null>(null);

	useEffect(() => {
		if (!ownerAddress) {
			setFollowing([]);
			return;
		}
		let cancelled = false;
		(async () => {
			try {
				setLoading(true);
				setLoadError(null);
				const api = getApi();
				const entries =
					await api.query.SocialGraph.Follows.getEntries(ownerAddress);
				if (cancelled) return;
				setFollowing(entries.map((e) => e.keyArgs[1].toString()));
			} catch (e) {
				if (!cancelled)
					setLoadError(e instanceof Error ? e.message : "Failed to load follows");
			} finally {
				if (!cancelled) setLoading(false);
			}
		})();
		return () => {
			cancelled = true;
		};
	}, [ownerAddress, getApi]);

	const pickable = useMemo(
		() => following.filter((a) => !excluded.has(a)),
		[following, excluded],
	);

	if (loading) {
		return (
			<div className="flex items-center justify-center py-10 rounded-xl border border-surface-800">
				<div className="w-5 h-5 border-2 border-brand-500/30 border-t-brand-500 rounded-full animate-spin" />
			</div>
		);
	}

	if (loadError) {
		return (
			<div className="rounded-xl border border-danger/30 bg-danger/5 px-4 py-3 text-xs text-danger">
				{loadError}
			</div>
		);
	}

	if (pickable.length === 0) {
		const noFollows = following.length === 0;
		return (
			<div className="rounded-xl border border-surface-800 px-4 py-6 text-center space-y-3">
				<p className="text-sm font-medium">Nobody to pick yet</p>
				<p className="text-xs text-secondary max-w-sm mx-auto">
					{noFollows
						? "Follow someone first, then come back here to authorize them as a manager."
						: "Everyone you follow is already a manager. Revoke one first, or use the \"Paste address\" tab."}
				</p>
				<Link
					to={noFollows ? "/people" : "/social/graph"}
					className="inline-flex items-center gap-1 text-[11px] font-semibold text-brand-500 hover:underline"
				>
					{noFollows ? "Browse people to follow" : "Go to Social Graph"} →
				</Link>
			</div>
		);
	}

	return (
		<div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-80 overflow-y-auto pr-1">
			{pickable.map((address) => (
				<FollowingCard
					key={address}
					address={address}
					selected={selected === address}
					disabled={disabled}
					onClick={() => onSelect(address)}
				/>
			))}
		</div>
	);
}

/**
 * A single clickable row in the `FollowingPicker`. Resolves name + avatar
 * lazily via `useProfileCache` so freshly-rendered cards don't block on the
 * IPFS fetch for the whole list.
 */
function FollowingCard({
	address,
	selected,
	disabled,
	onClick,
}: {
	address: string;
	selected: boolean;
	disabled: boolean;
	onClick: () => void;
}) {
	// `getProfile` is lazy: first call for a given address kicks off the IPFS
	// fetch and returns null; the cache re-renders the component once it
	// resolves. That means we can treat it as a plain accessor here.
	const { getProfile } = useProfileCache();
	const profile: CachedProfile | null = getProfile(address);

	const truncated = `${address.slice(0, 6)}…${address.slice(-4)}`;

	return (
		<button
			type="button"
			onClick={onClick}
			disabled={disabled}
			className={`flex items-center gap-3 px-3 py-2.5 rounded-xl border text-left transition-colors ${
				selected
					? "border-brand-500/40 bg-brand-500/10"
					: "border-surface-700 hover:border-surface-500"
			}`}
		>
			{profile?.avatar ? (
				<img
					src={profile.avatar}
					alt={profile.name}
					className="w-10 h-10 rounded-full object-cover bg-surface-800 shrink-0"
				/>
			) : (
				<div className="w-10 h-10 rounded-full bg-brand-500/20 flex items-center justify-center text-brand-500 text-xs font-bold shrink-0">
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
			<div
				className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 ${
					selected ? "border-brand-500 bg-brand-500" : "border-surface-600"
				}`}
			>
				{selected && (
					<svg
						className="w-2.5 h-2.5 text-white"
						fill="none"
						viewBox="0 0 24 24"
						stroke="currentColor"
						strokeWidth={3}
					>
						<path
							strokeLinecap="round"
							strokeLinejoin="round"
							d="M5 13l4 4L19 7"
						/>
					</svg>
				)}
			</div>
		</button>
	);
}
