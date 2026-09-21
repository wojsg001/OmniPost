import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: {
          950: "#0c0b0a",
          900: "#141210",
          800: "#1c1916",
          700: "#2a2520",
          600: "#3d372f",
        },
        paper: {
          50: "#f7f1e8",
          100: "#e8dfd2",
          400: "#b8ab9a",
          500: "#9a8d7c",
        },
        flame: {
          400: "#f0784a",
          500: "#e85d3a",
          600: "#c94a2c",
        },
        gold: "#d4a017",
        moss: "#3d9a6a",
      },
      fontFamily: {
        sans: [
          "ui-sans-serif",
          "PingFang SC",
          "Hiragino Sans GB",
          "Noto Sans SC",
          "Microsoft YaHei",
          "system-ui",
          "sans-serif",
        ],
        display: ["Iowan Old Style", "Palatino", "Songti SC", "serif"],
        mono: ["ui-monospace", "SFMono-Regular", "Menlo", "monospace"],
      },
      boxShadow: {
        card: "0 18px 50px -28px rgba(0,0,0,.7)",
      },
    },
  },
  plugins: [],
};

export default config;
