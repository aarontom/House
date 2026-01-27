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
        background: 'var(--color-background)',
        card: 'var(--color-card)',
        'card-hover': 'var(--color-card-hover)',
        border: 'var(--color-border)',
        text: 'var(--color-text)',
        yes: 'var(--color-yes)',
        'yes-hover': 'var(--color-yes-hover)',
        no: 'var(--color-no)',
        'no-hover': 'var(--color-no-hover)',
        accent: 'var(--color-accent)',
        'accent-hover': 'var(--color-accent-hover)',
        muted: 'var(--color-text-muted)',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'gradient': 'gradient 8s linear infinite',
      },
      keyframes: {
        gradient: {
          '0%, 100%': { backgroundPosition: '0% 50%' },
          '50%': { backgroundPosition: '100% 50%' },
        },
      },
    },
  },
  plugins: [],
}
