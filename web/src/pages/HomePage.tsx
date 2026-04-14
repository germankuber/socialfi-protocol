import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useChainStore } from "../store/chainStore";
import { useConnection } from "../hooks/useConnection";
import { getClient } from "../hooks/useChain";
import { LOCAL_WS_URL } from "../config/network";

export default function HomePage() {
	const { wsUrl, connected, blockNumber, socialAvailable } = useChainStore();
	const { connect } = useConnection();
	const [urlInput, setUrlInput] = useState(wsUrl);
	const [error, setError] = useState<string | null>(null);
	const [chainName, setChainName] = useState<string | null>(null);
	const [connecting, setConnecting] = useState(false);

	useEffect(() => {
		setUrlInput(wsUrl);
	}, [wsUrl]);

	useEffect(() => {
		if (!connected) return;
		getClient(wsUrl)
			.getChainSpecData()
			.then((data) => setChainName(data.name))
			.catch(() => {});
	}, [connected, wsUrl]);

	async function handleConnect() {
		setConnecting(true);
		setError(null);
		setChainName(null);
		try {
			const result = await connect(urlInput);
			if (result?.ok && result.chain) {
				setChainName(result.chain.name);
			}
		} catch {
			setError("Could not connect. Is the chain running?");
		} finally {
			setConnecting(false);
		}
	}

	return (
		<div className="space-y-10 animate-fade-in">
			{/* Hero */}
			<div className="text-center space-y-4 py-8">
				<div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-polka-500/10 border border-polka-500/20 text-polka-400 text-xs font-medium mb-2">
					<span className="w-1.5 h-1.5 rounded-full bg-polka-500 animate-pulse-slow" />
					Built on Polkadot
				</div>
				<h1 className="text-4xl sm:text-5xl font-bold font-display tracking-tight leading-tight">
					Decentralized{" "}
					<span className="bg-gradient-to-r from-polka-400 via-accent-purple to-accent-blue bg-clip-text text-transparent">
						Social Protocol
					</span>
				</h1>
				<p className="text-text-secondary text-lg max-w-xl mx-auto leading-relaxed">
					Profiles, apps, feeds, and social graph — shared primitives for the next
					generation of social networks.
				</p>
			</div>

			{/* Connection */}
			<div className="card space-y-4">
				<h2 className="section-title">Connect to Chain</h2>
				<div className="flex gap-2">
					<input
						type="text"
						value={urlInput}
						onChange={(e) => setUrlInput(e.target.value)}
						onKeyDown={(e) => e.key === "Enter" && handleConnect()}
						placeholder={LOCAL_WS_URL}
						className="input-field flex-1"
					/>
					<button onClick={handleConnect} disabled={connecting} className="btn-primary">
						{connecting ? "..." : "Connect"}
					</button>
				</div>

				{error && <p className="text-sm text-accent-red">{error}</p>}

				{connected && (
					<div className="grid grid-cols-3 gap-4 pt-2">
						<StatusPill label="Chain" value={chainName || "..."} />
						<StatusPill label="Block" value={`#${blockNumber}`} mono />
						<StatusPill
							label="Social"
							value={
								socialAvailable === null
									? "Detecting..."
									: socialAvailable
										? "Available"
										: "Not found"
							}
							color={
								socialAvailable === true
									? "text-accent-green"
									: socialAvailable === false
										? "text-accent-red"
										: "text-accent-yellow"
							}
						/>
					</div>
				)}
			</div>

			{/* Feature grid */}
			{connected && socialAvailable && (
				<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
					<FeatureLink
						to="/social/profile"
						title="Profile"
						description="Create your on-chain social identity with metadata."
						icon="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
						color="from-accent-purple to-polka-500"
					/>
					<FeatureLink
						to="/social/apps"
						title="App Registry"
						description="Register social apps that consume shared primitives."
						icon="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z"
						color="from-accent-orange to-accent-yellow"
					/>
					<FeatureLink
						to="/social/feed"
						title="Feed"
						description="Create posts and replies with configurable fees."
						icon="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z"
						color="from-accent-blue to-accent-purple"
					/>
					<FeatureLink
						to="/social/graph"
						title="Social Graph"
						description="Follow users with paid relationships across all apps."
						icon="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"
						color="from-accent-green to-accent-blue"
					/>
				</div>
			)}
		</div>
	);
}

function StatusPill({
	label,
	value,
	mono,
	color,
}: {
	label: string;
	value: string;
	mono?: boolean;
	color?: string;
}) {
	return (
		<div className="text-center">
			<p className="text-[10px] font-medium text-text-tertiary uppercase tracking-widest mb-0.5">
				{label}
			</p>
			<p className={`text-sm font-semibold ${color || "text-text-primary"} ${mono ? "font-mono" : ""}`}>
				{value}
			</p>
		</div>
	);
}

function FeatureLink({
	to,
	title,
	description,
	icon,
	color,
}: {
	to: string;
	title: string;
	description: string;
	icon: string;
	color: string;
}) {
	return (
		<Link to={to} className="card-hover group block">
			<div className="flex items-start gap-3.5">
				<div
					className={`w-10 h-10 rounded-xl bg-gradient-to-br ${color} flex items-center justify-center shrink-0 opacity-80 group-hover:opacity-100 transition-opacity`}
				>
					<svg
						className="w-5 h-5 text-white"
						fill="none"
						viewBox="0 0 24 24"
						stroke="currentColor"
						strokeWidth={1.5}
					>
						<path strokeLinecap="round" strokeLinejoin="round" d={icon} />
					</svg>
				</div>
				<div>
					<h3 className="font-semibold font-display text-text-primary group-hover:text-white transition-colors">
						{title}
					</h3>
					<p className="text-sm text-text-secondary mt-0.5">{description}</p>
				</div>
			</div>
		</Link>
	);
}
