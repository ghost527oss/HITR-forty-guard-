/** @type {import('tailwindcss').Config} */
export default {
  // SettingsScreen toggles a `.dark` class on <html>. Without this,
  // Tailwind defaults to `media` (OS preference) and ignores it entirely.
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        heat: {
          50: "#fff7ed",
          100: "#ffedd5",
          400: "#fb923c",
          600: "#ea580c",
          700: "#c2410c",
          900: "#7c2d12",
        },
      },
    },
  },
  plugins: [],
};
