import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        kc: {
          brown:       '#712f1e',
          black:       '#0A0A0A',
          white:       '#FFFFFF',
          'gray-light':'#F7F5F2',
          'gray-mid':  '#6B6560',
          'gray-border':'#E0DCD6',
          red:         '#C41230',
        },
      },
      fontFamily: {
        display: ['Cormorant Garamond', 'Georgia', 'serif'],
        sans:    ['DM Sans', 'system-ui', 'sans-serif'],
      },
      letterSpacing: {
        logo:   '0.35em',
        widest: '0.25em',
        wide:   '0.12em',
      },
      animation: {
        'fade-up':  'fadeUp 0.7s ease forwards',
        'fade-in':  'fadeIn 0.5s ease forwards',
      },
      keyframes: {
        fadeUp: {
          '0%':   { opacity: '0', transform: 'translateY(24px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        fadeIn: {
          '0%':   { opacity: '0' },
          '100%': { opacity: '1' },
        },
      },
    },
  },
  plugins: [],
}
export default config
