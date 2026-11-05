import { fields } from '../../../../core/fields/schema.js';
export const schema = fields().build();
export const moduleInfo = {
  name: 'site/booking-form',
  title: 'Booking form',
  icon: 'calendar-alt',
  kind: 'component',
} satisfies import('../../../../core/modules/types.js').ModuleInfo;
