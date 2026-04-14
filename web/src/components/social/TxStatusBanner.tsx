interface TxStatusBannerProps {
	status: string | null;
	isError: boolean;
}

export default function TxStatusBanner({ status, isError }: TxStatusBannerProps) {
	if (!status) return null;

	return (
		<div
			className={`rounded-xl px-4 py-3 text-sm font-medium flex items-center gap-2 animate-fade-in ${
				isError
					? "bg-danger/10 text-danger border border-danger/20"
					: "bg-success/10 text-success border border-success/20"
			}`}
		>
			<svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
				{isError ? (
					<path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
				) : (
					<path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
				)}
			</svg>
			{status}
		</div>
	);
}
