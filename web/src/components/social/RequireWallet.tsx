import { Link } from "react-router-dom";
import { useSelectedAccount } from "../../hooks/social/useSelectedAccount";

interface RequireWalletProps {
	children: React.ReactNode;
}

/** Blocks content if no wallet is connected. Shows a connect prompt instead. */
export default function RequireWallet({ children }: RequireWalletProps) {
	const { account } = useSelectedAccount();

	if (!account) {
		return (
			<div className="panel text-center py-12 space-y-4">
				<div className="w-16 h-16 rounded-full bg-surface-800 flex items-center justify-center mx-auto">
					<svg
						className="w-8 h-8 text-surface-600"
						fill="none"
						viewBox="0 0 24 24"
						stroke="currentColor"
						strokeWidth={1.5}
					>
						<path
							strokeLinecap="round"
							strokeLinejoin="round"
							d="M21 12a2.25 2.25 0 00-2.25-2.25H15a3 3 0 11-6 0H5.25A2.25 2.25 0 003 12m18 0v6a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 18v-6m18 0V9M3 12V9m18 0a2.25 2.25 0 00-2.25-2.25H5.25A2.25 2.25 0 013 9m18 0V6a2.25 2.25 0 00-2.25-2.25H5.25A2.25 2.25 0 013 6v3"
						/>
					</svg>
				</div>
				<p className="text-secondary">Connect a wallet to continue.</p>
				<Link to="/social/accounts" className="btn-brand btn-sm inline-flex">
					Connect Wallet
				</Link>
				<style>{`html.light .bg-surface-800 { background: #f4f4f5; }`}</style>
			</div>
		);
	}

	return <>{children}</>;
}
