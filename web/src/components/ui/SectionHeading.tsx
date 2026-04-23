import type { ReactNode } from "react";
import { cn } from "./cn";

interface SectionHeadingProps {
	eyebrow?: string;
	title: ReactNode;
	description?: ReactNode;
	action?: ReactNode;
	className?: string;
	align?: "start" | "center";
}

export function SectionHeading({
	eyebrow,
	title,
	description,
	action,
	className,
	align = "start",
}: SectionHeadingProps) {
	return (
		<div
			className={cn(
				"flex items-end justify-between gap-6",
				align === "center" && "flex-col items-center text-center",
				className,
			)}
		>
			<div className={cn("max-w-2xl space-y-2", align === "center" && "mx-auto")}>
				{eyebrow ? (
					<div
						className={cn(
							"inline-flex items-center gap-2 text-[10px] font-medium uppercase tracking-[0.16em] text-ink-subtle",
						)}
					>
						<span className="h-px w-5 bg-hairline/20" />
						{eyebrow}
					</div>
				) : null}
				<h2 className="font-display text-3xl font-medium tracking-tight text-ink text-balance">
					{title}
				</h2>
				{description ? (
					<p className="text-sm text-ink-muted text-pretty">{description}</p>
				) : null}
			</div>
			{action && align !== "center" ? <div className="shrink-0 pb-1">{action}</div> : null}
		</div>
	);
}
