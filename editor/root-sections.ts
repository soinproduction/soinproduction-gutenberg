const SECTION_ONLY_ROOT = ['page', 'post', 'service'];

/** Page-level inserter offers sections only; blocks inside sections keep their own rules. */
export function allowedAtRoot(name: string, rootClientId: string | null | undefined, postType: string, sections: Set<string>) {
  return Boolean(rootClientId) || !SECTION_ONLY_ROOT.includes(postType) || sections.has(name);
}
