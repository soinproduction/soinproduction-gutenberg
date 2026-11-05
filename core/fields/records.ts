import type { FieldDefinition } from './schema.js';
export function relationshipRecords(field: FieldDefinition, site: any = {}) {
  const key = field.collection ?? (field.postType ?? 'post') + 's';
  return (site[key] ?? []).map((item: any) => {
    const data = item.data ?? {};
    const slug = encodeURIComponent(item.slug ?? '');
    const url =
      item.url ?? item.to ?? (field.basePath === null ? '' : (field.basePath ?? '/') + slug);
    return {
      ...item,
      title: item.title ?? item.question ?? data.author ?? '',
      image: item.image ?? data.image ?? '',
      alt: item.alt ?? data.alt ?? '',
      excerpt: item.excerpt ?? item.text ?? item.answer ?? data.text ?? '',
      url,
    };
  });
}
export function safeUrl(value: unknown) {
  const url = String(value ?? '').trim();
  if (!url || /[\u0000-\u0020\\]/.test(url)) return '';
  if (/^(?:https?:|mailto:|tel:)/i.test(url) || /^(?:\/(?!\/)|#|\?)/.test(url)) return url;
  return '';
}

/** Deterministic latest-first order shared by relationship previews and rendered collections. */
export function latestRecords(records:any[],limit:number){
 const time=(record:any)=>Date.parse(record.publishedAt??record.date??'')||0;
 return [...records].sort((a,b)=>time(b)-time(a)||Number(b.id)-Number(a.id)).slice(0,Math.max(0,Math.floor(limit)));
}
export function recordDate(value:unknown){
 const timestamp=Date.parse(String(value??''));
 if(!Number.isFinite(timestamp))return null;
 const date=new Date(timestamp);
 return {dateTime:date.toISOString(),text:`${String(date.getUTCDate()).padStart(2,'0')}.${String(date.getUTCMonth()+1).padStart(2,'0')}.${date.getUTCFullYear()}`};
}
