import { useEffect, useState } from "react";

type Theme = "dark" | "light";

function getStoredTheme(): Theme {
	const stored = localStorage.getItem("theme");
	if (stored === "light" || stored === "dark") return stored;
	return "dark";
}

export function useTheme() {
	const [theme, setThemeState] = useState<Theme>(getStoredTheme);

	useEffect(() => {
		const root = document.documentElement;
		if (theme === "dark") {
			root.classList.add("dark");
			root.classList.remove("light");
		} else {
			root.classList.add("light");
			root.classList.remove("dark");
		}
		localStorage.setItem("theme", theme);
	}, [theme]);

	function toggleTheme() {
		setThemeState((prev) => (prev === "dark" ? "light" : "dark"));
	}

	return { theme, toggleTheme };
}
