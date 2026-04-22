/// Format a PAPI dispatch error into a human-readable string.
export function formatDispatchError(err: unknown): string {
	if (!err) return "Transaction failed";
	if (typeof err !== "object") return String(err);
	const e = err as { type?: string; value?: { type?: string; value?: { type?: string } } };
	if (e.type === "Module" && e.value) {
		const mod = e.value;
		return `${mod.type ?? "Unknown"}.${mod.value?.type ?? ""}`.replace(/:?\s*$/, "");
	}
	if (e.type) return e.type;
	try {
		return JSON.stringify(err);
	} catch {
		return "Transaction failed";
	}
}
