import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        page: "var(--bg)",
        surface: "var(--sf)",
        panel: "var(--pn)",
        ink: "var(--ink)",
        muted: "var(--mu)",
        "muted-strong": "var(--m2)",
        hairline: "var(--hl)",
        accent: "var(--bl)",
        lime: "#DDF247",
        p: {
          ultra: "var(--ul)",
          off: "var(--of)",
          mid: "var(--md)",
          on: "var(--on)",
        },
      },
      fontFamily: {
        sans: ["var(--font-geist-sans)", "system-ui", "sans-serif"],
        mono: ["var(--font-geist-mono)", "ui-monospace", "monospace"],
      },
      borderRadius: {
        btn: "6px",
        card: "16px",
        panel: "24px",
      },
      boxShadow: {
        DEFAULT: "none",
      },
      maxWidth: {
        content: "1200px",
      },
    },
  },
  plugins: [],
};

export default config;
