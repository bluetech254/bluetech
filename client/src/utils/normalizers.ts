/**
 * utils/normalizers.ts — Shape normalization between backend responses and frontend types.
 *
 * The backend uses different field names than the frontend types in some cases.
 * All normalization logic lives here — not scattered across api/ files.
 *
 * If the backend schema changes, update this file only.
 */
import { Product, RepairService } from '../types';

/**
 * Normalize a raw backend product object to the frontend Product type.
 * Backend uses `title` and `image_url`; frontend expects `name` and `images`.
 */
export const normalizeProduct = (raw: any): Product => {
  let specs: Record<string, string> = {};
  try {
    specs = typeof raw.specifications === 'string'
      ? JSON.parse(raw.specifications)
      : (raw.specifications || {});
  } catch {
    specs = {};
  }

  return {
    ...raw,
    name:           raw.title || raw.name || '',
    images:         raw.image_url ? [raw.image_url] : (raw.images || []),
    category:       raw.category || specs['category'] || '',
    brand:          raw.brand    || specs['brand']    || '',
    specifications: specs,
  };
};

/**
 * Normalize a raw backend repair service to the frontend RepairService type.
 * Backend uses `service_name`, `base_price`, `service_category`.
 */
export const normalizeService = (raw: any): RepairService => ({
  id:                 raw.id,
  name:               raw.service_name  || raw.name || '',
  description:        raw.long_description || raw.short_description || raw.description || '',
  category:           raw.service_category || raw.category || '',
  price:              raw.base_price    ?? raw.price ?? 0,
  estimated_duration: raw.duration      || raw.estimated_duration || '',
  warranty_period:    raw.warranty      || raw.warranty_period,
  image:              raw.image_url     || raw.image,
  created_at:         raw.created_at,
});

/**
 * Unwrap paginated backend response `{ data: [...], count: N }` to a plain array.
 * Falls back gracefully if the response is already an array.
 */
export const unwrapList = <T>(response: any): T[] => {
  if (response?.data && Array.isArray(response.data)) return response.data;
  if (Array.isArray(response)) return response;
  return [];
};
