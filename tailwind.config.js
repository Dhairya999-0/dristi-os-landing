/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#f4f6ff',
          100: '#e9edff',
          200: '#cdd5ff',
          300: '#a2b1ff',
          400: '#6f83ff',
          500: '#3b4eff',
          600: '#2533ff',
          700: '#141fff',
          800: '#1019d9',
          900: '#1119aa',
          950: '#060a66',
        },
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        display: ['Outfit', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
