/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./index.html', './src/**/*.{ts,tsx,js,jsx}'],
  theme: {
    extend: {
      borderRadius: {
        sm: '10px',
        md: '16px',
        lg: '24px',
      },
      colors: {
        bg: 'var(--bg)',
        surface: 'var(--surface)',
        surface2: 'var(--surface-2)',
        text: 'var(--text)',
        muted: 'var(--muted)',
        disabled: 'var(--disabled)',
        accent: 'var(--accent)',
        accent2: 'var(--accent-2)',
        comp: 'var(--comp)',
        comp2: 'var(--comp-2)',
        stroke: 'var(--stroke)',
        'stroke-strong': 'var(--stroke-strong)',
      },
      boxShadow: {
        soft: '0 8px 24px rgba(0, 0, 0, 0.25)',
        glow: '0 0 0 1px rgba(249, 115, 22, 0.25), 0 12px 40px rgba(249, 115, 22, 0.18)',
      },
      fontFamily: {
        sans: [
          'Inter',
          'system-ui',
          '-apple-system',
          'Segoe UI',
          'Roboto',
          'Helvetica',
          'Arial',
          'Apple Color Emoji',
          'Segoe UI Emoji',
        ],
      },
      fontSize: {
        xs: 'var(--fs-xs)',
        sm: 'var(--fs-sm)',
        md: 'var(--fs-md)',
        lg: 'var(--fs-lg)',
        xl: 'var(--fs-xl)',
        '2xl': 'var(--fs-2xl)',
      },
      height: {
        btn: 'var(--btn-height)',
        toolbar: 'var(--toolbar-height)',
      },
    },
  },
  plugins: [],
};
