/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        obsidian: {
          950: '#0A0A0C',
          900: '#121215',
          800: '#18181D',
        },
        reactive: {
          bg: '#0A0A0C',
          card: '#121215',
          elevated: '#18181D',
          blue: '#2756FC',
          cyan: '#62D0FF',
          purple: '#CBB5FF',
          green: '#00C853',
          red: '#EA0027',
        },
        baseblue: '#0052FF',
      },
      fontFamily: {
        display: ['Space Grotesk', 'Inter', 'sans-serif'],
        sans: ['Inter', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
    },
  },
  plugins: [],
};
