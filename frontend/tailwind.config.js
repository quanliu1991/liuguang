/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#5B8CFF',
          light: '#7AA2FF',
          dark: '#3B6BDD',
        },
        bg: {
          DEFAULT: '#F5F7FB',
          card: '#FFFFFF',
        },
        text: {
          primary: '#111827',
          secondary: '#6B7280',
          muted: '#9CA3AF',
        },
        border: {
          DEFAULT: 'rgba(0,0,0,0.06)',
          light: 'rgba(0,0,0,0.04)',
        },
      },
      fontFamily: {
        sans: ['-apple-system', 'BlinkMacSystemFont', 'SF Pro Display', 'Segoe UI', 'Roboto', 'sans-serif'],
        mono: ['SF Mono', 'JetBrains Mono', 'Fira Code', 'Consolas', 'monospace'],
      },
      borderRadius: {
        card: '24px',
        lg: '16px',
        md: '14px',
        sm: '10px',
      },
      boxShadow: {
        card: '0 2px 12px rgba(0,0,0,0.04), 0 1px 3px rgba(0,0,0,0.03)',
        'card-hover': '0 8px 30px rgba(0,0,0,0.08), 0 2px 8px rgba(0,0,0,0.04)',
        'input-focus': '0 0 0 3px rgba(91,140,255,0.15)',
        sidebar: '2px 0 12px rgba(0,0,0,0.02)',
      },
      height: {
        header: '72px',
      },
      width: {
        sidebar: '280px',
      },
    },
  },
  plugins: [],
}
