/**
 * Normalizes a Kenyan phone number to 254XXXXXXXXX format.
 * Accepts: 07XXXXXXXX, 7XXXXXXXX, 254XXXXXXXXX
 */
export const normalizePhone = (phone: string): string => {
  let n = phone.trim();
  if (n.startsWith('0')) n = n.slice(1);
  if (!n.startsWith('254')) n = '254' + n;
  return n;
};

/** Regex for phone validation — accepts 07..., 7..., or 254... */
export const PHONE_REGEX = /^(0?7\d{8}|254\d{9})$/;
