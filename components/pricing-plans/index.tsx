'use client';
import { PricingPlansView } from './implementation/component.js';
import { kit } from '../../shared/index.js';
import { Props } from '../../shared/index.js';

/** Linked booking plans; prices and conditions are edited in the booking module. */
export const PricingPlans = kit<Props>(
  'pricing-plans',
  ({ label }) => ({ type: 'custom', control: 'tariff-selection', label: label ?? 'Pricing plans', settings: true, optional: true }),
  ({ name, className }) => <PricingPlansView name={name} className={className} />
);
