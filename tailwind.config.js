/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        obsidian: '#080909',
        charcoal: '#151716',
        champagne: {
          DEFAULT: '#D6A754',
          light: '#F4C979',
          dark: '#B08332',
        },
        warmgold: '#F4C979',
        cuexemerald: {
          DEFAULT: '#08784D',
          dark: '#063A2C',
          light: '#0ea46c',
        },
        warmivory: '#E9E3D6',
        mutedgrey: '#999B96',
      },
      fontFamily: {
        display: ['"Bebas Neue"', 'sans-serif'],
        cinzel: ['"Cinzel"', 'serif'],
        sans: ['"Manrope"', 'sans-serif'],
      },
      boxShadow: {
        'gold-glow': '0 0 25px rgba(214, 167, 84, 0.25)',
        'gold-glow-lg': '0 0 40px rgba(214, 167, 84, 0.4)',
        'emerald-glow': '0 0 30px rgba(8, 120, 77, 0.3)',
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'float-slow': 'float 6s ease-in-out infinite',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-10px)' },
        }
      }
    },
  },
  plugins: [],
}
