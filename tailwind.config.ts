import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./index.html", "./js/**/*.{js,ts}", "./src/**/*.{html,js,ts}"],
  theme: {
    extend: {},
  },
  plugins: [],
};

export default config;
