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
          green: "#10B981",
          red: "#EF4444",
          amber: "#F59E0B",
          blue: "#3B82F6",
          purple: "#8B5CF6",
        },
        admin: {
          bg: "#0B0F19",
          card: "#111827",
          cardHover: "#182235",
          border: "#1E293B",
          borderLight: "#334155",
          text: "#F8FAFC",
          muted: "#94A3B8",
          dim: "#64748B",
          accent: "#6366F1",
          accentHover: "#4F46E5",
        },
        store: {
          bg: "#FFFFFF",
          surface: "#F9FAFB",
          card: "#FFFFFF",
          border: "#E5E7EB",
          text: "#111827",
          muted: "#6B7280",
          accent: "#000000",
        }
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
        store: "0 1px 3px 0 rgba(0, 0, 0, 0.05), 0 1px 2px 0 rgba(0, 0, 0, 0.03)",
        storeHover: "0 10px 25px -5px rgba(0, 0, 0, 0.08), 0 8px 10px -6px rgba(0, 0, 0, 0.04)",
        glow: "0 0 20px -3px rgba(99, 102, 241, 0.3)",
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
