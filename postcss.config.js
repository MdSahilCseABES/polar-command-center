// PostCSS is the step that processes our CSS file.
// It runs Tailwind, then adds browser prefixes automatically.
// You will almost certainly never need to touch this file.

export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
}
