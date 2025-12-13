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
        // Neo-Brutalism 风格字体
        display: ['"Bungee"', '"Black Ops One"', 'display'],
        mono: ['"JetBrains Mono"', '"Fira Code"', 'monospace'],
        futuristic: ['"Orbitron"', 'sans-serif'],
        space: ['"Space Grotesk"', 'sans-serif'],
        serif: ['"Playfair Display"', '"Merriweather"', 'serif'],
        // 直接字体名称，用于动态主题
        'inter': ['"Inter"', 'sans-serif'],
        'chonburi': ['"Chonburi"', 'serif'],
        'bungee': ['"Bungee"', 'display'],
        'black-ops': ['"Black Ops One"', 'display'],
        'orbitron': ['"Orbitron"', 'sans-serif'],
        'jetbrains-mono': ['"JetBrains Mono"', 'monospace'],
        'fira-code': ['"Fira Code"', 'monospace'],
        'space-grotesk': ['"Space Grotesk"', 'sans-serif'],
        'playfair': ['"Playfair Display"', 'serif'],
        'ibm-plex': ['"IBM Plex Sans"', 'sans-serif'],
      },
      boxShadow: {
        'retro': '4px 4px 0px 0px rgba(0,0,0,1)',
      }
    },
  },
  plugins: [],
}

