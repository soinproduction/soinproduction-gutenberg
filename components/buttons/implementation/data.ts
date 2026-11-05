import { modalUrl } from '../../../modules/modals/links.js';
export type StudioAction = {
  text: string;
  url?: string;
  action?: 'link' | 'booking';
  plan?: string;
  style?: 'accent' | 'primary' | 'outline' | 'light-outline';
};
export function buttonTemplate(actions: StudioAction[], site: any = {}) {
  return [
    [
      'core/buttons',
      { className: 'site-actions' },
      actions.map((action) => [
        'core/button',
        {
          text: action.text,
          metadata:
            action.action === 'booking'
              ? { siteModalId: site.bookingModalId, siteModalPlan: action.plan ?? 'hour' }
              : undefined,
          url:
            action.action === 'booking' &&
            site.modals?.some((m: any) => m.id === site.bookingModalId)
              ? modalUrl(site.modals.find((m: any) => m.id === site.bookingModalId))
              : action.action === 'booking'
                ? '/booking?plan=' + (action.plan ?? 'hour')
                : action.url ?? '#',
          className: 'is-style-studio-' + (action.style ?? 'primary'),
        },
      ]),
    ],
  ];
}

/** Gutenberg button-group alignment, shared by standalone actions and native content. */
export function buttonLayoutStyle(layout: any = {}) {
  return {
    justifyContent:
      layout.justifyContent === 'right'
        ? 'flex-end'
        : layout.justifyContent === 'center'
          ? 'center'
          : layout.justifyContent === 'space-between'
            ? 'space-between'
            : undefined,
    flexDirection: layout.orientation === 'vertical' ? ('column' as const) : undefined,
  };
}
export { buttonStyleOptions } from '../../../core/ui/button-appearance.js';
