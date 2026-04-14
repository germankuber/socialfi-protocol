import { useState, useCallback, useRef, useEffect } from "react";

interface TxStatusState {
	status: string | null;
	isError: boolean;
	setStatus: (msg: string | null) => void;
	setError: (msg: string) => void;
	setSuccess: (msg: string) => void;
	clear: () => void;
}

/** Local transaction status with auto-dismiss for success messages. */
export function useTxStatus(autoDismissMs = 5000): TxStatusState {
	const [status, setStatusRaw] = useState<string | null>(null);
	const [isError, setIsError] = useState(false);
	const timerRef = useRef<ReturnType<typeof setTimeout>>();

	useEffect(() => {
		return () => {
			if (timerRef.current) clearTimeout(timerRef.current);
		};
	}, []);

	const setStatus = useCallback((msg: string | null) => {
		if (timerRef.current) clearTimeout(timerRef.current);
		setStatusRaw(msg);
		setIsError(false);
	}, []);

	const setError = useCallback((msg: string) => {
		if (timerRef.current) clearTimeout(timerRef.current);
		setStatusRaw(msg);
		setIsError(true);
	}, []);

	const setSuccess = useCallback(
		(msg: string) => {
			if (timerRef.current) clearTimeout(timerRef.current);
			setStatusRaw(msg);
			setIsError(false);
			timerRef.current = setTimeout(() => setStatusRaw(null), autoDismissMs);
		},
		[autoDismissMs],
	);

	const clear = useCallback(() => {
		if (timerRef.current) clearTimeout(timerRef.current);
		setStatusRaw(null);
		setIsError(false);
	}, []);

	return { status, isError, setStatus, setError, setSuccess, clear };
}
