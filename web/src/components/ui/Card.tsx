import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "./cn";

type CardTone = "default" | "sunken" | "overlay" | "flush";
type CardPadding = "none" | "sm" | "md" | "lg";

interface CardProps extends HTMLAttributes<HTMLDivElement> {
	tone?: CardTone;
	padding?: CardPadding;
	interactive?: boolean;
	glow?: boolean;
}

const tones: Record<CardTone, string> = {
	default: "bg-canvas-raised border border-hairline/[0.07]",
	sunken: "bg-canvas-sunken border border-hairline/[0.05]",
	overlay: "bg-canvas-overlay border border-hairline/[0.09] shadow-raised",
	flush: "bg-transparent border-0",
};

const paddings: Record<CardPadding, string> = {
	none: "",
	sm: "p-3",
	md: "p-5",
	lg: "p-7",
};

export function Card({
	tone = "default",
	padding = "md",
	interactive,
	glow,
	className,
	children,
	...rest
}: CardProps) {
	return (
		<div
			className={cn(
				"relative rounded-xl",
				tones[tone],
				paddings[padding],
				interactive &&
					"transition-colors duration-200 ease-out-expo hover:border-hairline/[0.15]",
				glow && "shadow-glow-sm",
				className,
			)}
			{...rest}
		>
			{children}
		</div>
	);
}

interface CardHeaderProps {
	eyebrow?: ReactNode;
	title: ReactNode;
	description?: ReactNode;
	action?: ReactNode;
	className?: string;
}

export function CardHeader({ eyebrow, title, description, action, className }: CardHeaderProps) {
	return (
		<div className={cn("flex items-start justify-between gap-4", className)}>
			<div className="min-w-0 space-y-1.5">
				{eyebrow ? (
					<div className="text-[10px] font-medium uppercase tracking-[0.14em] text-ink-subtle">
						{eyebrow}
					</div>
				) : null}
				<div className="text-base font-semibold text-ink">{title}</div>
				{description ? <div className="text-sm text-ink-muted">{description}</div> : null}
			</div>
			{action ? <div className="shrink-0">{action}</div> : null}
		</div>
	);
}
