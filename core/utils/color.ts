export function lineColor(value: any) {
  return typeof value === 'string' &&
    /^#(?:[\da-f]{3}|[\da-f]{4}|[\da-f]{6}|[\da-f]{8})$/i.test(value)
    ? value
    : undefined;
}
export function accentLineStyle(attributes: any = {}) {
  const color = lineColor(attributes.siteLineColor);
  return color ? { '--site-line-color': color } : {};
}
