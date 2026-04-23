import { Link } from "react-router-dom";
import { useSelectedAccount } from "../../hooks/social/useSelectedAccount";

const TYPE_COLORS: Record<string, string> = {
	extension: "bg-purple-500",
	host: "bg-brand-500",
};

export default function AccountSelector() {
	const { account, allAccounts, selectedAccountIndex, setSelectedAccountIndex } =
		useSelectedAccount();

	if (!account) {
		return (
			<div className="panel flex items-center justify-between">
				<p className="text-sm text-secondary">No wallet connected.</p>
				<Link to="/social/accounts" className="btn-brand btn-sm">
					Connect Wallet
				</Link>
			</div>
		);
	}

	return (
		<div className="panel flex items-center gap-4">
			<div className={`avatar ${TYPE_COLORS[account.type] || "bg-brand-500"}`}>
				{account.name[0]}
			</div>
			<div className="flex-1 min-w-0">
				<select
					value={selectedAccountIndex}
					onChange={(e) => setSelectedAccountIndex(parseInt(e.target.value))}
					className="input"
				>
					{allAccounts.map((acc, i) => (
						<option key={`${acc.type}-${acc.address}`} value={i}>
							{acc.name} ({acc.type})
						</option>
					))}
				</select>
				<p className="text-xs font-mono text-secondary mt-1 truncate">{account.address}</p>
			</div>
			<span
				className={`badge ${account.type === "host" ? "badge-success" : "badge-neutral"}`}
			>
				{account.type}
			</span>
		</div>
	);
}
