/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.html'],
  theme: {
    extend: {
      fontFamily: {
        // Archivo, Chivo y Chivo Mono son de Omnibus-Type (Buenos Aires).
        // Se autoalojan; ver los @font-face al inicio de src/styles.css.
        display: ['"Archivo Variable"', 'Archivo', 'system-ui', 'sans-serif'],
        sans: ['Chivo', 'system-ui', 'sans-serif'],
        mono: ['"Chivo Mono"', 'ui-monospace', 'monospace'],
      },
      colors: {
        // La paleta es semantica, no decorativa:
        //   kraft = material manual (lo que llega)
        //   verde = estado sistematizado (lo que queda). Tambien es el color de accion.
        //   ambar = pendiente o por vencer. Uso escaso, a proposito.
        tinta:  { DEFAULT: '#14202A', 700: '#2C3D4A', 500: '#546471', 300: '#8B99A3' },
        papel:  { DEFAULT: '#FBF9F4', 100: '#F4F0E7', 200: '#E9E3D6' },
        kraft:  { DEFAULT: '#E3D5BC', 600: '#C9B490', 800: '#9C855C' },
        verde:  { DEFAULT: '#0C6B4F', 600: '#0A5741', 300: '#5FA98D', 100: '#DCEBE2' },
        ambar:  { DEFAULT: '#B4560F', 100: '#F6E7D6', 300: '#E8A66B' },
      },
      borderRadius: {
        // Fichas y registros, no pastillas: casi recto en todo el sitio.
        DEFAULT: '3px',
        ficha: '3px',
      },
      maxWidth: { pagina: '1180px' },
    },
  },
  plugins: [],
};
