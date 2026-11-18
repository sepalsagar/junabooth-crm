// Pure phone utilities for Indian 10-digit mobile numbers

export function normalizePhone(raw: string): string {
  if (!raw) return "";

  // Strip all non-digit characters except a leading '+'
  let cleaned = raw.trim().replace(/[^\d+]/g, "");

  // Remove leading '+91' or '91' if it has country code prefix
  if (cleaned.startsWith("+91")) {
    cleaned = cleaned.slice(3);
  } else if (cleaned.startsWith("91") && cleaned.length > 10) {
    cleaned = cleaned.slice(2);
  }

  // Remove any remaining non-digit characters
  cleaned = cleaned.replace(/\D/g, "");

  // Strip leading 0 (common local trunk prefix, e.g. 09876543210)
  while (cleaned.startsWith("0")) {
    cleaned = cleaned.slice(1);
  }

  return cleaned;
}

export function isValidIndianMobile(phone: string): boolean {
  const normalized = normalizePhone(phone);
  return /^[6-9]\d{9}$/.test(normalized);
}

export function whatsappLink(phone: string, text?: string): string {
  const normalized = normalizePhone(phone);
  const base = `https://wa.me/91${normalized}`;
  if (!text) return base;
  return `${base}?text=${encodeURIComponent(text)}`;
}

export function telLink(phone: string): string {
  const normalized = normalizePhone(phone);
  return `tel:+91${normalized}`;
}
