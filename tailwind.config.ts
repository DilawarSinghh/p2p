import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        bg: "#0a0e14",
        panel: "#121820",
        panel2: "#1a2230",
        border: "#243040",
        accent: "#2dd4bf",
        accent2: "#38bdf8",
        warn: "#fbbf24",
        danger: "#f87171",
        good: "#4ade80",
        muted: "#64748b",
      },
      fontFamily: {
        mono: ["ui-monospace", "SFMono-Regular", "Menlo", "monospace"],
      },
    },
  },
  plugins: [],
};
export default config;
