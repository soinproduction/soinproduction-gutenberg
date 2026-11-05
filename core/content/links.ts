/** Resolve a saved WordPress record ID against the host's current public collections. */
export function recordUrl(site: Record<string, any>, id: unknown): string {
  if (!Number(id)) return '';
  for (const collection of Object.values(site)) {
    if (!Array.isArray(collection)) continue;
    const record = collection.find((item: any) => Number(item?.id) === Number(id));
    const url = record?.url ?? record?.to;
    if (typeof url === 'string' && url) return url;
  }
  return '';
}
