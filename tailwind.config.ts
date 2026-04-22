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
          DEFAULT: "#7c3aed",
          pink: "#ec4899",
          muted: "#9333ea",
          glow: "rgba(124, 58, 237, 0.28)",
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
          "radial-gradient(ellipse 80% 50% at 50% -20%, rgba(124, 58, 237, 0.14), transparent), radial-gradient(ellipse 60% 40% at 100% 0%, rgba(236, 72, 153, 0.1), transparent)",
        "accent-gradient":
          "linear-gradient(135deg, #7c3aed 0%, #ec4899 55%, #ec4899 100%)",
        "accent-gradient-hover":
          "linear-gradient(135deg, #6d28d9 0%, #db2777 55%, #db2777 100%)",
      },
      backgroundSize: {
        grid: "64px 64px",
      },
      boxShadow: {
        "accent-glow": "0 0 48px -12px rgba(124, 58, 237, 0.35)",
        "accent-card": "0 0 60px -20px rgba(124, 58, 237, 0.2)",
      },
    },
  },
  plugins: [],
};

export default config;
