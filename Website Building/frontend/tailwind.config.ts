import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--color-background)",
        primary: "var(--color-primary)",
        good: "var(--color-good)",
        bad: "var(--color-bad)",
        unknown: "var(--color-unknown)",
        fresh: "var(--color-fresh)",
        rotten: "var(--color-rotten)",
        adulterated: "var(--color-adulterated)",
      },
      fontFamily: {
        sans: ["SF Compact", "-apple-system", "BlinkMacSystemFont", "Segoe UI", "Roboto", "sans-serif"],
        goothif: ["New York", "Georgia", "serif"],
        instrument: ['"Instrument Serif"', "serif"],
        inter: ["Inter", "sans-serif"],
      },
    },
  },
  plugins: [],
};
export default config;
