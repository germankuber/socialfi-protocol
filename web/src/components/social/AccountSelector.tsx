import { devAccounts } from "../../hooks/useAccount";
import { useSelectedAccount } from "../../hooks/social/useSelectedAccount";

export default function AccountSelector() {
	const { selectedAccount, setSelectedAccount } = useSelectedAccount();

	return (
		<div>
			<label className="label">Dev Account</label>
			<select
				value={selectedAccount}
				onChange={(e) => setSelectedAccount(parseInt(e.target.value))}
				className="input-field w-full"
			>
				{devAccounts.map((acc, i) => (
					<option key={i} value={i}>
						{acc.name} — {acc.address.slice(0, 8)}...{acc.address.slice(-6)}
					</option>
				))}
			</select>
		</div>
	);
}
