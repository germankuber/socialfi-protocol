import { devAccounts } from "../../hooks/useAccount";
import { useSelectedAccount } from "../../hooks/social/useSelectedAccount";

const AVATAR_COLORS = ["bg-brand-500", "bg-info", "bg-success"];

export default function AccountSelector() {
	const { account, selectedAccount, setSelectedAccount } = useSelectedAccount();

	return (
		<div className="panel flex items-center gap-4">
			<div className={`avatar ${AVATAR_COLORS[selectedAccount] || "bg-brand-500"}`}>
				{account.name[0]}
			</div>
			<div className="flex-1 min-w-0">
				<select
					value={selectedAccount}
					onChange={(e) => setSelectedAccount(parseInt(e.target.value))}
					className="input"
				>
					{devAccounts.map((acc, i) => (
						<option key={i} value={i}>
							{acc.name}
						</option>
					))}
				</select>
				<p className="text-xs font-mono text-secondary mt-1 truncate">
					{account.address}
				</p>
			</div>
		</div>
	);
}
