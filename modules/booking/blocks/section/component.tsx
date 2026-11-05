'use client';
import { useSectionAnchor } from '../../../../core/modules/section.js';
import { Component as BookingForm } from '../form/component.js';

export function Component() {
  const sectionAnchor = useSectionAnchor();
  return (
    <section id={sectionAnchor} data-motion className="mx-auto max-w-6xl px-6 py-10 for-small-tablet:py-16">
      <BookingForm variant="section" />
    </section>
  );
}
