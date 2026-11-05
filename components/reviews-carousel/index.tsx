'use client';
import { ReviewsCarouselView } from './implementation/component.js';
import type { ReviewsCarouselLabels } from './implementation/component.js';
import { kit } from '../../shared/index.js';
import { Props } from '../../shared/index.js';

/** Linked reviews in a carousel; the reviews themselves are edited as records. `labels` name the controls for screen readers. */
export const ReviewsCarousel = kit<Props & { labels?: ReviewsCarouselLabels }>(
  'reviews-carousel',
  ({ label }) => ({ type: 'custom', control: 'review-selection', label: label ?? 'Reviews', settings: true, optional: true }),
  ({ name, className, labels }) => <ReviewsCarouselView name={name} className={className} labels={labels} />
);
