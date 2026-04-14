interface ConfirmModalProps {
	open: boolean;
	title: string;
	children: React.ReactNode;
	confirmLabel?: string;
	confirmDisabled?: boolean;
	onConfirm: () => void;
	onCancel: () => void;
}

export default function ConfirmModal({
	open,
	title,
	children,
	confirmLabel = "Confirm",
	confirmDisabled,
	onConfirm,
	onCancel,
}: ConfirmModalProps) {
	if (!open) return null;

	return (
		<div className="fixed inset-0 z-50 flex items-center justify-center p-4">
			<div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onCancel} />
			<div className="relative panel max-w-sm w-full space-y-4 animate-slide-up">
				<h3 className="text-lg font-semibold">{title}</h3>
				<div>{children}</div>
				<div className="flex gap-3 justify-end">
					<button onClick={onCancel} className="btn-ghost btn-sm">
						Cancel
					</button>
					<button onClick={onConfirm} disabled={confirmDisabled} className="btn-brand btn-sm">
						{confirmLabel}
					</button>
				</div>
			</div>
		</div>
	);
}
