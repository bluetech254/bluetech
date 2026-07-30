import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        base: "#0d0b1a",
        "base-panel": "#161329",
        "base-panel2": "#1b1733",
        "base-hover": "#211d3d",
        "base-border": "#2a2547",
        ink: "#f3f1fb",
        "ink-muted": "#9d97c2",
        "ink-dim": "#5b5480",
        volt: "#7c5cfc",
        "volt-dark": "#5b3ff0",
        good: "#22c99e",
        bad: "#f4506b",
        warn: "#f5a623",
        coral: "#ff8a5c",
        lilac: "#b794f6",
        teal: "#3ecfd0",
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
