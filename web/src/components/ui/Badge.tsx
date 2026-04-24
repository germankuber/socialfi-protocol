import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "./cn";

type BadgeTone = "neutral" | "brand" | "success" | "warning" | "danger" | "info";
type BadgeVariant = "soft" | "outline" | "solid";
type BadgeSize = "sm" | "md";

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
	tone?: BadgeTone;
	variant?: BadgeVariant;
	size?: BadgeSize;
	dot?: boolean;
	icon?: ReactNode;
}

const softTones: Record<BadgeTone, string> = {
	neutral: "bg-hairline/[0.06] text-ink-muted",
	brand: "bg-brand/10 text-brand",
	success: "bg-success/10 text-success",
	warning: "bg-warning/12 text-warning",
	danger: "bg-danger/10 text-danger",
	info: "bg-info/12 text-info",
};

const outlineTones: Record<BadgeTone, string> = {
	neutral: "border-hairline/10 text-ink-muted",
	brand: "border-brand/30 text-brand",
	success: "border-success/30 text-success",
	warning: "border-warning/30 text-warning",
	danger: "border-danger/30 text-danger",
	info: "border-info/30 text-info",
};

const solidTones: Record<BadgeTone, string> = {
	neutral: "bg-ink text-ink-inverse",
	brand: "bg-brand text-ink-inverse",
	success: "bg-success text-ink-inverse",
	warning: "bg-warning text-ink-inverse",
	danger: "bg-danger text-ink-inverse",
	info: "bg-info text-ink-inverse",
};

const dotColor: Record<BadgeTone, string> = {
	neutral: "bg-ink-subtle",
	brand: "bg-brand",
	success: "bg-success",
	warning: "bg-warning",
	danger: "bg-danger",
	info: "bg-info",
};

const sizeStyles: Record<BadgeSize, string> = {
	sm: "text-[10px] px-1.5 py-0.5 gap-1 rounded-md tracking-[0.08em]",
	md: "text-[11px] px-2 py-0.5 gap-1.5 rounded-md tracking-[0.06em]",
};

export function Badge({
	tone = "neutral",
	variant = "soft",
	size = "md",
	dot,
	icon,
	className,
	children,
	...rest
}: BadgeProps) {
	const toneClass =
		variant === "soft"
			? softTones[tone]
			: variant === "outline"
				? `border ${outlineTones[tone]}`
				: solidTones[tone];

	return (
		<span
			className={cn(
				"inline-flex items-center font-medium uppercase whitespace-nowrap",
				sizeStyles[size],
				toneClass,
				className,
			)}
			{...rest}
		>
			{dot ? <span className={cn("h-1.5 w-1.5 rounded-full", dotColor[tone])} /> : null}
			{icon}
			{children}
		</span>
	);
}
