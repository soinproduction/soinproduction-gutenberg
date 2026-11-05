import { initDuration } from './duration.js';
export function initBookingForm() {
  const form = document.querySelector('.site-booking-create');
  if (!form) return;
  const type = form.elements.type;
  const client = form.querySelector('[data-booking-client]');
  const amount = form.elements.amount;
  let customAmount = false;
  amount.addEventListener('input', () => { customAmount = true; });
  const update = () => {
    const block = type.value === 'block';
    client.hidden = block;
    client.querySelectorAll('input').forEach(input => { input.disabled = block; });
    form.elements.note.required = block;
    if (!customAmount) amount.value = (Number(form.dataset.price) * Number(form.elements.hours.value) / 100).toFixed(2);
  };
  type.addEventListener('change', update);
  form.elements.hours.addEventListener('input', update);
  // Retain an administrator's explicit amount after a server validation error.
  customAmount = Number(amount.value) !== Number(form.dataset.price) * Number(form.elements.hours.value) / 100;
  update();
  initDuration(form);
}
