import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        base: {
          DEFAULT: "#0A0A0F",
          panel: "#131218",
          card: "#1A1922",
          border: "#26252F",
          hover: "#201F29",
        },
        ink: {
          DEFAULT: "#F3F2F7",
          muted: "#96939F",
          dim: "#5F5D69",
        },
        volt: {
          DEFAULT: "#2F6BFF",
          dim: "#1D3E99",
          soft: "#DCE7FF",
        },
        amber: {
          tile: "#FDB44B",
        },
        lilac: {
          tile: "#B9A6FF",
        },
        lime: {
          tile: "#D3F26A",
        },
        coral: {
          tile: "#FF8C7A",
        },
        good: "#3ECF8E",
        warn: "#FDB44B",
        bad: "#FF6B6B",
      },
      fontFamily: {
        sans: ["var(--font-sans)", "ui-sans-serif", "system-ui"],
        mono: ["var(--font-mono)", "ui-monospace", "monospace"],
      },
      borderRadius: {
        xl2: "1.25rem",
      },
      boxShadow: {
        card: "0 1px 2px rgba(0,0,0,0.4), 0 12px 32px -12px rgba(0,0,0,0.5)",
      },
    },
  },
  plugins: [],
};
export default config;
