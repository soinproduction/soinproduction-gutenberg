import { editorMedia } from './environment.js';
export function rememberMedia(media: any) {
  editorMedia()['attachment:' + media.id] = {
    id: media.id,
    url: media.url,
    alt: media.alt ?? '',
    mime: media.mime,
    video: media.site_video_defaults,
  };
}
export function mediaId(url: string) {
  return (Object.values(editorMedia()) as any[]).find((media) => media.url === url)?.id;
}
export function withMediaRefs(data: any) {
  const strip=(value:any):any=>Array.isArray(value)?value.map(strip):value && typeof value==='object'?Object.fromEntries(Object.entries(value).filter(([key])=>key!=='library_defaults').map(([key,child])=>[key,strip(child)])):value;
  data=strip(data);
  const refs: Record<string, number> = {};
  const known = Object.values(editorMedia()) as any[];
  const walk = (value: any, path: (string | number)[]) => {
    if (typeof value === 'string') {
      const attachment = known.find((item) => item.url === value);
      if (attachment) refs[JSON.stringify(path)] = attachment.id;
    } else if (Array.isArray(value)) value.forEach((item, index) => walk(item, [...path, index]));
    else if (value && typeof value === 'object')
      for (const [key, item] of Object.entries(value))
        if (key !== '__media') walk(item, [...path, key]);
  };
  walk(data, []);
  return {
    ...data,
    __media: refs,
  };
}
export function rememberExistingMedia(data: any) {
  for (const [encoded, id] of Object.entries(data.__media ?? {})) {
    let path;
    try {
      path = JSON.parse(encoded);
    } catch {
      continue;
    }
    const url = path.reduce((value: any, key: string | number) => value?.[key], data);
    if (typeof url === 'string')
      editorMedia()['attachment:' + id] = {
        id: Number(id),
        url,
      };
  }
}
