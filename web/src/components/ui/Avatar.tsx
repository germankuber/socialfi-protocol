import type { HTMLAttributes } from "react";
import { cn } from "./cn";

type AvatarSize = "xs" | "sm" | "md" | "lg" | "xl" | "2xl";

interface AvatarProps extends HTMLAttributes<HTMLDivElement> {
	src?: string | null;
	alt?: string;
	seed?: string;
	size?: AvatarSize;
	shape?: "circle" | "square";
	ring?: boolean;
}

const sizePx: Record<AvatarSize, { cls: string; font: string }> = {
	xs: { cls: "h-6 w-6", font: "text-[10px]" },
	sm: { cls: "h-8 w-8", font: "text-xs" },
	md: { cls: "h-10 w-10", font: "text-sm" },
	lg: { cls: "h-12 w-12", font: "text-base" },
	xl: { cls: "h-16 w-16", font: "text-xl" },
	"2xl": { cls: "h-24 w-24", font: "text-3xl" },
};

const palette = [
	"from-[#e6007a] to-[#7c2d5a]",
	"from-[#6366f1] to-[#3730a3]",
	"from-[#14b8a6] to-[#0f766e]",
	"from-[#f59e0b] to-[#b45309]",
	"from-[#8b5cf6] to-[#5b21b6]",
	"from-[#ec4899] to-[#9d174d]",
	"from-[#06b6d4] to-[#0e7490]",
	"from-[#10b981] to-[#047857]",
];

function hash(input: string): number {
	let h = 0;
	for (let i = 0; i < input.length; i++) {
		h = (h << 5) - h + input.charCodeAt(i);
		h |= 0;
	}
	return Math.abs(h);
}

function initials(input: string): string {
	const clean = input.trim();
	if (!clean) return "·";
	const parts = clean.split(/\s+/);
	if (parts.length === 1) return clean.slice(0, 2).toUpperCase();
	return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function Avatar({
	src,
	alt,
	seed,
	size = "md",
	shape = "circle",
	ring,
	className,
	...rest
}: AvatarProps) {
	const key = seed ?? alt ?? "";
	const gradient = palette[hash(key) % palette.length];
	const dims = sizePx[size];
	const radius = shape === "circle" ? "rounded-full" : "rounded-lg";

	return (
		<div
			className={cn(
				"relative shrink-0 overflow-hidden",
				dims.cls,
				radius,
				ring && "ring-2 ring-canvas-raised",
				className,
			)}
			{...rest}
		>
			{src ? (
				<img src={src} alt={alt ?? ""} className="h-full w-full object-cover" />
			) : (
				<div
					className={cn(
						"flex h-full w-full items-center justify-center font-semibold text-white",
						"bg-gradient-to-br",
						gradient,
						dims.font,
					)}
					aria-label={alt}
				>
					{initials(key || "·")}
				</div>
			)}
		</div>
	);
}
