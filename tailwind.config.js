/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Hextech theme colors
        'hextech-gold': '#C89B3C',
        'hextech-blue': '#0BC6E3',
        'slate-dark': '#010A13',
        'slate-medium': '#1E2328',
        'error-red': '#D13639',
        'success-green': '#0BDA51',
      },
      boxShadow: {
        'hextech': '0 0 10px rgba(11, 198, 227, 0.5), 0 0 20px rgba(11, 198, 227, 0.3)',
        'gold': '0 0 10px rgba(200, 155, 60, 0.5), 0 0 20px rgba(200, 155, 60, 0.3)',
      },
      fontFamily: {
        'beaufort': ['Beaufort for LOL', 'serif'],
        'inter': ['Inter', 'sans-serif'],
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
