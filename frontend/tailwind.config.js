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
        industrial: {
          bg: '#0a0d14',
          card: '#121722',
          border: '#232c3d',
          subtle: '#1b2333',
          green: '#10b981',
          yellow: '#f59e0b',
          red: '#ef4444',
          blue: '#3b82f6',
          cyan: '#06b6d4',
          gray: '#64748b',
        },
        vault: {
          bg: '#F5F6FA',
          sidebar: '#121316',
          sidebarHover: '#1B1D22',
          card: '#FFFFFF',
          cardDark: '#141718',
          lime: '#D4F63D',
          limeLight: '#E8FDB5',
          border: '#E8EAEF',
          darkBorder: '#23262C',
          textDark: '#111827',
          textMuted: '#6B7280',
        }
      },
      fontFamily: {
        mono: ['JetBrains Mono', 'Menlo', 'Monaco', 'Courier New', 'monospace'],
        sans: ['Inter', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
      animation: {
        'pulse-fast': 'pulse 1s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'conveyor': 'conveyorMove 1.5s linear infinite',
      },
      keyframes: {
        conveyorMove: {
          '0%': { backgroundPosition: '0 0' },
          '100%': { backgroundPosition: '40px 0' },
        }
      }
    },
  },
  plugins: [],
}
