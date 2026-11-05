export function modalHref(modal: { slug: string }) {
  return '/#modal-' + encodeURIComponent(modal.slug);
}
