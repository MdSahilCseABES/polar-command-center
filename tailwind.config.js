/**
 * Tailwind CSS configuration.
 *
 * The `content` list tells Tailwind which files to scan for class names.
 * If you ever add a new folder of components and the styles mysteriously
 * stop working, this list is the first place to check.
 *
 * The `theme.extend` block registers our polar colour palette with Tailwind,
 * so you can write classes like `bg-navy-900`, `text-ice` or `border-line`.
 */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],

  /**
   * SAFELIST — READ THIS IF A COLOUR EVER GOES MISSING.
   *
   * Tailwind deletes any CSS rule in a `@layer components { }` block whose
   * class name it cannot FIND WRITTEN OUT in the files listed in `content`
   * above. It searches for plain text; it does not run our code.
   *
   * That is a problem for this app, because our badge colours are chosen at
   * run time from the data:
   *
   *     <span className={`badge badge--${tone}`}>       (src/components/Badge.jsx)
   *
   * Tailwind reads that line and sees the text "badge--". It has no way to
   * know that `tone` will one day be "warn", so it decided `.badge--warn`
   * was unused and deleted it. The badge then rendered with no background
   * and plain white text — the CSS was correct and present in
   * src/index.css, but it never reached the browser.
   *
   * This list tells Tailwind: keep every rule whose class starts with one
   * of these names, whether or not you can find it. `pattern` is a regular
   * expression, and `--` is just the two dashes in our class names.
   *
   * If you add a new modifier class to src/index.css (say `.badge--pink`)
   * it is covered automatically, because the pattern matches the prefix
   * rather than a list of exact names.
   *
   * Only classes that live INSIDE `@layer components { }` need to be here.
   * The map pin classes, for example, are deliberately written outside any
   * layer further down src/index.css, and Tailwind never touches those.
   * Listing a prefix that matches nothing makes `npm run build` print a
   * warning, so keep this list to what is really needed.
   */
  safelist: [],

  theme: {
    extend: {
      colors: {
        navy: {
          950: 'var(--navy-950, #030C12)',
          900: 'var(--navy-900, #071723)',
          850: 'var(--navy-850, #0C2333)',
          800: 'var(--navy-800, #112F43)',
          700: 'var(--navy-700, #19445E)',
          600: 'var(--navy-600, #256082)',
        },
        line: 'var(--line, #153E57)',
        ice: {
          DEFAULT: 'var(--ice, #06B6D4)',
          dim: 'var(--ice-dim, #0891B2)',
        },
        signal: {
          orange: '#FF6A3D',
          amber: '#E8B84B',
          green: '#10B981',
          red: '#F43F5E',
          blue: '#38BDF8',
        },
        ink: {
          hi: 'var(--ink-hi, #ECFEFF)',
          mid: 'var(--ink-mid, #A5F3FC)',
          low: 'var(--ink-low, #67E8F9)',
        },
      },
      fontFamily: {
        display: ['Oswald', 'Arial Narrow', 'sans-serif'],
        body: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'sans-serif'],
        mono: ['JetBrains Mono', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
      },
      borderRadius: {
        DEFAULT: '8px',
      },
    },
  },
  plugins: [],
}
