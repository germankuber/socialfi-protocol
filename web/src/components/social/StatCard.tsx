interface StatCardProps {
	label: string;
	value: string | number;
	icon?: string;
}

export default function StatCard({ label, value, icon }: StatCardProps) {
	return (
		<div className="panel flex items-center gap-4">
			{icon && (
				<div className="w-10 h-10 rounded-xl bg-brand-500/10 flex items-center justify-center shrink-0">
					<svg
						className="w-5 h-5 text-brand-500"
						fill="none"
						viewBox="0 0 24 24"
						stroke="currentColor"
						strokeWidth={1.5}
					>
						<path strokeLinecap="round" strokeLinejoin="round" d={icon} />
					</svg>
				</div>
			)}
			<div>
				<p className="text-2xl font-bold font-mono">{value}</p>
				<p className="text-xs text-secondary uppercase tracking-wider">{label}</p>
			</div>
		</div>
	);
}
