import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: {
          950: "#0B0E11",
          900: "#12161B",
          800: "#1B2128",
          700: "#2A323C",
          600: "#414D5A",
          500: "#5C6B7A",
          400: "#8492A0",
          300: "#AEB9C4",
          200: "#D6DCE2",
          100: "#EDF0F3",
          50: "#F6F8F9",
        },
        brass: {
          600: "#8A6A2E",
          500: "#B4863C",
          400: "#D2A54F",
          300: "#E4C583",
          200: "#F0DEB2",
          100: "#F8EFD9",
        },
        signal: {
          green: "#3E7A5C",
          red: "#B5473C",
          amber: "#C08A2E",
        },
      },
      fontFamily: {
        display: ["var(--font-display)", "serif"],
        body: ["var(--font-body)", "sans-serif"],
        mono: ["var(--font-mono)", "monospace"],
      },
      letterSpacing: {
        tightest: "-0.04em",
        widest2: "0.28em",
      },
      boxShadow: {
        vault: "0 1px 0 0 rgba(255,255,255,0.04) inset, 0 12px 32px -12px rgba(0,0,0,0.5)",
        panel: "0 1px 0 0 rgba(255,255,255,0.03) inset, 0 2px 8px -2px rgba(0,0,0,0.4)",
      },
      keyframes: {
        "fade-up": {
          "0%": { opacity: "0", transform: "translateY(8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
      },
      animation: {
        "fade-up": "fade-up 0.5s cubic-bezier(0.16,1,0.3,1) both",
        shimmer: "shimmer 2.4s linear infinite",
      },
    },
  },
  plugins: [],
};

export default config;
