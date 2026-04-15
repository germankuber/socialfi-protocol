import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useSocialApi } from "../hooks/social/useSocialApi";
import AuthorDisplay from "../components/social/AuthorDisplay";

interface BondEntry {
	type: "profile" | "app";
	address: string;
	appId?: number;
	bondAmount: bigint;
	createdAt: number;
}

const BOND = 10_000_000_000n; // 10 * EXISTENTIAL_DEPOSIT
const UNIT = 1_000_000_000_000n;

function formatUnit(planck: bigint): string {
	const whole = planck / UNIT;
	const frac = planck % UNIT;
	if (frac === 0n) return whole.toString();
	return `${whole}.${frac.toString().padStart(12, "0").replace(/0+$/, "")}`;
}

export default function ProtocolStatsPage() {
	const { getApi } = useSocialApi();
	const [bonds, setBonds] = useState<BondEntry[]>([]);
	const [loading, setLoading] = useState(true);
	const [totalLocked, setTotalLocked] = useState(0n);

	useEffect(() => {
		loadBonds();
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	async function loadBonds() {
		try {
			setLoading(true);
			const api = getApi();
			const [profileEntries, appEntries] = await Promise.all([
				api.query.SocialProfiles.Profiles.getEntries(),
				api.query.SocialAppRegistry.Apps.getEntries(),
			]);

			const entries: BondEntry[] = [];

			for (const e of profileEntries) {
				entries.push({
					type: "profile",
					address: e.keyArgs[0].toString(),
					bondAmount: BOND,
					createdAt: Number(e.value.created_at),
				});
			}

			for (const e of appEntries) {
				if (e.value.status.type === "Active") {
					entries.push({
						type: "app",
						address: e.value.owner.toString(),
						appId: Number(e.keyArgs[0]),
						bondAmount: BOND,
						createdAt: Number(e.value.created_at),
					});
				}
			}

			entries.sort((a, b) => b.createdAt - a.createdAt);
			setBonds(entries);
			setTotalLocked(entries.reduce((s, e) => s + e.bondAmount, 0n));
		} catch {
			setBonds([]);
		} finally {
			setLoading(false);
		}
	}

	return (
		<div className="space-y-6 animate-fade-in">
			<Link to="/" className="inline-flex items-center gap-1 text-xs text-secondary hover:text-surface-100 transition-colors">
				<svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
					<path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
				</svg>
				Back
			</Link>

			{/* Header */}
			<div className="text-center space-y-2">
				<h1 className="heading-1">Protocol Locked Funds</h1>
				<p className="text-3xl font-bold font-mono text-brand-500">{formatUnit(totalLocked)} <span className="text-lg text-secondary">UNIT</span></p>
				<p className="text-secondary text-sm">
					{bonds.filter((b) => b.type === "profile").length} profile bonds + {bonds.filter((b) => b.type === "app").length} app bonds
				</p>
			</div>

			{/* Bond list */}
			<div className="panel space-y-1">
				<div className="flex items-center justify-between mb-3">
					<h2 className="heading-2">All Bonds ({bonds.length})</h2>
					<button onClick={loadBonds} disabled={loading} className="btn-ghost btn-sm">
						{loading ? "..." : "Refresh"}
					</button>
				</div>

				{loading ? (
					<div className="flex items-center justify-center py-8">
						<div className="w-5 h-5 border-2 border-surface-600 border-t-brand-500 rounded-full animate-spin" />
					</div>
				) : bonds.length === 0 ? (
					<p className="text-secondary text-sm text-center py-8">No bonds yet.</p>
				) : (
					<div className="divide-y divide-surface-800">
						{bonds.map((bond, i) => (
							<div key={`${bond.type}-${bond.address}-${bond.appId ?? i}`} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
								{/* Icon */}
								<div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
									bond.type === "profile" ? "bg-purple-500/10" : "bg-orange-500/10"
								}`}>
									<svg className={`w-4 h-4 ${bond.type === "profile" ? "text-purple-500" : "text-orange-500"}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
										{bond.type === "profile" ? (
											<path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
										) : (
											<path strokeLinecap="round" strokeLinejoin="round" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6z" />
										)}
									</svg>
								</div>

								{/* Info */}
								<div className="flex-1 min-w-0">
									<div className="flex items-center gap-2">
										<span className={`text-sm font-medium ${bond.type === "profile" ? "text-purple-400" : "text-orange-400"}`}>
											{bond.type === "profile" ? "Profile Bond" : `App #${bond.appId} Bond`}
										</span>
										{bond.type === "app" && (
											<Link to={`/app/${bond.appId}`} className="text-[10px] text-brand-500 hover:underline">
												View App
											</Link>
										)}
									</div>
									<div className="flex items-center gap-2 mt-0.5">
										<AuthorDisplay address={bond.address} size="sm" showIdentityStatus={false} />
										<span className="text-[10px] text-surface-500 font-mono">Block #{bond.createdAt}</span>
									</div>
								</div>

								{/* Amount */}
								<span className="font-mono text-sm font-semibold text-brand-500 shrink-0">
									{formatUnit(bond.bondAmount)} UNIT
								</span>
							</div>
						))}
						<style>{`html.light .divide-surface-800 { --tw-divide-opacity: 1; --tw-divide-color: #e4e4e7; }`}</style>
					</div>
				)}
			</div>

			{/* Link to transactions */}
			<Link to="/social/transactions" className="panel-hover block text-center py-4">
				<span className="text-sm text-brand-500 font-medium">View all transactions →</span>
			</Link>
		</div>
	);
}
