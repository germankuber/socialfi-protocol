import { forwardRef } from "react";
import type { InputHTMLAttributes, ReactNode, TextareaHTMLAttributes } from "react";
import { cn } from "./cn";

type InputSize = "sm" | "md" | "lg";

interface InputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "size"> {
	sizeVariant?: InputSize;
	leadingIcon?: ReactNode;
	trailingIcon?: ReactNode;
	invalid?: boolean;
}

const sizeStyles: Record<InputSize, string> = {
	sm: "h-8 text-xs px-2.5",
	md: "h-10 text-sm px-3.5",
	lg: "h-12 text-sm px-4",
};

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
	{ sizeVariant = "md", leadingIcon, trailingIcon, invalid, className, ...rest },
	ref,
) {
	const control = (
		<input
			ref={ref}
			className={cn(
				"w-full bg-canvas-sunken text-ink placeholder:text-ink-subtle",
				"rounded-lg border border-hairline/[0.08]",
				"transition-colors duration-150",
				"focus:outline-none focus:border-brand/50 focus:bg-canvas-raised",
				"focus:shadow-[0_0_0_4px_rgb(var(--brand)/0.15)]",
				invalid &&
					"border-danger/50 focus:border-danger/60 focus:shadow-[0_0_0_4px_rgb(239_68_68/0.15)]",
				sizeStyles[sizeVariant],
				leadingIcon && "pl-9",
				trailingIcon && "pr-9",
				className,
			)}
			{...rest}
		/>
	);

	if (!leadingIcon && !trailingIcon) return control;

	return (
		<div className="relative">
			{leadingIcon ? (
				<span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-ink-subtle">
					{leadingIcon}
				</span>
			) : null}
			{control}
			{trailingIcon ? (
				<span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-ink-subtle">
					{trailingIcon}
				</span>
			) : null}
		</div>
	);
});

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
	invalid?: boolean;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea(
	{ invalid, className, ...rest },
	ref,
) {
	return (
		<textarea
			ref={ref}
			className={cn(
				"w-full bg-canvas-sunken text-ink placeholder:text-ink-subtle",
				"rounded-lg border border-hairline/[0.08]",
				"px-3.5 py-2.5 text-sm",
				"transition-colors duration-150 resize-y min-h-[96px]",
				"focus:outline-none focus:border-brand/50 focus:bg-canvas-raised",
				"focus:shadow-[0_0_0_4px_rgb(var(--brand)/0.15)]",
				invalid && "border-danger/50",
				className,
			)}
			{...rest}
		/>
	);
});
