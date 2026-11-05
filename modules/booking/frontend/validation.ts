export type PhoneRule = { code: string; digits: number };
export type ContactErrors = Partial<Record<'name' | 'phone' | 'email', 'required' | 'phone' | 'email'>>;

function validPhone(value: string, { code, digits }: PhoneRule) {
  const phone = value.replace(/[\s()-]/g, '');
  return new RegExp(`^(?:\\+?${code}|0)\\d{${digits}}$`).test(phone);
}

/** Instant feedback only: WordPress repeats every check and stays the authority. */
export function validateContacts(
  { name, phone, email }: { name: string; phone: string; email: string },
  rule: PhoneRule
) {
  const errors: ContactErrors = {};
  if (!name.trim()) errors.name = 'required';
  if (!phone.trim()) errors.phone = 'required';
  else if (!validPhone(phone, rule)) errors.phone = 'phone';
  if (!email.trim()) errors.email = 'required';
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.email = 'email';
  return errors;
}
