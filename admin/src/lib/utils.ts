/**
 * Utility functions for Blue Technology Admin Panel
 */

// Format KES currency
export function formatKES(amount: number): string {
  return 'KES ' + amount.toLocaleString('en-KE', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  });
}

// Format phone number to WhatsApp Link (e.g., "254712345678")
export function formatWhatsAppLink(phone: string, text: string = ''): string {
  // Clean phone number: remove non-digits, replace leading 0 with 254
  let cleaned = phone.replace(/\D/g, '');
  if (cleaned.startsWith('0')) {
    cleaned = '254' + cleaned.substring(1);
  } else if (!cleaned.startsWith('254') && cleaned.length === 9) {
    cleaned = '254' + cleaned;
  }
  
  const encodedText = encodeURIComponent(text || 'Hello, this is Blue Technology Admin Support regarding your order/booking.');
  return `https://wa.me/${cleaned}?text=${encodedText}`;
}

// Format phone for standard calling (tel:)
export function formatTelLink(phone: string): string {
  let cleaned = phone.replace(/\D/g, '');
  if (cleaned.startsWith('0')) {
    cleaned = '254' + cleaned.substring(1);
  }
  return `tel:+${cleaned}`;
}

// Format Date to 'Jun 29, 2026 3:15 PM'
export function formatDate(dateString?: string): string {
  if (!dateString) return 'N/A';
  try {
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return dateString;
    return d.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  } catch (e) {
    return dateString;
  }
}

// Tailwind className join helper
export function cn(...inputs: any[]): string {
  return inputs.filter(Boolean).join(' ');
}
