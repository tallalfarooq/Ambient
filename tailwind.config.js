/** @type {import('tailwindcss').Config} */
module.exports = {
    darkMode: ["class"],
    content: ["./index.html", "./src/**/*.{ts,tsx,js,jsx}"],
  theme: {
  	extend: {
  		// =====================================================================
  		// Apple-clean redesign — typography scale.
  		//
  		// Use as Tailwind utilities: `text-display-xl`, `text-headline`, etc.
  		// Sizes shrink at smaller breakpoints (sm:) — the values below are the
  		// desktop targets; pages use responsive variants where needed.
  		// =====================================================================
  		fontFamily: {
  			sans: [
  				'Inter',
  				'-apple-system',
  				'BlinkMacSystemFont',
  				'"Segoe UI"',
  				'Roboto',
  				'Helvetica',
  				'Arial',
  				'sans-serif',
  			],
  		},
  		fontSize: {
  			'display-xl': ['96px',  { lineHeight: '1.0',  letterSpacing: '-0.03em', fontWeight: '800' }],
  			'display':    ['72px',  { lineHeight: '1.05', letterSpacing: '-0.025em', fontWeight: '800' }],
  			'headline':   ['48px',  { lineHeight: '1.1',  letterSpacing: '-0.02em',  fontWeight: '700' }],
  			'title':      ['32px',  { lineHeight: '1.2',  letterSpacing: '-0.015em', fontWeight: '700' }],
  			'subtitle':   ['24px',  { lineHeight: '1.3',  letterSpacing: '-0.01em',  fontWeight: '600' }],
  			'body-lg':    ['21px',  { lineHeight: '1.5',  letterSpacing: '-0.005em', fontWeight: '400' }],
  			'body':       ['17px',  { lineHeight: '1.5',  letterSpacing: '0',         fontWeight: '400' }],
  			'caption':    ['14px',  { lineHeight: '1.4',  letterSpacing: '0',         fontWeight: '500' }],
  			'eyebrow':    ['12px',  { lineHeight: '1.0',  letterSpacing: '0.12em',    fontWeight: '700' }],
  		},
  		// =====================================================================
  		// Brand colors — usable as both Tailwind classes and CSS vars.
  		// `bg-bg-base`, `text-accent-teal`, `border-border-subtle` etc.
  		// =====================================================================
  		colors: {
  			// Brand palette
  			'bg-base':       '#0A0A0B',
  			'bg-elevated':   '#141418',
  			'accent-teal':   '#1B8FA0',
  			'accent-teal-light': '#6EC6C6',
  			'accent-gold':   '#C9963A',
  			'accent-gold-light': '#D4A857',
  			// shadcn/ui legacy tokens — kept so existing components don't break
  			background: 'hsl(var(--background))',
  			foreground: 'hsl(var(--foreground))',
  			card: {
  				DEFAULT: 'hsl(var(--card))',
  				foreground: 'hsl(var(--card-foreground))'
  			},
  			popover: {
  				DEFAULT: 'hsl(var(--popover))',
  				foreground: 'hsl(var(--popover-foreground))'
  			},
  			primary: {
  				DEFAULT: 'hsl(var(--primary))',
  				foreground: 'hsl(var(--primary-foreground))'
  			},
  			secondary: {
  				DEFAULT: 'hsl(var(--secondary))',
  				foreground: 'hsl(var(--secondary-foreground))'
  			},
  			muted: {
  				DEFAULT: 'hsl(var(--muted))',
  				foreground: 'hsl(var(--muted-foreground))'
  			},
  			accent: {
  				DEFAULT: 'hsl(var(--accent))',
  				foreground: 'hsl(var(--accent-foreground))'
  			},
  			destructive: {
  				DEFAULT: 'hsl(var(--destructive))',
  				foreground: 'hsl(var(--destructive-foreground))'
  			},
  			border: 'hsl(var(--border))',
  			input: 'hsl(var(--input))',
  			ring: 'hsl(var(--ring))',
  			chart: {
  				'1': 'hsl(var(--chart-1))',
  				'2': 'hsl(var(--chart-2))',
  				'3': 'hsl(var(--chart-3))',
  				'4': 'hsl(var(--chart-4))',
  				'5': 'hsl(var(--chart-5))'
  			},
  			sidebar: {
  				DEFAULT: 'hsl(var(--sidebar-background))',
  				foreground: 'hsl(var(--sidebar-foreground))',
  				primary: 'hsl(var(--sidebar-primary))',
  				'primary-foreground': 'hsl(var(--sidebar-primary-foreground))',
  				accent: 'hsl(var(--sidebar-accent))',
  				'accent-foreground': 'hsl(var(--sidebar-accent-foreground))',
  				border: 'hsl(var(--sidebar-border))',
  				ring: 'hsl(var(--sidebar-ring))'
  			}
  		},
  		// Border-radius values for the new big-pill / rounded-card aesthetic.
  		borderRadius: {
  			lg: 'var(--radius)',
  			md: 'calc(var(--radius) - 2px)',
  			sm: 'calc(var(--radius) - 4px)',
  			'2xl': '20px',
  			'3xl': '28px',
  			'4xl': '36px',
  		},
  		// Apple-style ease curve. Use as `ease-apple` (Tailwind v3+ accepts
  		// arbitrary values like ease-[cubic-bezier(...)] but the named token
  		// keeps usage consistent across the codebase).
  		transitionTimingFunction: {
  			'apple': 'cubic-bezier(0.16, 1, 0.3, 1)',
  		},
  		// Vertical-rhythm spacing presets.
  		spacing: {
  			'section-mobile': '96px',
  			'section':        '160px',
  		},
  		keyframes: {
  			'accordion-down': {
  				from: { height: '0' },
  				to:   { height: 'var(--radix-accordion-content-height)' },
  			},
  			'accordion-up': {
  				from: { height: 'var(--radix-accordion-content-height)' },
  				to:   { height: '0' },
  			},
  			'gentle-float': {
  				'0%, 100%': { transform: 'translateY(0)' },
  				'50%':       { transform: 'translateY(-6px)' },
  			},
  		},
  		animation: {
  			'accordion-down': 'accordion-down 0.2s ease-out',
  			'accordion-up':   'accordion-up 0.2s ease-out',
  			'gentle-float':   'gentle-float 6s cubic-bezier(0.16, 1, 0.3, 1) infinite',
  		},
  	}
  },
  plugins: [require("tailwindcss-animate")],
}
