export type LibraryIcon = { value: string; label: string; set: string; svg: string };
/** Stable catalogue IDs come from the CMS; no bundled icon data or fallback catalogue. */
export function libraryIcons(value: unknown): LibraryIcon[] {
  if (!Array.isArray(value)) return [];
  return value.filter(
    (item): item is LibraryIcon =>
      item &&
      typeof item.value === 'string' &&
      /^(?:[a-z0-9_-]+|custom:[a-z0-9_-]+:[a-z0-9_-]+)$/.test(item.value) &&
      typeof item.label === 'string' &&
      typeof item.set === 'string' &&
      typeof item.svg === 'string'
  );
}
export function iconSvg(key: string, library: unknown = []) {
  if (typeof key !== 'string') return undefined;
  return libraryIcons(library).find((icon) => icon.value === key)?.svg;
}
export function iconMask(key: string, library: unknown = []) {
  const svg = iconSvg(key, library);
  return svg ? `url("data:image/svg+xml,${encodeURIComponent(svg)}")` : undefined;
}
