import type { HTMLAttributes } from "react";
import { cn } from "./cn";

interface SkeletonProps extends HTMLAttributes<HTMLDivElement> {
	rounded?: "sm" | "md" | "lg" | "full";
}

const rounded = {
	sm: "rounded",
	md: "rounded-md",
	lg: "rounded-lg",
	full: "rounded-full",
};

export function Skeleton({ rounded: r = "md", className, ...rest }: SkeletonProps) {
	return (
		<div
			className={cn("relative overflow-hidden bg-hairline/[0.05]", rounded[r], className)}
			aria-hidden
			{...rest}
		>
			<div
				className="absolute inset-0 -translate-x-full animate-[shimmer_1.6s_ease-in-out_infinite] bg-gradient-to-r from-transparent via-hairline/[0.06] to-transparent"
				style={{
					animation: "shimmer 1.6s ease-in-out infinite",
				}}
			/>
			<style>{`@keyframes shimmer { 100% { transform: translateX(100%); } }`}</style>
		</div>
	);
}
