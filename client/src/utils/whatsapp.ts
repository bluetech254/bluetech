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
  const lines: string[] = [
    '🛒 *New Order Request — BlueTech*',
    '',
    '*Items:*',
    ...items.map(
      (it) =>
        `  • ${it.name} × ${it.quantity}  →  KES ${(it.price * it.quantity).toLocaleString()}`
    ),
    '',
    `Subtotal:       KES ${subtotal.toLocaleString()}`,
  ];

  if (deliveryZone) {
    lines.push(
      `Delivery Zone:  ${deliveryZone}  (KES ${(deliveryFee ?? 0).toLocaleString()})`
    );
  }

  lines.push(
    `*Total:         KES ${total.toLocaleString()}*`,
    '',
    'Please confirm availability and share payment details. Thank you! 🙏'
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
    '🔧 *Repair Booking Request — BlueTech*',
    '',
  ];

  if (serviceName) lines.push(`Service:      ${serviceName}`);
  if (deviceType)  lines.push(`Device Type:  ${deviceType}`);
  if (deviceBrand) lines.push(`Brand:        ${deviceBrand}`);
  if (deviceModel) lines.push(`Model:        ${deviceModel}`);

  if (issueDescription) {
    lines.push('', `*Issue:*`, issueDescription);
  }

  lines.push(
    '',
    'Please confirm availability and next steps. Thank you! 🙏'
  );

  return lines.join('\n');
};
