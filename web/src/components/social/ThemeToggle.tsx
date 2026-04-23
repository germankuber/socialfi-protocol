import { Moon, Sun } from "lucide-react";
import { useTheme } from "../../hooks/useTheme";

export default function ThemeToggle() {
	const { theme, toggleTheme } = useTheme();
	const next = theme === "dark" ? "light" : "dark";

	return (
		<button
			onClick={toggleTheme}
			className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-ink-muted transition-colors hover:bg-hairline/[0.05] hover:text-ink"
			title={`Switch to ${next} mode`}
			aria-label={`Switch to ${next} mode`}
		>
			{theme === "dark" ? <Sun size={16} strokeWidth={1.75} /> : <Moon size={16} strokeWidth={1.75} />}
		</button>
	);
}
