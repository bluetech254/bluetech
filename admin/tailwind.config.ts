import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        base: "#080b18",
        "base-panel": "#0e1225",
        "base-panel2": "#131830",
        "base-hover": "#1a2040",
        "base-border": "#232b4a",
        ink: "#f0f4ff",
        "ink-muted": "#8a96c0",
        "ink-dim": "#4e5880",
        volt: "#1a3fd4",
        "volt-dark": "#1232b0",
        good: "#00d4d4",
        bad: "#f4506b",
        warn: "#f5a623",
        coral: "#ff8a5c",
        lilac: "#7b8fff",
        teal: "#00d4d4",
      },
      fontFamily: {
        display: ["var(--font-display)", "sans-serif"],
        body: ["var(--font-body)", "sans-serif"],
      },
      borderRadius: {
        xl2: "1.25rem",
      },
      boxShadow: {
        panel: "0 1px 0 0 rgba(255,255,255,0.03) inset, 0 8px 24px -12px rgba(0,0,0,0.5)",
      },
    },
  },
  plugins: [],
};
export default config;
