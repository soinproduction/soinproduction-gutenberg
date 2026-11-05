'use client';
import { useIsEditor, useSite } from '../../../../core/content/context.js';
import { BookingWidget } from '../../frontend/widget.js';
import type { BookingVariant } from '../../frontend/types.js';

export function Component({ initialPlan, variant = 'inline' }: { initialPlan?: string; variant?: BookingVariant }) {
  const editor = useIsEditor();
  const site=useSite();
  if (!editor) return <BookingWidget endpoint={site.runtime?.bookingEndpoint} initialPlan={initialPlan} variant={variant} />;
  // wp-admin has no Next proxy, so the editor preview reads the same public REST routes.
  const root = (window as any).wpApiSettings?.root ?? '/wp-json/';
  return (
    <div inert>
      <BookingWidget endpoint={root + 'site/v1/booking'} initialPlan={initialPlan} variant={variant} preview />
    </div>
  );
}
