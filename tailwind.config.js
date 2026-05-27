/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        navy: {
          50: '#f0f3f8',
          100: '#d9e0ec',
          200: '#b3c1d9',
          300: '#8da2c6',
          400: '#6783b3',
          500: '#4164a0',
          600: '#345081',
          700: '#273c61',
          800: '#1a2841',
          900: '#0d1420',
          950: '#060a10',
        },
        primary: {
          50: '#eff6ff',
          100: '#dbeafe',
          500: '#3b82f6',
          600: '#2563eb',
          700: '#1d4ed8',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}