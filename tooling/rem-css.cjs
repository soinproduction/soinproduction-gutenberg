/** Normalize generated/vendor CSS dimensions; authored layout uses rem directly. */
const dimension = /(-?(?:\d*\.)?\d+)px\b/g;
const convert = (value, base) => value.replace(dimension, (_, n) => `${Number((Number(n) / base).toFixed(6))}rem`);
module.exports = () => ({
  postcssPlugin: 'site-rem-dimensions',
  Declaration(decl) {
    // URL payloads describe media assets, not CSS layout dimensions.
    decl.value = decl.value.split(/(url\([^)]*\))/g).map(part => part.startsWith('url(') ? part : convert(part, 10)).join('');
  },
  AtRule(rule) {
    if (rule.name === 'media' || rule.name === 'container') rule.params = convert(rule.params, 16);
  },
});
module.exports.postcss = true;
