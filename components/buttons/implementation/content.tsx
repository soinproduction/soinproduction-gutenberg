'use client';
import { recordUrl } from '../../../core/content/links.js';
import { ContentContext } from '../../../core/content/context.js';
import { richNodes } from '../../../core/content/rich-text.js';
import { ButtonLabel } from '../../../core/icons/button.js';
import { BookingButton, BookingPlanContext } from './booking.js';
import { ModalContext } from '../../../modules/modals/context.js';
import { modalFromUrl, modalUrl } from '../../../modules/modals/links.js';
import { useContext } from 'react';

import { buttonClasses } from '../../../core/ui/button-appearance.js';
export { buttonClasses } from '../../../core/ui/button-appearance.js';

/** Shared link/modal behavior. Layout belongs to the section using this button. */
export function ContentButton({
  attributes,
  fixedLayout = false,
}: {
  attributes: any;
  fixedLayout?: boolean;
}) {
  const context = useContext(ContentContext);
  const openModal = useContext(ModalContext);
  const cardPlan = useContext(BookingPlanContext);
  const linkedUrl = recordUrl(context.site, attributes.metadata?.siteLinkId);
  const a = linkedUrl ? {...attributes, url: linkedUrl} : attributes;
  const classes = buttonClasses(a.className);
  const isBooking = String(a.url ?? '').startsWith('/booking');
  const plan = isBooking
    ? new URL(a.url, 'http://local').searchParams.get('plan') ?? 'hour'
    : 'hour';
  const widthStyle =
    !fixedLayout && a.width
      ? {
          width: a.width + '%',
          flexBasis: a.width + '%',
        }
      : undefined;
  const match = modalFromUrl(a.url, context.site.modals ?? []);
  const modalId =
    Number(a.metadata?.siteModalId) ||
    match?.modal.id ||
    Number(String(a.url ?? '').match(/^\/modal\/(\d+)/)?.[1]);
  if (modalId) {
    const selected = (context.site.modals ?? []).find((m: any) => m.id === modalId);
    const selectedPlan =
      cardPlan ??
      a.metadata?.siteModalPlan ??
      match?.plan ??
      new URL(a.url || '/', 'http://local').searchParams.get('plan') ??
      'hour';
    if (!selected)
      return (
        <button disabled style={widthStyle} className={classes}>
          <ButtonLabel attributes={a}>{richNodes(a.text)}</ButtonLabel>
        </button>
      );
    return (
      <a
        data-modal-plan={selectedPlan}
        href={modalUrl(selected)}
        style={widthStyle}
        className={classes}
        onClick={(event) => {
          if (event.defaultPrevented) return;
          event.preventDefault();
          openModal(modalId, selectedPlan);
        }}
      >
        <ButtonLabel attributes={a}>{richNodes(a.text)}</ButtonLabel>
      </a>
    );
  }
  if (String(a.url ?? '').includes('#modal-'))
    return (
      <button disabled style={widthStyle} className={classes}>
        <ButtonLabel attributes={a}>{richNodes(a.text)}</ButtonLabel>
      </button>
    );
  return isBooking ? (
    <BookingButton style={widthStyle} plan={(cardPlan ?? plan) as any} className={classes}>
      <ButtonLabel attributes={a}>{richNodes(a.text)}</ButtonLabel>
    </BookingButton>
  ) : (
    <a style={widthStyle} className={classes} href={a.url ?? '#'} target={a.linkTarget} rel={a.rel}>
      <ButtonLabel attributes={a}>{richNodes(a.text)}</ButtonLabel>
    </a>
  );
}
