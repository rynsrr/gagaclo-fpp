import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        tv: {
          bg: "#08090C",
          surface: "rgba(22, 24, 34, 0.72)",
          card: "rgba(30, 34, 48, 0.65)",
          hover: "rgba(255, 255, 255, 0.12)",
          border: "rgba(255, 255, 255, 0.08)",
          borderHighlight: "rgba(255, 255, 255, 0.25)",
          textPrimary: "#F5F5F7",
          textSecondary: "#A1A1A6",
          textMuted: "#6E6E73",
          accent: "#2997FF", // Apple Blue
          accentGlow: "rgba(41, 151, 255, 0.35)",
          warning: "#FF9F0A", // Apple Orange
          danger: "#FF453A",  // Apple Red
          success: "#30D158", // Apple Green
          purple: "#BF5AF2",  // Apple Purple
          teal: "#64D2FF",    // Apple Teal
        },
      },
      boxShadow: {
        "apple-card": "0 8px 32px 0 rgba(0, 0, 0, 0.37)",
        "apple-hover": "0 20px 40px -15px rgba(0, 0, 0, 0.7), 0 0 20px 2px rgba(255, 255, 255, 0.08)",
        "apple-focus": "0 0 0 3px rgba(255, 255, 255, 0.9), 0 10px 30px rgba(0, 0, 0, 0.8)",
        "glow-blue": "0 0 25px -3px rgba(41, 151, 255, 0.45)",
        "glow-orange": "0 0 25px -3px rgba(255, 159, 10, 0.45)",
        "glow-red": "0 0 25px -3px rgba(255, 69, 58, 0.45)",
        "glow-green": "0 0 25px -3px rgba(48, 209, 88, 0.45)",
      },
      backdropBlur: {
        xs: "2px",
      },
      fontFamily: {
        sans: [
          "-apple-system",
          "BlinkMacSystemFont",
          '"SF Pro Display"',
          '"SF Pro Text"',
          '"Segoe UI"',
          "Roboto",
          "sans-serif",
        ],
      },
      animation: {
        "pulse-subtle": "pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        "glow": "glow 2s ease-in-out infinite alternate",
      },
      keyframes: {
        glow: {
          "0%": { boxShadow: "0 0 15px rgba(255, 69, 58, 0.3)" },
          "100%": { boxShadow: "0 0 25px rgba(255, 69, 58, 0.7)" },
        },
      },
    },
  },
  plugins: [],
};

export default config;
