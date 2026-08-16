/**
 * Tailwind v4 CSS-first setup (design.md "Tailwind Adoption"): v4 handles
 * autoprefixing and CSS import resolution internally via Lightning CSS, so
 * no `tailwind.config.js`, `autoprefixer`, or `postcss-import` are needed.
 */
const config = {
  plugins: {
    '@tailwindcss/postcss': {},
  },
};

export default config;
