import { useEffect } from "react";
import { useChainStore, type WalletAccount } from "../../store/chainStore";
import { useSelectedAccount } from "../../hooks/social/useSelectedAccount";
import { useWallet } from "../../hooks/social/useWallet";
import AddressDisplay from "../../components/social/AddressDisplay";

const WALLET_NAMES: Record<string, string> = {
	"polkadot-js": "Polkadot.js",
	"subwallet-js": "SubWallet",
	talisman: "Talisman",
};

export default function AccountsPage() {
	const setExternalAccounts = useChainStore((s) => s.setExternalAccounts);
	const wallet = useWallet();
	const { allAccounts } = useSelectedAccount();

	// Sync wallet accounts to global store
	useEffect(() => {
		const external: WalletAccount[] = [
			...wallet.spektrAccounts.map((a) => ({
				name: a.name || "Host Account",
				address: a.address,
				signer: a.polkadotSigner,
				type: "host" as const,
			})),
			...wallet.extensionAccounts.map((a) => ({
				name: a.name || "Extension",
				address: a.address,
				signer: a.polkadotSigner,
				type: "extension" as const,
			})),
		];
		setExternalAccounts(external);
	}, [wallet.spektrAccounts, wallet.extensionAccounts, setExternalAccounts]);

	return (
		<div className="space-y-4">
			{/* Wallet connections */}
			<div className="panel space-y-4">
				<h2 className="heading-2">Connect Wallet</h2>

				{/* Spektr / Polkadot Host */}
				<div className="space-y-2">
					<div className="flex items-center justify-between">
						<p className="text-sm font-medium">Polkadot Host (Nova Mobile)</p>
						<span className={`badge ${wallet.spektrStatus === "connected" ? "badge-success" :
							wallet.spektrStatus === "unavailable" ? "badge-neutral" : "badge-danger"
							}`}>
							{wallet.spektrStatus === "connected"
								? `${wallet.spektrAccounts.length} account${wallet.spektrAccounts.length !== 1 ? "s" : ""}`
								: wallet.spektrStatus === "unavailable"
									? "Not in host"
									: wallet.spektrStatus}
						</span>
					</div>
					{wallet.spektrStatus === "unavailable" && (
						<p className="text-xs text-secondary">
							Open this app through a Polkadot Host client (Nova wallet, Spektr) to use mobile signing.
						</p>
					)}
				</div>

				<div className="divider" />

				{/* Browser extensions */}
				<div className="space-y-2">
					<p className="text-sm font-medium">Browser Extensions</p>
					{wallet.connectedWallet ? (
						<div className="flex items-center justify-between">
							<span className="badge-success">
								{WALLET_NAMES[wallet.connectedWallet] || wallet.connectedWallet} ({wallet.extensionAccounts.length})
							</span>
							<button onClick={wallet.disconnectWallet} className="btn-danger btn-sm">
								Disconnect
							</button>
						</div>
					) : wallet.availableWallets.length > 0 ? (
						<div className="flex flex-wrap gap-2">
							{wallet.availableWallets.map((name) => (
								<button
									key={name}
									onClick={() => wallet.connectWallet(name)}
									className="btn-outline btn-sm"
								>
									Connect {WALLET_NAMES[name] || name}
								</button>
							))}
						</div>
					) : (
						<p className="text-xs text-secondary">
							No browser wallets detected. Install Polkadot.js, Talisman, or SubWallet.
						</p>
					)}
				</div>
			</div>

			{/* Connected accounts */}
			{allAccounts.length > 0 && (
				<div className="panel space-y-1">
					<h2 className="heading-2 mb-3">Connected Accounts</h2>
					<div className="divide-y divide-surface-800">
						{allAccounts.map((acc) => (
							<div key={`${acc.type}-${acc.address}`} className="py-3 first:pt-0 last:pb-0">
								<div className="flex items-center justify-between mb-1">
									<div className="flex items-center gap-2">
										<span className="font-semibold text-sm">{acc.name}</span>
										<span className={`badge ${acc.type === "host" ? "badge-success" : "badge-neutral"}`}>
											{acc.type}
										</span>
									</div>
								</div>
								<AddressDisplay address={acc.address} chars={16} />
							</div>
						))}
						<style>{`html.light .divide-surface-800 { --tw-divide-opacity: 1; --tw-divide-color: #e4e4e7; }`}</style>
					</div>
				</div>
			)}
		</div>
	);
}
