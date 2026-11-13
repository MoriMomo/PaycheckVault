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
          bg: '#000000',
          card: '#08080A',
          elevated: '#101014',
          blue: '#2756FC',
          cyan: '#58A6FF',
          silver: '#D4D4D8',
          green: '#10B981',
          red: '#DC2626',
        },
        baseblue: '#0052FF',
      },
      fontFamily: {
        display: ['Archivo', 'IBM Plex Sans', 'sans-serif'],
        sans: ['IBM Plex Sans', 'sans-serif'],
        mono: ['IBM Plex Mono', 'monospace'],
      },
    },
  },
  plugins: [],
};
