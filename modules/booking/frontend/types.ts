export type WidgetSettings = {
  formCopy: Record<string, any>;
  formImage: string;
  name: string;
  description: string;
};
export type BookingTariff = {
  id: string;
  name: string;
  note: string;
  price: number;
  billing_mode: 'hourly' | 'fixed';
  duration_hours: number;
  minimum_hours?: number;
  unit: string;
};
export type BookingVariant = 'modal' | 'section' | 'inline';
export type BookingConfig = {
  turnstile_site_key?: string;
  phone: { code: string; digits: number };
  tariffs: BookingTariff[];
  timezone: string;
  today: string;
  price_per_hour: number;
  minimum_notice_hours: number;
  horizon_days: number;
  weekly: Record<string, { open: string; close: string } | null>;
  rules: string;
  widget: WidgetSettings;
};
export type AvailabilityDay = {
  date: string;
  open: string | null;
  close: string | null;
  starts: { time: string; max_hours: number }[];
};
export type Availability = { timezone: string; price_per_hour: number; days: AvailabilityDay[] };
export function dateKey(date: Date) {
  return date.toISOString().slice(0, 10);
}
export function dayHours(day?: AvailabilityDay) {
  if (!day?.open || !day.close) return [];
  const minutes = (value: string) => {
    const [h, m] = value.split(':').map(Number);
    return h * 60 + m;
  };
  const first = Math.ceil(minutes(day.open) / 60);
  const last = Math.ceil(minutes(day.close) / 60);
  return Array.from({ length: Math.max(0, last - first) }, (_, i) => first + i);
}
export function availableStart(day: AvailabilityDay | undefined, hour: number, duration: number) {
  return (
    (day?.starts.find((start) => start.time === String(hour).padStart(2, '0') + ':00')?.max_hours ??
      0) >= duration
  );
}

export function tariffDuration(tariff: BookingTariff | undefined, hours: number) {
  return tariff?.billing_mode === 'fixed' ? tariff.duration_hours : Math.max(hours, tariff?.minimum_hours ?? 1);
}
export function tariffTotal(tariff: BookingTariff | undefined, hours: number) {
  return tariff ? tariff.price * (tariff.billing_mode === 'hourly' ? hours : 1) : 0;
}
