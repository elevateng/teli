/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        navy: {
          DEFAULT: '#0F2147',
          50: '#eef1f7',
          700: '#15264f',
          900: '#0b1733',
        },
        brand: {
          DEFAULT: '#F26419',
          50: '#fff3ec',
          100: '#ffe5d6',
          500: '#F26419',
          600: '#e2520a',
        },
        ink: '#0F2147',
        sub: '#5b6577',
      },
      fontFamily: {
        sans: ['Plus Jakarta Sans', 'Inter', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        card: '0 8px 30px -12px rgba(15, 33, 71, 0.12)',
        soft: '0 2px 14px -6px rgba(15, 33, 71, 0.12)',
      },
      borderRadius: {
        // slightly less rounded across the whole app
        lg: '0.45rem',
        xl: '0.6rem',
        '2xl': '0.8rem',
        '3xl': '1.1rem',
        xl2: '1.1rem',
      },
    },
  },
  plugins: [],
};
