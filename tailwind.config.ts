import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["selector", "[data-theme='dark']"],
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: "rgb(var(--bg-rgb) / <alpha-value>)",
        surface: "rgb(var(--surface-rgb) / <alpha-value>)",
        raised: "rgb(var(--raised-rgb) / <alpha-value>)",
        line: "var(--border-hairline)",
        "line-strong": "var(--border-strong)",
        ink: {
          DEFAULT: "rgb(var(--ink-rgb) / <alpha-value>)",
          secondary: "rgb(var(--ink-secondary-rgb) / <alpha-value>)",
          muted: "rgb(var(--ink-muted-rgb) / <alpha-value>)",
        },
        "ink-secondary": "rgb(var(--ink-secondary-rgb) / <alpha-value>)",
        muted: "rgb(var(--ink-muted-rgb) / <alpha-value>)",
        faint: "rgb(var(--ink-muted-rgb) / <alpha-value>)",
        brand: {
          DEFAULT: "rgb(var(--brand-rgb) / <alpha-value>)",
          hover: "rgb(var(--brand-hover-rgb) / <alpha-value>)",
          tint: "rgb(var(--brand-tint-rgb) / <alpha-value>)",
          soft: "rgb(var(--brand-tint-rgb) / <alpha-value>)",
          strong: "rgb(var(--brand-hover-rgb) / <alpha-value>)",
        },
        accent: "rgb(var(--accent-rgb) / <alpha-value>)",
        "neutral-fill": "rgb(var(--neutral-fill-rgb) / <alpha-value>)",
        status: {
          new: "rgb(var(--status-new-rgb) / <alpha-value>)",
          assigned: "rgb(var(--status-assigned-rgb) / <alpha-value>)",
          inprogress: "rgb(var(--status-inprogress-rgb) / <alpha-value>)",
          done: "rgb(var(--status-done-rgb) / <alpha-value>)",
          urgent: "rgb(var(--status-urgent-rgb) / <alpha-value>)",
        },
        ok: "rgb(var(--status-done-rgb) / <alpha-value>)",
        warn: "rgb(var(--status-new-rgb) / <alpha-value>)",
        danger: "rgb(var(--status-urgent-rgb) / <alpha-value>)",
      },
      borderRadius: {
        none: "0",
        sm: "2px",
        DEFAULT: "3px",
        md: "3px",
        lg: "4px",
        xl: "4px",
        full: "9999px",
      },
      fontFamily: {
        sans: [
          "'Inter'",
          "'Hind Siliguri'",
          "'Noto Sans Bengali'",
          "system-ui",
          "-apple-system",
          "BlinkMacSystemFont",
          "sans-serif",
        ],
        body: [
          "'Inter'",
          "'Hind Siliguri'",
          "'Noto Sans Bengali'",
          "system-ui",
          "-apple-system",
          "BlinkMacSystemFont",
          "sans-serif",
        ],
        display: [
          "'Tiro Bangla'",
          "'Playfair Display'",
          "'Anek Bangla'",
          "'Noto Serif Bengali'",
          "Georgia",
          "serif",
        ],
        serif: [
          "'Tiro Bangla'",
          "'Playfair Display'",
          "'Noto Serif Bengali'",
          "Georgia",
          "serif",
        ],
        mono: [
          "'JetBrains Mono'",
          "'Fira Code'",
          "ui-monospace",
          "SFMono-Regular",
          "Menlo",
          "Monaco",
          "Consolas",
          "monospace",
        ],
      },
      boxShadow: {
        popover: "0 4px 12px rgba(0, 0, 0, 0.08)",
      },
    },
  },
  plugins: [],
};

export default config;
