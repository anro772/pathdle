/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Hextech Gold palette
        hextech: {
          gold: '#C8AA6E',
          'gold-light': '#F0E6D2',
          'gold-dark': '#785A28',
        },
        // Dark theme colors
        lol: {
          dark: '#010A13',
          'dark-lighter': '#0A1428',
          'dark-card': '#1E2328',
          'dark-border': '#1E282D',
          blue: '#0AC8B9',
          'blue-dark': '#005A82',
          red: '#FF4444',
          green: '#00FF00',
        }
      },
      fontFamily: {
        'beaufort': ['Beaufort for LOL', 'serif'],
        'spiegel': ['Spiegel', 'sans-serif'],
      },
      animation: {
        'pulse-gold': 'pulse-gold 2s ease-in-out infinite',
        'bounce-select': 'bounce-select 0.3s ease-out',
        'shake': 'shake 0.5s ease-in-out',
        'glow': 'glow 1.5s ease-in-out infinite alternate',
      },
      keyframes: {
        'pulse-gold': {
          '0%, 100%': { boxShadow: '0 0 5px #C8AA6E' },
          '50%': { boxShadow: '0 0 20px #C8AA6E, 0 0 30px #C8AA6E' },
        },
        'bounce-select': {
          '0%': { transform: 'scale(1)' },
          '50%': { transform: 'scale(1.15)' },
          '100%': { transform: 'scale(1)' },
        },
        'shake': {
          '0%, 100%': { transform: 'translateX(0)' },
          '25%': { transform: 'translateX(-5px)' },
          '75%': { transform: 'translateX(5px)' },
        },
        'glow': {
          '0%': { boxShadow: '0 0 5px #0AC8B9' },
          '100%': { boxShadow: '0 0 20px #0AC8B9, 0 0 30px #0AC8B9' },
        },
      },
    },
  },
  plugins: [],
}
