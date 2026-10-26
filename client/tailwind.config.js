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
        game: {
          bg: '#0c0f1d',
          surface: '#151a30',
          border: '#262f50',
          board: '#11162a',
          accent: '#6366f1',
          gold: '#f59e0b',
          emerald: '#10b981',
          rose: '#f43f5e',
          cyan: '#06b6d4',
          amber: '#d97706',
          purple: '#8b5cf6',
          blue: '#3b82f6'
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        display: ['Poppins', 'Inter', 'sans-serif']
      },
      boxShadow: {
        'tile': '0 4px 14px 0 rgba(0, 0, 0, 0.45)',
        'neon': '0 0 15px rgba(99, 102, 241, 0.5)',
        'gold': '0 0 15px rgba(245, 158, 11, 0.4)'
      }
    },
  },
  plugins: [],
}
