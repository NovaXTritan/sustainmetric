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
        bg: {
          DEFAULT: "#000000",
          elevated: "#0a0a0a",
        },
        "text-primary": "#ffffff",
        "text-secondary": "rgba(255, 255, 255, 0.65)",
        "text-tertiary": "rgba(255, 255, 255, 0.40)",
        border: {
          DEFAULT: "rgba(255, 255, 255, 0.12)",
          strong: "rgba(255, 255, 255, 0.30)",
        },
        accent: {
          heat: "#FF4D2E",
          cool: "#4DA3FF",
          success: "#00D68F",
        },
      },
      fontFamily: {
        headline: ["var(--font-space-grotesk)", "sans-serif"],
        body: ["var(--font-inter)", "sans-serif"],
      },
      fontSize: {
        xs: "12px",
        sm: "14px",
        base: "16px",
        lg: "20px",
        xl: "28px",
        "2xl": "40px",
        "3xl": "64px",
      },
      letterSpacing: {
        headline: "-0.02em",
        button: "0.05em",
        nav: "0.08em",
      },
      transitionTimingFunction: {
        rail: "cubic-bezier(0.16, 1, 0.3, 1)",
      },
      transitionDuration: {
        rail: "400ms",
      },
    },
  },
  plugins: [],
};

export default config;
