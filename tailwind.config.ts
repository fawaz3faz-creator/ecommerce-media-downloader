module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#eafcff',
          100: '#d4f7ff',
          200: '#a6ebff',
          300: '#6dd9ff',
          400: '#3cbaf7',
          500: '#1699ea',
          600: '#0e7cc7',
          700: '#0d639d',
          800: '#0f517e',
          900: '#124666',
        }
      },
      boxShadow: {
        glow: '0 0 0 1px rgba(110, 231, 255, 0.2), 0 20px 50px rgba(15, 118, 110, 0.25)',
      }
    },
  },
  plugins: [],
};
