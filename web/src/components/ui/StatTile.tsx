import type { ReactNode } from "react";
import { cn } from "./cn";

interface StatTileProps {
	label: string;
	value: ReactNode;
	unit?: string;
	delta?: { value: string; tone?: "up" | "down" | "flat" };
	icon?: ReactNode;
	accent?: boolean;
	className?: string;
}

export function StatTile({ label, value, unit, delta, icon, accent, className }: StatTileProps) {
	return (
		<div
			className={cn(
				"group relative overflow-hidden rounded-xl border border-hairline/[0.07] bg-canvas-raised p-5",
				"transition-colors duration-200 hover:border-hairline/[0.14]",
				accent && "bg-gradient-to-br from-brand/[0.08] via-canvas-raised to-canvas-raised",
				className,
			)}
		>
			<div className="flex items-start justify-between">
				<div className="text-[10px] font-medium uppercase tracking-[0.14em] text-ink-subtle">
					{label}
				</div>
				{icon ? (
					<div
						className={cn(
							"text-ink-subtle transition-colors",
							accent ? "text-brand/80" : "group-hover:text-ink-muted",
						)}
					>
						{icon}
					</div>
				) : null}
			</div>

			<div className="mt-4 flex items-baseline gap-1.5">
				<span className="font-display text-4xl font-medium tabular text-ink tracking-tight">
					{value}
				</span>
				{unit ? <span className="text-sm font-medium text-ink-subtle">{unit}</span> : null}
			</div>

			{delta ? (
				<div
					className={cn(
						"mt-2 inline-flex items-center gap-1 text-xs tabular",
						delta.tone === "up" && "text-success",
						delta.tone === "down" && "text-danger",
						(!delta.tone || delta.tone === "flat") && "text-ink-subtle",
					)}
				>
					{delta.tone === "up" && <span aria-hidden>↑</span>}
					{delta.tone === "down" && <span aria-hidden>↓</span>}
					{delta.tone === "flat" && <span aria-hidden>·</span>}
					{delta.value}
				</div>
			) : null}
		</div>
	);
}
