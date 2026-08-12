const THAI_MONTHS = [
  "มกราคม",
  "กุมภาพันธ์",
  "มีนาคม",
  "เมษายน",
  "พฤษภาคม",
  "มิถุนายน",
  "กรกฎาคม",
  "สิงหาคม",
  "กันยายน",
  "ตุลาคม",
  "พฤศจิกายน",
  "ธันวาคม",
];

function parseDate(value: string): Date | null {
  if (!value) return null;
  const date = /^\d{4}-\d{2}-\d{2}$/.test(value)
    ? new Date(`${value}T00:00:00`)
    : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

/** Format a date using the legacy Thai Buddhist Era display (DD/MM/YYYY). */
export function formatDateBE(value: string | null | undefined, fallback = "-"): string {
  const date = parseDate(value ?? "");
  if (!date) return fallback;
  return `${String(date.getDate()).padStart(2, "0")}/${String(date.getMonth() + 1).padStart(2, "0")}/${date.getFullYear() + 543}`;
}

/** Format a date using the long Thai Buddhist Era display used by the dashboard. */
export function formatDateLongBE(value: string | null | undefined, fallback = ""): string {
  const date = parseDate(value ?? "");
  if (!date) return fallback;
  return `${date.getDate()} ${THAI_MONTHS[date.getMonth()]} ${date.getFullYear() + 543}`;
}
