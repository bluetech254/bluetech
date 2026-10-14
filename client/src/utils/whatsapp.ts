/**
 * utils/whatsapp.ts — Build wa.me deep-links that open WhatsApp with a pre-typed message.
 *
 * No backend required. The user reviews the message and hits Send themselves.
 */

/** Business WhatsApp number in international format (no + or spaces). */
export const BUSINESS_WHATSAPP = '254739224825';

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
  // Customer details — prefilled from checkout form
  customerName?: string;
  customerPhone?: string;
  deliveryAddress?: string;
  notes?: string;
}

export const buildOrderMessage = ({
  items,
  subtotal,
  deliveryZone,
  deliveryFee,
  total,
  customerName,
  customerPhone,
  deliveryAddress,
  notes,
}: OrderWhatsAppParams): string => {
  const itemLines = items.map(
    (it, i) =>
      `${i + 1}. ${it.name}\n    Qty: ${it.quantity}  ×  ${fmt(it.price)}  =  *${fmt(it.price * it.quantity)}*`
  );

  const lines: string[] = [
    '🛍️ *ORDER REQUEST*',
    '*Fixit Blue Technology*',
    '',
    '*📦 Items Ordered:*',
    ...itemLines,
    '',
    `🧾 Subtotal:       ${fmt(subtotal)}`,
  ];

  if (deliveryZone) {
    lines.push(`🚚 Delivery (${deliveryZone}):  ${fmt(deliveryFee ?? 0)}`);
  }

  lines.push(`💰 *TOTAL:          ${fmt(total)}*`);

  lines.push(
    '',
    '📍 *Delivery Details:*',
    `Name:    ${customerName     || '_[Please fill in your name]_'}`,
    `Address: ${deliveryAddress  || '_[Please fill in your delivery address]_'}`,
    `Phone:   ${customerPhone    || '_[Please confirm your phone number]_'}`,
  );

  if (notes) lines.push(`📝 Notes:   ${notes}`);

  lines.push(
    '',
    '✅ Please confirm stock availability and share payment details.',
    '⏱️ Expected response within *30 minutes* during business hours.',
    '',
    '_Fixit Blue Technology — Fast · Honest · Professional_ 🔵',
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
  // Customer details — prefilled from booking form
  customerName?: string;
  customerPhone?: string;
  preferredDate?: string;
  preferredTime?: string;
  notes?: string;
}

export const buildBookingMessage = ({
  serviceName,
  deviceType,
  deviceBrand,
  deviceModel,
  issueDescription,
  customerName,
  customerPhone,
  preferredDate,
  preferredTime,
  notes,
}: BookingWhatsAppParams): string => {
  const lines: string[] = [
    '🔧 *REPAIR BOOKING REQUEST*',
    '*Fixit Blue Technology*',
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
    `Name:  ${customerName  || '_[Your full name]_'}`,
    `Phone: ${customerPhone || '_[Your phone number]_'}`,
  );

  lines.push(
    '',
    '🗓️ *Preferred Appointment:*',
    `Date: ${preferredDate || '_[e.g. Tomorrow, 15 Oct]_'}`,
    `Time: ${preferredTime || '_[e.g. Morning / Afternoon]_'}`,
  );

  if (notes) lines.push(`📝 Notes: ${notes}`);

  lines.push(
    '',
    '✅ We\'ll confirm your booking and estimated cost within *30 minutes*.',
    '🏪 Drop-off or free pickup available in select areas.',
    '',
    '_Fixit Blue Technology — Fast · Honest · Professional_ 🔵',
  );

  return lines.join('\n');
};
