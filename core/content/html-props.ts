export function domProps(input: any = {}) {
  const out: any = {};
  for (const [k, v] of Object.entries(input)) {
    if (/^on/i.test(k) || k === 'dangerouslySetInnerHTML' || k === 'children') continue;
    if (
      ['href', 'src', 'action', 'formaction'].includes(k) &&
      typeof v === 'string' &&
      /^(?:javascript|vbscript|data):/i.test(v.replace(/[\u0000-\u0020]/g, ''))
    )
      continue;
    const svg: any = {
      viewbox: 'viewBox',
      maxlength: 'maxLength',
      minlength: 'minLength',
      autocomplete: 'autoComplete',
      autofocus: 'autoFocus',
      crossorigin: 'crossOrigin',
      playsinline: 'playsInline',
      'stroke-width': 'strokeWidth',
      'stroke-linecap': 'strokeLinecap',
      'stroke-linejoin': 'strokeLinejoin',
      'fill-rule': 'fillRule',
      'clip-rule': 'clipRule',
      'aria-roledescription': 'aria-roledescription',
    };
    if (
      [
        'required',
        'disabled',
        'checked',
        'multiple',
        'autofocus',
        'readonly',
        'open',
        'hidden',
      ].includes(k) &&
      v === ''
    ) {
      out[k === 'readonly' ? 'readOnly' : k === 'autofocus' ? 'autoFocus' : k] = true;
      continue;
    }
    out[
      svg[k] ??
        (k === 'class'
          ? 'className'
          : k === 'for'
            ? 'htmlFor'
            : k === 'tabindex'
              ? 'tabIndex'
              : k === 'srcset'
                ? 'srcSet'
                : k === 'readonly'
                  ? 'readOnly'
                  : k)
    ] = v;
  }
  if (typeof out.style === 'string')
    out.style = Object.fromEntries(
      out.style
        .split(';')
        .filter((r: string) => r.includes(':'))
        .map((r: string) => {
          const i = r.indexOf(':');
          const k = r.slice(0, i).trim();
          return [
            k.startsWith('--')
              ? k
              : k.replace(/-([a-z])/g, (_: string, c: string) => c.toUpperCase()),
            r.slice(i + 1).trim(),
          ];
        })
    );
  return out;
}
export const safeTag = (tag: string) =>
  /^(?:section|header|footer|main|article|aside|nav|div|span|p|h[1-6]|ul|ol|li|blockquote|figure|figcaption|a|button|label|form|details|summary|table|thead|tbody|tr|td|th|dl|dt|dd|small|strong|em|time|address)$/.test(
    tag
  )
    ? tag
    : 'div';
