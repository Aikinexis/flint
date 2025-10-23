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
        'bg-dark': 'var(--bg-dark)',
        bg: 'var(--bg)',
        'bg-light': 'var(--bg-light)',
        surface: 'var(--surface)',
        surface2: 'var(--surface-2)',
        text: 'var(--text)',
        'text-muted': 'var(--text-muted)',
        highlight: 'var(--highlight)',
        border: 'var(--border)',
        'border-muted': 'var(--border-muted)',
        primary: 'var(--primary)',
        secondary: 'var(--secondary)',
        danger: 'var(--danger)',
        warning: 'var(--warning)',
        success: 'var(--success)',
        info: 'var(--info)',
      },
      boxShadow: {
        soft: 'var(--shadow-soft)',
        focus: 'var(--shadow-focus)',
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
