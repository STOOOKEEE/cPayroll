import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: "#000000",
        surface: "#0A0A0A",
        border: "#1F1F1F",
        redact: "#262626",
        fg: "#FAFAFA",
        dim: "#737373",
        fade: "#404040",
        accent: {
          DEFAULT: "#E10600",
          hover: "#C20500",
          dark: "#7A0300",
        },
      },
      fontFamily: {
        mono: ["var(--font-mono)", "ui-monospace", "SFMono-Regular", "monospace"],
      },
      letterSpacing: {
        wider2: "0.12em",
      },
      borderRadius: {
        none: "0",
        sm: "2px",
      },
    },
  },
  plugins: [],
};
export default config;
