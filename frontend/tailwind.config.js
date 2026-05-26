/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#0F6E56',
          light: '#1D9E75',
          bg: '#F8FFFE',
          surface: '#E1F5EE',
          border: '#e0f0ec',
        },
        ink: {
          DEFAULT: '#2C2C2A',
          2: '#5F5E5A',
          3: '#888780',
        },
        success: '#3B6D11',
        warn: {
          DEFAULT: '#854F0B',
          bg: '#FAEEDA',
        },
        danger: {
          DEFAULT: '#A32D2D',
          bg: '#FCEBEB',
        },
      },
      fontFamily: {
        sans: ['-apple-system', 'BlinkMacSystemFont', '"Segoe UI"', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
