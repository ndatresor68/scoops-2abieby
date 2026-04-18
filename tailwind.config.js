/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#fdf2f2',
          100: '#fbe4e4',
          200: '#f7cdcd',
          300: '#f1a9a9',
          400: '#e57a7a',
          500: '#d44d4d',
          600: '#7a1f1f', // Votre couleur actuelle
          700: '#661a1a',
          800: '#551616',
          900: '#471313',
          950: '#260808',
        },
      },
      borderRadius: {
        'xl': '1rem',
        '2xl': '1.5rem',
        '3xl': '2rem',
      },
      boxShadow: {
        'soft': '0 10px 25px -5px rgba(0, 0, 0, 0.05), 0 8px 10px -6px rgba(0, 0, 0, 0.05)',
        'premium': '0 20px 50px rgba(122, 31, 31, 0.12)',
      }
    },
  },
  plugins: [],
}
