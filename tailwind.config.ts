import type { Config } from 'tailwindcss'

const tone = (name: string) => ({
  DEFAULT: `hsl(var(--tone-${name}))`,
  soft: `hsl(var(--tone-${name}-soft))`,
})

export default {
  darkMode: ['class'],
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"IBM Plex Sans Arabic"', 'Inter', 'system-ui', '-apple-system', '"Segoe UI"', 'sans-serif'],
        latin: ['Inter', '"IBM Plex Sans Arabic"', 'system-ui', 'sans-serif'],
        mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'Consolas', 'monospace'],
      },
      colors: {
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        surface: 'hsl(var(--surface))',
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
          soft: 'hsl(var(--primary-soft))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
          soft: 'hsl(var(--destructive-soft))',
        },
        sidebar: {
          DEFAULT: 'hsl(var(--sidebar))',
          foreground: 'hsl(var(--sidebar-foreground))',
          muted: 'hsl(var(--sidebar-muted))',
          accent: 'hsl(var(--sidebar-accent))',
        },
        brand: {
          deep: 'hsl(var(--brand-deep))',
          deep2: 'hsl(var(--brand-deep2))',
          teal: 'hsl(var(--brand-teal))',
          mint: 'hsl(var(--brand-mint))',
          yellow: 'hsl(var(--brand-yellow))',
          cream: 'hsl(var(--brand-cream))',
          primary: 'hsl(var(--brand-primary))',
          ink: 'hsl(var(--brand-ink))',
          muted: 'hsl(var(--brand-muted))',
          line: 'hsl(var(--brand-line))',
          wash: 'hsl(var(--brand-wash))',
        },
        tone: {
          neutral: tone('neutral'),
          info: tone('info'),
          waiting: tone('waiting'),
          active: tone('active'),
          attention: tone('attention'),
          success: tone('success'),
          danger: tone('danger'),
          muted: tone('muted'),
        },
      },
      borderRadius: {
        // Brand radii 8 / 14 / 22 (§3): controls, cards, hero panels.
        sm: '0.5rem',
        md: '0.5rem',
        lg: 'var(--radius)',
        xl: 'var(--radius)',
        '2xl': '1.375rem',
      },
      keyframes: {
        'fade-in': { from: { opacity: '0' }, to: { opacity: '1' } },
        'slide-in-end': { from: { transform: 'translateX(var(--slide-from, 100%))' }, to: { transform: 'translateX(0)' } },
      },
      animation: {
        'fade-in': 'fade-in 150ms ease-out',
        'slide-in-end': 'slide-in-end 200ms ease-out',
      },
    },
  },
  plugins: [],
} satisfies Config
