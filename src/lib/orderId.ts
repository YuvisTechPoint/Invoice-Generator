/** First order sequence number each calendar year (→ 005000). */
export const ORDER_ID_SEQUENCE_START = 5000;

const ORDER_ID_PATTERN = /^(\d{6})-(\d{4})$/;

export function getOrderYear(date = new Date()): number {
  return Number(
    new Intl.DateTimeFormat("en-IN", {
      timeZone: "Asia/Kolkata",
      year: "numeric",
    }).format(date)
  );
}

export function formatOrderId(sequence: number, year: number): string {
  return `${String(sequence).padStart(6, "0")}-${year}`;
}

export function formatOrderIdDisplay(orderId: string): string {
  const normalized = orderId.startsWith("#") ? orderId.slice(1) : orderId;
  return `#${normalized}`;
}

export function parseStructuredOrderId(
  orderId: string
): { sequence: number; year: number } | null {
  const match = ORDER_ID_PATTERN.exec(orderId);
  if (!match) return null;

  return {
    sequence: Number(match[1]),
    year: Number(match[2]),
  };
}

export function isStructuredOrderId(orderId: string): boolean {
  return ORDER_ID_PATTERN.test(orderId);
}
