import { Link } from "react-router-dom";
import { useProfileGate } from "../../hooks/social/useProfileGate";
import RequireWallet from "./RequireWallet";

interface RequireProfileProps {
	children: React.ReactNode;
}

/** Blocks content if no wallet connected OR no profile exists. */
export default function RequireProfile({ children }: RequireProfileProps) {
	const { hasProfile, loading } = useProfileGate();

	return (
		<RequireWallet>
			{loading ? (
				<div className="panel flex items-center justify-center py-8">
					<div className="w-5 h-5 border-2 border-surface-600 border-t-brand-500 rounded-full animate-spin" />
				</div>
			) : hasProfile === false ? (
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
								d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
							/>
						</svg>
					</div>
					<div>
						<p className="font-semibold">Profile required</p>
						<p className="text-secondary text-sm mt-1">
							You need to create a profile before using this feature.
						</p>
					</div>
					<Link to="/create-profile" className="btn-brand btn-sm inline-flex">
						Create Profile
					</Link>
					<style>{`html.light .bg-surface-800 { background: #f4f4f5; }`}</style>
				</div>
			) : (
				<>{children}</>
			)}
		</RequireWallet>
	);
}
