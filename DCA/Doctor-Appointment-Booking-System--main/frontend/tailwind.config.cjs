/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#4F46E5',
          '50': '#EBEAFD',
          '100': '#D7D5FB',
          '200': '#B0ABF7',
          '300': '#8881F3',
          '400': '#6157EF',
          '500': '#4F46E5',
          '600': '#2C22DD',
          '700': '#231CB5',
          '800': '#1A158D',
          '900': '#120F65',
        },
        secondary: {
          DEFAULT: '#10B981',
          '50': '#E6F6F0',
          '100': '#CDEEE2',
          '200': '#9ADEC5',
          '300': '#67CDA8',
          '400': '#34BD8B',
          '500': '#10B981',
          '600': '#0D9267',
          '700': '#0A6C4D',
          '800': '#074633',
          '900': '#032019',
        },
      },
      fontFamily: {
        sans: ['Outfit', 'sans-serif'],
      },
      boxShadow: {
        card: '0 4px 8px rgba(0, 0, 0, 0.05)',
        dropdown: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
    },
  },
  plugins: [],
}

