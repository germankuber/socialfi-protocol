import { forwardRef } from "react";
import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "./cn";

type ButtonVariant = "primary" | "secondary" | "ghost" | "outline" | "danger";
type ButtonSize = "sm" | "md" | "lg";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
	variant?: ButtonVariant;
	size?: ButtonSize;
	loading?: boolean;
	leadingIcon?: ReactNode;
	trailingIcon?: ReactNode;
	fullWidth?: boolean;
}

const base =
	"inline-flex items-center justify-center gap-2 font-medium whitespace-nowrap " +
	"transition-all duration-150 ease-out-expo " +
	"disabled:opacity-40 disabled:pointer-events-none select-none " +
	"focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/60 focus-visible:ring-offset-2 focus-visible:ring-offset-canvas";

const variants: Record<ButtonVariant, string> = {
	primary:
		"bg-brand text-ink-inverse shadow-[0_1px_0_0_rgb(255_255_255/0.15)_inset] " +
		"hover:shadow-[0_0_0_1px_rgb(var(--brand)/0.35),0_8px_24px_-8px_rgb(var(--brand)/0.6)] " +
		"active:scale-[0.98]",
	secondary:
		"bg-canvas-raised text-ink border border-hairline/10 " +
		"hover:border-hairline/20 hover:bg-canvas-overlay",
	ghost: "text-ink-muted hover:text-ink hover:bg-hairline/[0.05]",
	outline:
		"text-ink-muted border border-hairline/10 " + "hover:text-ink hover:border-hairline/20",
	danger: "text-danger hover:bg-danger/10 border border-danger/20 hover:border-danger/40",
};

const sizes: Record<ButtonSize, string> = {
	sm: "h-8 px-3 text-xs rounded-md gap-1.5",
	md: "h-9 px-3.5 text-sm rounded-lg",
	lg: "h-11 px-5 text-sm rounded-lg",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
	{
		variant = "secondary",
		size = "md",
		loading = false,
		leadingIcon,
		trailingIcon,
		fullWidth,
		className,
		children,
		disabled,
		...rest
	},
	ref,
) {
	return (
		<button
			ref={ref}
			disabled={disabled || loading}
			className={cn(base, variants[variant], sizes[size], fullWidth && "w-full", className)}
			{...rest}
		>
			{loading ? <Spinner /> : leadingIcon}
			{children}
			{!loading && trailingIcon}
		</button>
	);
});

function Spinner() {
	return (
		<svg className="h-3.5 w-3.5 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden>
			<circle
				cx="12"
				cy="12"
				r="9"
				stroke="currentColor"
				strokeOpacity="0.25"
				strokeWidth="2.5"
			/>
			<path
				d="M21 12a9 9 0 0 1-9 9"
				stroke="currentColor"
				strokeWidth="2.5"
				strokeLinecap="round"
			/>
		</svg>
	);
}
