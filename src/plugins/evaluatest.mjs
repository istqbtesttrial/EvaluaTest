import plugin from "tailwindcss/plugin";

export default plugin(function ({ addUtilities }) {
  addUtilities({
    ".shadow-elevated": {
      "box-shadow": "0 16px 35px -20px rgba(15, 23, 42, 0.45)",
    },
    ".focus-ring-brand": {
      outline: "2px solid var(--color-brand-500)",
      "outline-offset": "2px",
    },
    ".card-surface": {
      "border-radius": "0.75rem",
      "border-width": "1px",
      "border-color": "color-mix(in oklch, var(--color-slate-200) 70%, transparent)",
      "background-color": "rgba(255, 255, 255, 0.8)",
      "backdrop-filter": "blur(8px)",
      padding: "1.5rem",
    },
  });
});
