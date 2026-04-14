interface TxStatusBannerProps {
	status: string | null;
	isError: boolean;
}

export default function TxStatusBanner({ status, isError }: TxStatusBannerProps) {
	if (!status) return null;

	return (
		<div
			className={`rounded-lg px-4 py-2.5 text-sm font-medium ${
				isError
					? "bg-accent-red/10 text-accent-red border border-accent-red/20"
					: "bg-accent-green/10 text-accent-green border border-accent-green/20"
			}`}
		>
			{status}
		</div>
	);
}
