import { useState } from "react";

interface AddressDisplayProps {
	address: string;
	chars?: number;
}

export default function AddressDisplay({ address, chars = 8 }: AddressDisplayProps) {
	const [copied, setCopied] = useState(false);

	const truncated = `${address.slice(0, chars)}...${address.slice(-6)}`;

	async function handleCopy() {
		await navigator.clipboard.writeText(address);
		setCopied(true);
		setTimeout(() => setCopied(false), 1500);
	}

	return (
		<button
			onClick={handleCopy}
			className="font-mono text-xs text-secondary hover:text-surface-100 transition-colors"
			title={address}
		>
			{copied ? <span className="text-success">Copied!</span> : truncated}
		</button>
	);
}
