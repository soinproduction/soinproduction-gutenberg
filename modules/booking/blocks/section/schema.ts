import { fields } from '../../../../core/fields/schema.js';
export const schema = fields().build();
export const moduleInfo = {
  name: 'site/booking-section',
  title: 'Booking section',
  icon: 'calendar-alt',
  kind: 'section',
  preview: 'sections/booking.svg',
} satisfies import('../../../../core/modules/types.js').ModuleInfo;
