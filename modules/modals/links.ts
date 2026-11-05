import { modalHref } from '../../core/utils/url.js';
export function modalUrl(modal: any) {
  return modalHref(modal);
}
export function modalFromUrl(value: any, modals: any = []) {
  let url;
  try {
    url = new URL(value || '', 'http://local');
  } catch {
    return null;
  }
  let modal;
  if (url.hash.startsWith('#modal-')) {
    let slug;
    try {
      slug = decodeURIComponent(url.hash.slice(7));
    } catch {
      return null;
    }
    modal = modals.find((m: any) => m.slug === slug);
  }
  return modal ? { modal, plan: url.searchParams.get('plan') ?? 'hour' } : null;
}
