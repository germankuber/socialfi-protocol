interface StatCardProps {
	label: string;
	value: string | number;
	accentColor?: string;
}

export default function StatCard({ label, value, accentColor = "text-text-primary" }: StatCardProps) {
	return (
		<div className="card text-center">
			<p className={`text-2xl font-bold font-mono ${accentColor}`}>{value}</p>
			<p className="text-xs text-text-tertiary uppercase tracking-wider mt-1">{label}</p>
		</div>
	);
}
