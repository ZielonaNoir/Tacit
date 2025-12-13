/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{vue,js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          orange: '#FF4D00',
          purple: '#B829E3',
          blue: '#295CE3',
        },
        coral: {
          DEFAULT: '#FF6B6B',
          pink: '#FF8A95',
          salmon: '#FF7F7F',
        },
        surface: {
          light: '#F8F9FA',
          dark: '#121212',
        }
      },
      fontFamily: {
        heading: ['"Chonburi"', 'serif'],
        body: ['"Inter"', 'sans-serif'],
      },
      boxShadow: {
        'retro': '4px 4px 0px 0px rgba(0,0,0,1)',
      }
    },
  },
  plugins: [],
}

