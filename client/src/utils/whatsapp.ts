/**
 * utils/whatsapp.ts — Build wa.me deep-links that open WhatsApp with a pre-typed message.
 *
 * No backend required. The user reviews the message and hits Send themselves.
 */

/** Business WhatsApp number in international format (no + or spaces). */
export const BUSINESS_WHATSAPP = '254707454182';

/** Open a wa.me link in a new tab. */
export const openWhatsApp = (message: string): void => {
  const url = `https://wa.me/${BUSINESS_WHATSAPP}?text=${encodeURIComponent(message)}`;
  window.open(url, '_blank', 'noopener,noreferrer');
};

const fmt = (n: number) => `KES ${n.toLocaleString('en-KE')}`;

// ─── Order message ─────────────────────────────────────────────────────────────

export interface OrderWhatsAppParams {
  items: { name: string; quantity: number; price: number }[];
  subtotal: number;
  deliveryZone?: string;
  deliveryFee?: number;
  total: number;
}

export const buildOrderMessage = ({
  items,
  subtotal,
  deliveryZone,
  deliveryFee,
  total,
}: OrderWhatsAppParams): string => {
  const itemLines = items.map(
    (it, i) =>
      `${i + 1}. ${it.name}\n    Qty: ${it.quantity}  ×  ${fmt(it.price)}  =  *${fmt(it.price * it.quantity)}*`
  );

  const lines: string[] = [
    '🛍️ *ORDER REQUEST*',
    '*BlueTech — Fixit Blue Technology*',
    '',
    '*📦 Items Ordered:*',
    ...itemLines,
    '',
    `🧾 Subtotal:       ${fmt(subtotal)}`,
  ];

  if (deliveryZone) {
    lines.push(`🚚 Delivery (${deliveryZone}):  ${fmt(deliveryFee ?? 0)}`);
  }

  lines.push(
    `💰 *TOTAL:          ${fmt(total)}*`,
    '',
    '📍 *Delivery Details:*',
    'Name:    _[Please fill in your name]_',
    'Address: _[Please fill in your delivery address]_',
    'Phone:   _[Please confirm your phone number]_',
    '',
    '✅ Please confirm stock availability and share payment details.',
    '⏱️ Expected response within *30 minutes* during business hours.',
    '',
    '_BlueTech — Fast · Honest · Professional_ 🔵',
  );

  return lines.join('\n');
};

// ─── Booking message ────────────────────────────────────────────────────────────

export interface BookingWhatsAppParams {
  serviceName?: string;
  deviceType?: string;
  deviceBrand?: string;
  deviceModel?: string;
  issueDescription?: string;
}

export const buildBookingMessage = ({
  serviceName,
  deviceType,
  deviceBrand,
  deviceModel,
  issueDescription,
}: BookingWhatsAppParams): string => {
  const lines: string[] = [
    '🔧 *REPAIR BOOKING REQUEST*',
    '*BlueTech — Fixit Blue Technology*',
    '',
    '📋 *Service Details:*',
  ];

  if (serviceName) lines.push(`🔩 Service:      *${serviceName}*`);

  lines.push('', '📱 *Device Information:*');
  if (deviceType)  lines.push(`   Type:   ${deviceType.charAt(0).toUpperCase() + deviceType.slice(1)}`);
  if (deviceBrand) lines.push(`   Brand:  ${deviceBrand}`);
  if (deviceModel) lines.push(`   Model:  ${deviceModel}`);
  if (!deviceBrand && !deviceModel) lines.push('   _[Please describe your device]_');

  if (issueDescription) {
    lines.push('', '🚨 *Problem Description:*', `_${issueDescription}_`);
  } else {
    lines.push('', '🚨 *Problem Description:*', '_[Please describe the issue with your device]_');
  }

  lines.push(
    '',
    '👤 *Your Details:*',
    'Name:  _[Your full name]_',
    'Phone: _[Your phone number]_',
    '',
    '🗓️ *Preferred Appointment:*',
    'Date: _[e.g. Tomorrow, 15 Oct]_',
    'Time: _[e.g. Morning / Afternoon]_',
    '',
    '✅ We\'ll confirm your booking and estimated cost within *30 minutes*.',
    '🏪 Drop-off or free pickup available in select areas.',
    '',
    '_BlueTech — Fast · Honest · Professional_ 🔵',
  );

  return lines.join('\n');
};
