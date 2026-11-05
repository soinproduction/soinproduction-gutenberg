export type MediaRecord = { id?: number; url: string; alt?: string; mime?: string; video?: import('./universal/model').MediaDefaults };
export type MediaLibrary = Record<string, MediaRecord>;
export function resolveMedia(value: any, media: MediaLibrary = {}): any {
  if (typeof value === 'string') return media[value]?.url ?? value;
  if (Array.isArray(value)) return value.map((item) => resolveMedia(item, media));
  if (value && typeof value === 'object')
    return Object.fromEntries(
      Object.entries(value).map(([key, child]) => [key, resolveMedia(child, media)])
    );
  return value;
}
