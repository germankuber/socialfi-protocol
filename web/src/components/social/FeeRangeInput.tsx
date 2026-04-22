/**
 * Styled `<input type="range">` used for fee pickers on compose forms.
 *
 * The custom track in `index.css` needs a `--range-progress` CSS var
 * to paint the "filled" portion on WebKit (which has no native
 * progress pseudo-element). This component wires that up from the
 * current value so every slider stays in sync without each callsite
 * having to compute and forward the percentage by hand.
 */
import type { CSSProperties } from "react";

interface FeeRangeInputProps {
	label: string;
	value: string;
	onChange: (value: string) => void;
	min?: number;
	max?: number;
	step?: number;
}

export default function FeeRangeInput({
	label,
	value,
	onChange,
	min = 0,
	max = 1000,
	step = 100,
}: FeeRangeInputProps) {
	const numeric = Number.parseInt(value || "0", 10);
	const clamped = Number.isFinite(numeric) ? Math.min(Math.max(numeric, min), max) : min;
	const progress = max === min ? 0 : ((clamped - min) / (max - min)) * 100;
	const style = { "--range-progress": `${progress}%` } as CSSProperties;

	return (
		<div>
			<label className="form-label flex items-center justify-between">
				<span>{label}</span>
				<span className="text-[10px] font-mono text-surface-400">{value}</span>
			</label>
			<input
				type="range"
				min={min}
				max={max}
				step={step}
				value={value}
				onChange={(e) => onChange(e.target.value)}
				style={style}
				className="input-range w-full"
			/>
		</div>
	);
}
