import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
	ArrowUpRight,
	Sparkles,
	Plug,
	UserPlus,
	Users,
	Layers,
	MessageSquare,
	Coins,
} from "lucide-react";
import { useChainStore } from "../store/chainStore";
import { useSelectedAccount } from "../hooks/social/useSelectedAccount";
import { useProfileGate } from "../hooks/social/useProfileGate";
import { useSocialApi } from "../hooks/social/useSocialApi";
import { useIpfs } from "../hooks/social/useIpfs";
import AddressDisplay from "../components/social/AddressDisplay";
import {
	Avatar,
	Badge,
	Button,
	Card,
	EmptyState,
	SectionHeading,
	Skeleton,
	StatTile,
	cn,
} from "../components/ui";

interface AppData {
	id: number;
	owner: string;
	metadata: string;
	status: string;
	resolvedName?: string;
	resolvedIcon?: string;
	resolvedDescription?: string;
}

interface ProtocolStats {
	profiles: number;
	apps: number;
	activeApps: number;
	posts: number;
	totalLocked: bigint;
}

const APP_BOND = 10_000_000_000n;
const PROFILE_BOND = 10_000_000_000n;

export default function HomePage() {
	const { connected, socialAvailable } = useChainStore();
	const { account } = useSelectedAccount();
	const { hasProfile } = useProfileGate();
	const { fetchProfileMetadata, ipfsUrl } = useIpfs();
	const { getApi } = useSocialApi();
	const [apps, setApps] = useState<AppData[]>([]);
	const [loadingApps, setLoadingApps] = useState(false);
	const [stats, setStats] = useState<ProtocolStats>({
		profiles: 0,
		apps: 0,
		activeApps: 0,
		posts: 0,
		totalLocked: 0n,
	});

	const loggedIn = !!account;
	const canUse = connected && socialAvailable;

	useEffect(() => {
		if (!canUse) return;
		loadApps();
		loadStats();
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [canUse]);

	async function loadStats() {
		try {
			const api = getApi();
			const [profileCount, nextAppId, nextPostId, appEntries] = await Promise.all([
				api.query.SocialProfiles.ProfileCount.getValue(),
				api.query.SocialAppRegistry.NextAppId.getValue(),
				api.query.SocialFeeds.NextPostId.getValue(),
				api.query.SocialAppRegistry.Apps.getEntries(),
			]);
			const activeApps = appEntries.filter((e) => e.value.status.type === "Active").length;
			const totalLocked =
				BigInt(activeApps) * APP_BOND + BigInt(Number(profileCount)) * PROFILE_BOND;
			setStats({
				profiles: Number(profileCount),
				apps: Number(nextAppId),
				activeApps,
				posts: Number(nextPostId),
				totalLocked,
			});
		} catch {
			/* ignore */
		}
	}

	async function loadApps() {
		try {
			setLoadingApps(true);
			const api = getApi();
			const entries = await api.query.SocialAppRegistry.Apps.getEntries();
			const appList = entries
				.map((e) => ({
					id: Number(e.keyArgs[0]),
					owner: e.value.owner.toString(),
					metadata: e.value.metadata.asText(),
					status: e.value.status.type,
				}))
				.filter((a) => a.status === "Active")
				.sort((a, b) => b.id - a.id);
			setApps(appList);

			for (const app of appList) {
				fetchProfileMetadata(app.metadata).then((meta) => {
					if (meta) {
						setApps((prev) =>
							prev.map((a) =>
								a.id === app.id
									? {
											...a,
											resolvedName: (meta as { name?: string }).name,
											resolvedIcon: (meta as { icon?: string }).icon,
											resolvedDescription: (meta as { description?: string }).description,
										}
									: a,
							),
						);
					}
				});
			}
		} catch {
			setApps([]);
		} finally {
			setLoadingApps(false);
		}
	}

	function formatUnit(planck: bigint): string {
		const whole = planck / 1_000_000_000_000n;
		const frac = planck % 1_000_000_000_000n;
		if (frac === 0n) return whole.toString();
		const fracStr = frac.toString().padStart(12, "0").replace(/0+$/, "");
		return `${whole}.${fracStr}`;
	}

	return (
		<div className="relative">
			{/* ── Hero ─────────────────────────────────────── */}
			<section className="relative mx-auto max-w-7xl px-5 pt-14 pb-20 md:pt-20 md:pb-28">
				<div className="grid grid-cols-1 gap-12 md:grid-cols-12 md:gap-8">
					<div className="md:col-span-8">
						<div className="inline-flex items-center gap-2 rounded-full border border-brand/30 bg-brand/[0.06] px-3 py-1 text-[11px] font-medium uppercase tracking-[0.12em] text-brand animate-fade-in">
							<span className="relative flex h-1.5 w-1.5">
								<span className="absolute inline-block h-1.5 w-1.5 animate-ping rounded-full bg-brand opacity-75" />
								<span className="absolute inline-block h-1.5 w-1.5 rounded-full bg-brand" />
							</span>
							Polkadot Parachain · Testnet
						</div>

						<h1 className="mt-6 font-display text-5xl font-medium tracking-[-0.035em] text-ink text-balance md:text-7xl animate-fade-up">
							The substrate for <em className="italic text-brand">social capital</em>.
						</h1>

						<p
							className="mt-6 max-w-xl text-base text-ink-muted text-pretty md:text-lg animate-fade-up"
							style={{ animationDelay: "80ms" }}
						>
							On-chain profiles, app registry, encrypted feeds and monetizable social
							graph. Shared primitives for decentralized social networks — forkable,
							composable, bonded.
						</p>

						<div
							className="mt-9 flex flex-wrap items-center gap-3 animate-fade-up"
							style={{ animationDelay: "160ms" }}
						>
							{canUse && loggedIn && hasProfile === true ? (
								<>
									<Link to="/social">
										<Button variant="primary" size="lg" trailingIcon={<ArrowUpRight size={16} />}>
											Open app
										</Button>
									</Link>
									<Link to="/social/feed">
										<Button variant="outline" size="lg">
											Go to feed
										</Button>
									</Link>
								</>
							) : canUse && loggedIn && hasProfile === false ? (
								<Link to="/create-profile">
									<Button variant="primary" size="lg" leadingIcon={<UserPlus size={16} />}>
										Create your profile
									</Button>
								</Link>
							) : (
								<>
									<Button variant="primary" size="lg" leadingIcon={<Plug size={16} />} disabled>
										Connect wallet to start
									</Button>
									<Link to="/protocol">
										<Button variant="outline" size="lg">
											Read the protocol
										</Button>
									</Link>
								</>
							)}
						</div>

						{/* Micro-metadata row: commits the "terminal" aesthetic */}
						<div
							className="mt-10 flex flex-wrap items-center gap-x-6 gap-y-2 font-mono text-[11px] text-ink-subtle animate-fade-up"
							style={{ animationDelay: "240ms" }}
						>
							<span className="inline-flex items-center gap-1.5">
								<span className="h-1 w-1 rounded-full bg-ink-faint" />
								pallet-social-profiles@51
							</span>
							<span className="inline-flex items-center gap-1.5">
								<span className="h-1 w-1 rounded-full bg-ink-faint" />
								pallet-social-feeds@54
							</span>
							<span className="inline-flex items-center gap-1.5">
								<span className="h-1 w-1 rounded-full bg-ink-faint" />
								pallet-sponsorship@56
							</span>
						</div>
					</div>

					{/* Hero sidecard: editorial quote + live block */}
					<div className="md:col-span-4">
						<div
							className="relative rounded-2xl border border-hairline/[0.08] bg-canvas-raised p-6 shadow-raised animate-fade-up"
							style={{ animationDelay: "120ms" }}
						>
							<div className="flex items-center gap-2 text-[10px] font-medium uppercase tracking-[0.14em] text-ink-subtle">
								<Sparkles size={12} strokeWidth={1.75} className="text-brand" />
								Thesis
							</div>
							<p className="mt-4 font-display text-lg font-normal leading-snug text-ink text-pretty">
								<span className="text-brand">“</span>
								Identity, content and attention are primitives — not features. Put them on
								Polkadot, bond them with capital, and let every app compose the rest.
								<span className="text-brand">”</span>
							</p>

							<div className="mt-6 border-t border-hairline/[0.06] pt-4">
								<p className="text-[10px] font-medium uppercase tracking-[0.14em] text-ink-subtle">
									Bond structure
								</p>
								<dl className="mt-3 space-y-2 font-mono text-xs tabular">
									<div className="flex justify-between">
										<dt className="text-ink-muted">Profile bond</dt>
										<dd className="text-ink">10 UNIT</dd>
									</div>
									<div className="flex justify-between">
										<dt className="text-ink-muted">App bond</dt>
										<dd className="text-ink">10 UNIT</dd>
									</div>
									<div className="flex justify-between">
										<dt className="text-ink-muted">Statement store</dt>
										<dd className="text-ink">on-chain</dd>
									</div>
								</dl>
							</div>
						</div>
					</div>
				</div>
			</section>

			{/* ── Connection gates ─────────────────────────── */}
			{!connected && (
				<section className="mx-auto max-w-7xl px-5 pb-12">
					<Card tone="overlay" padding="lg" className="text-center">
						<EmptyState
							icon={<Plug size={20} />}
							title="Not connected"
							description="Use the chain indicator in the top bar to point at a node."
						/>
					</Card>
				</section>
			)}

			{connected && socialAvailable === false && (
				<section className="mx-auto max-w-7xl px-5 pb-12">
					<Card tone="overlay" padding="lg">
						<div className="flex items-start gap-3">
							<span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-danger/10 text-danger">
								<Plug size={14} />
							</span>
							<div>
								<p className="font-semibold text-ink">Social pallets not found</p>
								<p className="mt-1 text-sm text-ink-muted">
									The connected chain doesn't expose the social pallets. Point at a node
									running this runtime.
								</p>
							</div>
						</div>
					</Card>
				</section>
			)}

			{/* ── Stats ─────────────────────────────────────── */}
			{canUse && (
				<section className="mx-auto max-w-7xl px-5 pb-16">
					<SectionHeading
						eyebrow="Protocol"
						title="Live state of the network"
						description="Everything below is read directly from chain storage on each refresh."
						action={
							<Link to="/protocol">
								<Button variant="ghost" size="sm" trailingIcon={<ArrowUpRight size={14} />}>
									Breakdown
								</Button>
							</Link>
						}
						className="mb-6"
					/>

					<div className="grid grid-cols-2 gap-3 md:grid-cols-4">
						<StatTile
							label="Profiles"
							value={stats.profiles.toLocaleString()}
							icon={<Users size={14} strokeWidth={1.75} />}
						/>
						<StatTile
							label="Apps"
							value={stats.apps.toLocaleString()}
							icon={<Layers size={14} strokeWidth={1.75} />}
							delta={{
								value: `${stats.activeApps} active`,
								tone: "flat",
							}}
						/>
						<StatTile
							label="Posts"
							value={stats.posts.toLocaleString()}
							icon={<MessageSquare size={14} strokeWidth={1.75} />}
						/>
						<Link to="/protocol" className="group block">
							<StatTile
								label="Total Locked"
								value={formatUnit(stats.totalLocked)}
								unit="UNIT"
								accent
								icon={<Coins size={14} strokeWidth={1.75} />}
								delta={{
									value: `${stats.profiles} profiles + ${stats.activeApps} apps`,
									tone: "flat",
								}}
								className="h-full transition-colors group-hover:border-brand/30"
							/>
						</Link>
					</div>
				</section>
			)}

			{/* ── Profile gate ─────────────────────────────── */}
			{canUse && loggedIn && hasProfile === false && (
				<section className="mx-auto max-w-7xl px-5 pb-16">
					<Card tone="overlay" padding="lg" glow className="overflow-hidden">
						<div className="grid gap-8 md:grid-cols-2 md:items-center">
							<div>
								<Badge tone="brand" variant="outline" size="sm" dot>
									Onboarding
								</Badge>
								<h3 className="mt-3 font-display text-3xl font-medium tracking-tight text-ink text-balance">
									Mint your identity, then everything else.
								</h3>
								<p className="mt-3 text-sm text-ink-muted text-pretty">
									Posting, following, registering apps — all of it requires a profile. It's
									a one-time 10 UNIT bond, refundable on-chain.
								</p>
								<div className="mt-6 flex items-center gap-3">
									<Link to="/create-profile">
										<Button variant="primary" size="lg" leadingIcon={<UserPlus size={16} />}>
											Create profile
										</Button>
									</Link>
									<Link to="/protocol">
										<Button variant="ghost" size="lg">
											Learn more
										</Button>
									</Link>
								</div>
							</div>

							<div className="hidden items-center justify-center md:flex">
								<div className="relative">
									<div className="absolute inset-0 -z-10 rounded-full bg-brand/20 blur-3xl" aria-hidden />
									<div className="grid grid-cols-3 gap-3">
										{[0, 1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
											<div
												key={i}
												className={cn(
													"h-12 w-12 rounded-full border border-hairline/[0.08]",
													i === 4 && "border-brand/40 bg-brand/10 shadow-glow-sm",
												)}
												style={i !== 4 ? { background: `rgb(255 255 255 / ${0.02 + (i % 4) * 0.02})` } : undefined}
											/>
										))}
									</div>
								</div>
							</div>
						</div>
					</Card>
				</section>
			)}

			{canUse && !loggedIn && (
				<section className="mx-auto max-w-7xl px-5 pb-16">
					<Card tone="overlay" padding="lg">
						<EmptyState
							icon={<Plug size={20} />}
							title="Wallet not connected"
							description="Connect a Substrate wallet from the top bar to see profiles, apps and feeds."
						/>
					</Card>
				</section>
			)}

			{/* ── Apps grid ─────────────────────────────────── */}
			{canUse && loggedIn && hasProfile === true && (
				<section className="mx-auto max-w-7xl px-5 pb-24">
					<SectionHeading
						eyebrow="Registry"
						title="Apps on the protocol"
						description="Each app bonds 10 UNIT, owns its moderation, and composes the shared feed."
						action={
							<Link to="/social/apps">
								<Button variant="ghost" size="sm" trailingIcon={<ArrowUpRight size={14} />}>
									View all
								</Button>
							</Link>
						}
						className="mb-6"
					/>

					{loadingApps ? (
						<div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
							{[0, 1, 2, 3, 4, 5].map((i) => (
								<Card key={i} padding="md">
									<div className="flex items-center gap-4">
										<Skeleton rounded="lg" className="h-12 w-12" />
										<div className="flex-1 space-y-2">
											<Skeleton className="h-3 w-24" />
											<Skeleton className="h-2.5 w-40" />
										</div>
									</div>
								</Card>
							))}
						</div>
					) : apps.length === 0 ? (
						<Card tone="overlay" padding="lg">
							<EmptyState
								icon={<Layers size={20} />}
								title="No apps yet"
								description="Be the first to register an app on the protocol."
								action={
									<Link to="/social/apps">
										<Button variant="primary" size="md" leadingIcon={<UserPlus size={14} />}>
											Register first app
										</Button>
									</Link>
								}
							/>
						</Card>
					) : (
						<div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
							{apps.map((app) => (
								<Link key={app.id} to={`/app/${app.id}`} className="group">
									<Card interactive padding="md" className="h-full">
										<div className="flex items-start gap-4">
											{app.resolvedIcon ? (
												<img
													src={ipfsUrl(app.resolvedIcon)}
													alt=""
													className="h-12 w-12 shrink-0 rounded-lg object-cover"
												/>
											) : (
												<Avatar
													size="lg"
													shape="square"
													seed={`app-${app.id}`}
													alt={`App ${app.id}`}
												/>
											)}
											<div className="min-w-0 flex-1">
												<div className="flex items-center gap-2">
													<p className="truncate text-sm font-semibold text-ink">
														{app.resolvedName || `App #${app.id}`}
													</p>
													<Badge tone="success" size="sm" dot>
														Active
													</Badge>
												</div>
												{app.resolvedDescription ? (
													<p className="mt-1 line-clamp-2 text-xs text-ink-muted">
														{app.resolvedDescription}
													</p>
												) : (
													<p className="mt-1 font-mono text-[10px] text-ink-subtle">
														no metadata
													</p>
												)}
												<div className="mt-3 flex items-center gap-1.5 text-[10px] text-ink-subtle">
													<span className="uppercase tracking-[0.12em]">Owner</span>
													<span className="font-mono">
														<AddressDisplay address={app.owner} chars={5} />
													</span>
												</div>
											</div>
											<ArrowUpRight
												size={14}
												className="text-ink-faint transition-all group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-brand"
												strokeWidth={1.75}
											/>
										</div>
									</Card>
								</Link>
							))}
						</div>
					)}
				</section>
			)}
		</div>
	);
}
