/** @type {import('tailwindcss').Config} */
export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        // All surfaces resolve from CSS variables so theming is one source of truth.
        ink: {
          DEFAULT: "rgb(var(--ink) / <alpha-value>)",
          muted: "rgb(var(--ink-muted) / <alpha-value>)",
          subtle: "rgb(var(--ink-subtle) / <alpha-value>)",
          faint: "rgb(var(--ink-faint) / <alpha-value>)",
          inverse: "rgb(var(--ink-inverse) / <alpha-value>)",
        },
        canvas: {
          DEFAULT: "rgb(var(--canvas) / <alpha-value>)",
          raised: "rgb(var(--canvas-raised) / <alpha-value>)",
          sunken: "rgb(var(--canvas-sunken) / <alpha-value>)",
          overlay: "rgb(var(--canvas-overlay) / <alpha-value>)",
        },
        hairline: {
          DEFAULT: "rgb(var(--hairline) / <alpha-value>)",
          strong: "rgb(var(--hairline-strong) / <alpha-value>)",
        },
        brand: {
          DEFAULT: "rgb(var(--brand) / <alpha-value>)",
          soft: "rgb(var(--brand-soft) / <alpha-value>)",
          dim: "rgb(var(--brand-dim) / <alpha-value>)",
          50: "#fdf2f8",
          100: "#fce7f3",
          200: "#fbcfe8",
          300: "#f9a8d4",
          400: "#f472b6",
          500: "#e6007a",
          600: "#c30066",
          700: "#a30055",
          800: "#880049",
          900: "#740041",
        },
        // Kept for incremental migration of untouched pages.
        surface: {
          DEFAULT: "#09090b",
          50: "#fafafa",
          100: "#f4f4f5",
          200: "#e4e4e7",
          300: "#d4d4d8",
          400: "#a1a1aa",
          500: "#71717a",
          600: "#52525b",
          700: "#3f3f46",
          800: "#27272a",
          900: "#18181b",
          950: "#09090b",
        },
        success: {
          DEFAULT: "#22c55e",
          soft: "rgb(34 197 94 / 0.12)",
          light: "#dcfce7",
          dark: "#166534",
        },
        warning: {
          DEFAULT: "#f59e0b",
          soft: "rgb(245 158 11 / 0.12)",
          light: "#fef3c7",
          dark: "#78350f",
        },
        danger: {
          DEFAULT: "#ef4444",
          soft: "rgb(239 68 68 / 0.12)",
          light: "#fee2e2",
          dark: "#991b1b",
        },
        info: {
          DEFAULT: "#6366f1",
          soft: "rgb(99 102 241 / 0.12)",
          light: "#e0e7ff",
          dark: "#3730a3",
        },
      },
      fontFamily: {
        display: ['"Fraunces"', "ui-serif", "Georgia", "serif"],
        sans: ['"Geist"', "ui-sans-serif", "system-ui", "-apple-system", "sans-serif"],
        mono: ['"Geist Mono"', "ui-monospace", "SFMono-Regular", "monospace"],
      },
      fontSize: {
        // Tighter, editorial scale. Numbers are rem / line-height.
        "2xs": ["0.6875rem", { lineHeight: "1rem", letterSpacing: "0.02em" }],
        xs: ["0.75rem", { lineHeight: "1.125rem", letterSpacing: "0.01em" }],
        sm: ["0.8125rem", { lineHeight: "1.25rem" }],
        base: ["0.9375rem", { lineHeight: "1.5rem" }],
        lg: ["1.0625rem", { lineHeight: "1.625rem" }],
        xl: ["1.25rem", { lineHeight: "1.75rem", letterSpacing: "-0.01em" }],
        "2xl": ["1.5rem", { lineHeight: "2rem", letterSpacing: "-0.015em" }],
        "3xl": ["1.875rem", { lineHeight: "2.25rem", letterSpacing: "-0.02em" }],
        "4xl": ["2.5rem", { lineHeight: "2.75rem", letterSpacing: "-0.025em" }],
        "5xl": ["3.5rem", { lineHeight: "3.75rem", letterSpacing: "-0.035em" }],
        "6xl": ["4.75rem", { lineHeight: "4.875rem", letterSpacing: "-0.04em" }],
        "7xl": ["6rem", { lineHeight: "6rem", letterSpacing: "-0.045em" }],
      },
      spacing: {
        "4.5": "1.125rem",
        "5.5": "1.375rem",
        "13": "3.25rem",
        "15": "3.75rem",
        "17": "4.25rem",
        "18": "4.5rem",
        "22": "5.5rem",
        "30": "7.5rem",
      },
      borderRadius: {
        xs: "0.25rem",
        sm: "0.375rem",
        DEFAULT: "0.5rem",
        md: "0.625rem",
        lg: "0.75rem",
        xl: "1rem",
        "2xl": "1.25rem",
        "3xl": "1.75rem",
      },
      boxShadow: {
        glow: "0 0 0 1px rgb(var(--brand) / 0.4), 0 0 24px -4px rgb(var(--brand) / 0.5)",
        "glow-sm": "0 0 0 1px rgb(var(--brand) / 0.35), 0 0 12px -2px rgb(var(--brand) / 0.35)",
        "glow-ring": "0 0 0 4px rgb(var(--brand) / 0.18)",
        raised: "0 1px 0 0 rgb(255 255 255 / 0.04) inset, 0 8px 24px -8px rgb(0 0 0 / 0.5)",
        lift: "0 1px 0 0 rgb(255 255 255 / 0.05) inset, 0 24px 48px -16px rgb(0 0 0 / 0.7)",
      },
      backgroundImage: {
        "grid-faint":
          "linear-gradient(rgb(var(--hairline) / 0.5) 1px, transparent 1px), linear-gradient(to right, rgb(var(--hairline) / 0.5) 1px, transparent 1px)",
        "noise": "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='160' height='160'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 0.035 0'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>\")",
        "brand-radial":
          "radial-gradient(ellipse at top, rgb(var(--brand) / 0.18) 0%, transparent 55%)",
      },
      backgroundSize: {
        grid: "48px 48px",
      },
      animation: {
        "fade-in": "fadeIn 0.4s ease-out forwards",
        "fade-up": "fadeUp 0.6s cubic-bezier(0.2, 0.8, 0.2, 1) forwards",
        "slide-in": "slideIn 0.45s cubic-bezier(0.2, 0.8, 0.2, 1) forwards",
        "pulse-ring": "pulseRing 2.4s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        "marquee": "marquee 40s linear infinite",
        "blink": "blink 1.1s steps(2, end) infinite",
      },
      keyframes: {
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        fadeUp: {
          "0%": { opacity: "0", transform: "translateY(12px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        slideIn: {
          "0%": { opacity: "0", transform: "translateX(-8px)" },
          "100%": { opacity: "1", transform: "translateX(0)" },
        },
        pulseRing: {
          "0%, 100%": { boxShadow: "0 0 0 0 rgb(var(--brand) / 0.55)" },
          "50%": { boxShadow: "0 0 0 8px rgb(var(--brand) / 0)" },
        },
        marquee: {
          "0%": { transform: "translateX(0)" },
          "100%": { transform: "translateX(-50%)" },
        },
        blink: {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.25" },
        },
      },
      transitionTimingFunction: {
        "out-expo": "cubic-bezier(0.16, 1, 0.3, 1)",
      },
    },
  },
  plugins: [],
};
