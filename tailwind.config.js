/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./{app,components,libs,pages,hooks}/**/*.{html,js,ts,jsx,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Outfit', 'sans-serif'],
        serif: ['"Playfair Display"', 'serif'],
        handwriting: ['Pacifico', 'cursive'],
      },
      colors: {
        brand: {
          DEFAULT: '#1e293b',
          light: '#334155',
          dark: '#0f172a',
          accent: '#2563eb',
          muted: '#64748b',
        },
      },
    },
  },
  plugins: [],
}

