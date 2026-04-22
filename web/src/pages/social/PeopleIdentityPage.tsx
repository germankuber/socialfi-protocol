import { Link } from "react-router-dom";
import RequireWallet from "../../components/social/RequireWallet";
import IdentityPanel from "../../components/social/IdentityPanel";

export default function PeopleIdentityPage() {
	return (
		<RequireWallet>
			<div className="space-y-6 animate-fade-in">
				<Link
					to="/profile/edit"
					className="inline-flex items-center gap-1 text-xs text-secondary hover:text-surface-100 transition-colors"
				>
					<svg
						className="w-3.5 h-3.5"
						fill="none"
						viewBox="0 0 24 24"
						stroke="currentColor"
						strokeWidth={2}
					>
						<path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
					</svg>
					Back to Edit Profile
				</Link>

				<h1 className="heading-1">Register on Polkadot People</h1>
				<p className="text-sm text-secondary">
					Identity lives on the Polkadot People parachain and is reused by
					every app across the ecosystem. A registrar judgement marks your
					profile as verified everywhere.
				</p>

				<IdentityPanel />
			</div>
		</RequireWallet>
	);
}
