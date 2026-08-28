/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.html'],
  theme: {
    extend: {
      fontFamily: { sans: ['Inter', 'sans-serif'] },
      colors: {
        brand: {
          50: '#f0f7ff',
          100: '#e0effe',
          200: '#bae0fd',
          500: '#0284c7',
          600: '#0369a1',
          700: '#075985',
          800: '#082f49',
          900: '#0c2a4d',
        },
        ia: {
          50: '#f5f3ff',
          100: '#ede9fe',
          200: '#ddd6fe',
          500: '#8b5cf6',
          600: '#7c3aed',
        },
        surface: {
          50: '#F8FAFC',
          100: '#F1F5F9',
          200: '#E2E8F0',
          800: '#1E293B',
          900: '#0F172A',
        },
      },
      boxShadow: {
        subtle: '0 4px 20px -2px rgba(0,0,0,0.03)',
        float: '0 20px 40px -10px rgba(12, 42, 77, 0.08)',
        'ia-glow': '0 0 20px rgba(139, 92, 246, 0.15)',
      },
    },
  },
  plugins: [],
};
