/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: 'rgb(var(--ink) / <alpha-value>)',
        wine: 'rgb(var(--wine) / <alpha-value>)',
        cherry: 'rgb(var(--cherry) / <alpha-value>)',
        rose: 'rgb(var(--rose) / <alpha-value>)',
        petal: 'rgb(var(--petal) / <alpha-value>)',
        cream: 'rgb(var(--cream) / <alpha-value>)'
      },
      fontFamily: {
        display: ['"Instrument Serif"', 'Georgia', 'serif'],
        body: ['"Cormorant Garamond"', 'Georgia', 'serif'],
        mono: ['"DM Mono"', 'ui-monospace', 'Menlo', 'monospace'],
        script: ['"Pinyon Script"', 'cursive']
      }
    }
  },
  plugins: []
};
