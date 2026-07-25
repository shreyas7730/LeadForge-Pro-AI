/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ['class'],
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        app: 'var(--bg-app)',
        sidebar: 'var(--bg-sidebar)',
        card: 'var(--bg-card)',
        elevated: 'var(--bg-elevated)',
        muted: 'var(--bg-muted)',
        border: {
          DEFAULT: 'var(--border-subtle)',
          strong: 'var(--border-strong)',
        },
        foreground: {
          DEFAULT: 'var(--text-primary)',
          secondary: 'var(--text-secondary)',
          tertiary: 'var(--text-tertiary)',
        },
        emerald: {
          DEFAULT: 'var(--accent-emerald)',
          hover: 'var(--accent-emerald-hover)',
        },
        cyan: 'var(--accent-cyan)',
        success: 'var(--success)',
        warning: 'var(--warning)',
        danger: 'var(--danger)',
        info: 'var(--info)',
      },
      borderRadius: {
        sm: '6px',
        md: '8px',
        lg: '12px',
        xl: '16px',
        '2xl': '20px',
      },
      fontFamily: {
        sans: [
          'Inter',
          '-apple-system',
          'BlinkMacSystemFont',
          'Segoe UI',
          'Roboto',
          'sans-serif',
        ],
      },
      fontSize: {
        micro: ['12px', { lineHeight: '1.3', fontWeight: '500' }],
        caption: ['13px', { lineHeight: '1.4' }],
        body: ['14px', { lineHeight: '1.5' }],
        'body-medium': ['14px', { lineHeight: '1.5', fontWeight: '500' }],
        heading: ['16px', { lineHeight: '1.4', fontWeight: '600' }],
        title: ['20px', { lineHeight: '1.3', fontWeight: '600' }],
        display: ['30px', { lineHeight: '1.2', fontWeight: '600' }],
      },
      spacing: {
        1: '4px',
        2: '8px',
        3: '12px',
        4: '16px',
        5: '20px',
        6: '24px',
        8: '32px',
        10: '40px',
        12: '48px',
        16: '64px',
      },
      boxShadow: {
        elev1: '0 1px 2px rgba(0,0,0,0.30)',
        elev2: '0 4px 12px rgba(0,0,0,0.40)',
        elev3: '0 8px 24px rgba(0,0,0,0.50)',
        elev4: '0 16px 40px rgba(0,0,0,0.55)',
      },
      transitionDuration: {
        fast: '100ms',
        normal: '200ms',
        slow: '300ms',
      },
      minWidth: {
        window: '1024px',
      },
      minHeight: {
        window: '680px',
      },
    },
  },
  plugins: [],
};
