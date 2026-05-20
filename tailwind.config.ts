import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        surface: {
          DEFAULT: "#ffffff",
          raised: "#f8fafc",
          muted: "#f1f5f9",
          border: "rgba(15, 23, 42, 0.1)",
        },
        accent: {
          DEFAULT: "#C6A77D",
          pink: "#e8d4bc",
          muted: "#a68958",
          glow: "rgba(198, 167, 125, 0.35)",
        },
      },
      fontFamily: {
        sans: ["var(--font-geist-sans)", "system-ui", "sans-serif"],
        mono: ["var(--font-geist-mono)", "monospace"],
      },
      backgroundImage: {
        "grid-fade":
          "linear-gradient(to bottom, transparent 0%, #ffffff 100%), linear-gradient(rgba(15,23,42,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(15,23,42,0.06) 1px, transparent 1px)",
        "hero-glow":
          "radial-gradient(ellipse 80% 50% at 50% -20%, rgba(198, 167, 125, 0.14), transparent), radial-gradient(ellipse 60% 40% at 100% 0%, rgba(232, 212, 188, 0.12), transparent)",
        "accent-gradient":
          "linear-gradient(135deg, #a68958 0%, #C6A77D 55%, #e8d4bc 100%)",
        "accent-gradient-hover":
          "linear-gradient(135deg, #957d4e 0%, #b89363 55%, #dcc29f 100%)",
      },
      backgroundSize: {
        grid: "64px 64px",
      },
      boxShadow: {
        "accent-glow": "0 0 48px -12px rgba(198, 167, 125, 0.38)",
        "accent-card": "0 0 60px -20px rgba(198, 167, 125, 0.22)",
      },
      keyframes: {
        "hero-arrow-x": {
          "0%, 100%": { transform: "translateX(0)", opacity: "0.75" },
          "50%": { transform: "translateX(6px)", opacity: "1" },
        },
        "hero-arrow-y": {
          "0%, 100%": { transform: "translateY(0)", opacity: "0.75" },
          "50%": { transform: "translateY(6px)", opacity: "1" },
        },
      },
      animation: {
        "hero-arrow-x": "hero-arrow-x 1.35s ease-in-out infinite",
        "hero-arrow-y": "hero-arrow-y 1.35s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};

export default config;
