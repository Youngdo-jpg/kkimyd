/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        kakao: {
          yellow: '#FEE500',
          brown: '#3C1E1E',
          chat: '#B2C8E0',
          bg: '#B2C8E0',
          sidebar: '#1B1A1C',
        },
      },
    },
  },
  plugins: [],
};
