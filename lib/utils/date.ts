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

export const THAILAND_TIME_ZONE = "Asia/Bangkok";

export type ThailandDateParts = {
  year: number;
  month: number;
  day: number;
};

const thailandPartsFormatter = new Intl.DateTimeFormat("en-US", {
  timeZone: THAILAND_TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

function validDateOnly(year: number, month: number, day: number): boolean {
  const candidate = new Date(Date.UTC(year, month - 1, day));
  return candidate.getUTCFullYear() === year
    && candidate.getUTCMonth() + 1 === month
    && candidate.getUTCDate() === day;
}

/** Resolve either a date-only value or timestamp to its calendar date in Thailand. */
export function getThailandDateParts(value: string | Date | null | undefined): ThailandDateParts | null {
  if (!value) return null;

  if (typeof value === "string") {
    const dateOnly = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
    if (dateOnly) {
      const [, rawYear, rawMonth, rawDay] = dateOnly;
      const year = Number(rawYear);
      const month = Number(rawMonth);
      const day = Number(rawDay);
      return validDateOnly(year, month, day) ? { year, month, day } : null;
    }
  }

  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  const parts = thailandPartsFormatter.formatToParts(date);
  const read = (type: Intl.DateTimeFormatPartTypes) => Number(parts.find((part) => part.type === type)?.value);
  return { year: read("year"), month: read("month"), day: read("day") };
}

/** Return today's YYYY-MM-DD value using the hospital's Asia/Bangkok calendar day. */
export function todayISOInThailand(now = new Date()): string {
  const parts = getThailandDateParts(now);
  if (!parts) return "";
  return `${parts.year}-${String(parts.month).padStart(2, "0")}-${String(parts.day).padStart(2, "0")}`;
}

export function isISODateOnly(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && getThailandDateParts(value) !== null;
}

/** Format a date using the legacy Thai Buddhist Era display (DD/MM/YYYY). */
export function formatDateBE(value: string | Date | null | undefined, fallback = "-"): string {
  const parts = getThailandDateParts(value);
  if (!parts) return fallback;
  return `${String(parts.day).padStart(2, "0")}/${String(parts.month).padStart(2, "0")}/${parts.year + 543}`;
}

/** Format a date using the long Thai Buddhist Era display used by the dashboard. */
export function formatDateLongBE(value: string | Date | null | undefined, fallback = ""): string {
  const parts = getThailandDateParts(value);
  if (!parts) return fallback;
  return `${parts.day} ${THAI_MONTHS[parts.month - 1]} ${parts.year + 543}`;
}

export function formatDateTimeBE(
  value: string | Date | null | undefined,
  fallback = "-",
): string {
  const date = value instanceof Date ? value : value ? new Date(value) : null;

  if (!date || Number.isNaN(date.getTime())) return fallback;

  return new Intl.DateTimeFormat("th-TH-u-ca-buddhist", {
    dateStyle: "medium",
    timeStyle: "medium",
    timeZone: THAILAND_TIME_ZONE,
  }).format(date);
}
