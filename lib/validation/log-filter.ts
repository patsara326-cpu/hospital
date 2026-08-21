import { z } from "zod";

import { isISODateOnly, todayISOInThailand } from "../utils/date.ts";

export const LOG_PAGE_SIZE = 50;

export const LOG_PRESET_OPTIONS = [
  { value: "1h", label: "1 ชั่วโมง" },
  { value: "3h", label: "3 ชั่วโมง" },
  { value: "12h", label: "12 ชั่วโมง" },
  { value: "24h", label: "24 ชั่วโมง" },
  { value: "today", label: "วันนี้" },
  { value: "7d", label: "7 วัน" },
  { value: "30d", label: "30 วัน" },
  { value: "custom", label: "กำหนดเอง" },
] as const;

const presetValues = LOG_PRESET_OPTIONS.map((option) => option.value) as [
  (typeof LOG_PRESET_OPTIONS)[number]["value"],
  ...(typeof LOG_PRESET_OPTIONS)[number]["value"][],
];

const dateTimeLocalPattern = /^(\d{4}-\d{2}-\d{2})T(\d{2}):(\d{2})$/;

function isValidBangkokDateTimeLocal(value: string): boolean {
  if (value === "") return true;
  const match = dateTimeLocalPattern.exec(value);
  if (!match) return false;
  const [, date, rawHour, rawMinute] = match;
  const hour = Number(rawHour);
  const minute = Number(rawMinute);
  return isISODateOnly(date) && hour >= 0 && hour <= 23 && minute >= 0 && minute <= 59;
}

const filterShape = {
  query: z.string().trim().max(100, "คำค้นหาต้องไม่เกิน 100 ตัวอักษร"),
  source: z.enum(["", "activity", "audit"]),
  actorRole: z.enum(["", "pending", "clinician", "auditor", "admin"]),
  eventType: z.string().trim().max(80),
  preset: z.enum(presetValues),
  from: z.string().refine(isValidBangkokDateTimeLocal, "วันเวลาเริ่มต้นไม่ถูกต้อง"),
  to: z.string().refine(isValidBangkokDateTimeLocal, "วันเวลาสิ้นสุดไม่ถูกต้อง"),
};

function validateCustomRange(
  values: { preset: string; from: string; to: string },
  context: z.RefinementCtx,
) {
  if (values.preset !== "custom") return;
  if (!values.from) {
    context.addIssue({ code: "custom", path: ["from"], message: "กรุณาระบุวันเวลาเริ่มต้น" });
  }
  if (!values.to) {
    context.addIssue({ code: "custom", path: ["to"], message: "กรุณาระบุวันเวลาสิ้นสุด" });
  }
  if (values.from && values.to) {
    const from = bangkokDateTimeLocalToISO(values.from);
    const to = bangkokDateTimeLocalToISO(values.to);
    if (!from || !to || Date.parse(from) >= Date.parse(to)) {
      context.addIssue({ code: "custom", path: ["to"], message: "เวลาสิ้นสุดต้องอยู่หลังเวลาเริ่มต้น" });
    }
  }
}

export const logFilterSchema = z.object(filterShape).superRefine(validateCustomRange);

export const logSearchParamsSchema = z.object({
  ...filterShape,
  page: z.coerce.number().int().min(1).max(10_000),
}).superRefine(validateCustomRange);

export type LogFilterValues = z.infer<typeof logFilterSchema>;
export type LogSearchParams = z.infer<typeof logSearchParamsSchema>;

export const defaultLogFilters: LogFilterValues = {
  query: "",
  source: "",
  actorRole: "",
  eventType: "",
  preset: "24h",
  from: "",
  to: "",
};

export function bangkokDateTimeLocalToISO(value: string): string | null {
  if (!isValidBangkokDateTimeLocal(value) || value === "") return null;
  const date = new Date(`${value}:00+07:00`);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

export function resolveLogTimeRange(
  filters: Pick<LogFilterValues, "preset" | "from" | "to">,
  now = new Date(),
): { from: string | null; to: string | null } {
  const to = now.toISOString();
  if (filters.preset === "custom") {
    return {
      from: bangkokDateTimeLocalToISO(filters.from),
      to: bangkokDateTimeLocalToISO(filters.to),
    };
  }
  if (filters.preset === "today") {
    return {
      from: bangkokDateTimeLocalToISO(`${todayISOInThailand(now)}T00:00`),
      to,
    };
  }

  const durationMilliseconds: Partial<Record<LogFilterValues["preset"], number>> = {
    "1h": 60 * 60 * 1_000,
    "3h": 3 * 60 * 60 * 1_000,
    "12h": 12 * 60 * 60 * 1_000,
    "24h": 24 * 60 * 60 * 1_000,
    "7d": 7 * 24 * 60 * 60 * 1_000,
    "30d": 30 * 24 * 60 * 60 * 1_000,
  };
  const duration = durationMilliseconds[filters.preset];
  return {
    from: duration ? new Date(now.getTime() - duration).toISOString() : null,
    to: duration ? to : null,
  };
}

export function parseLogSearchParams(
  input: Record<string, string | string[] | undefined>,
): LogSearchParams {
  const read = (key: string) => {
    const value = input[key];
    return Array.isArray(value) ? value[0] ?? "" : value ?? "";
  };
  const parsed = logSearchParamsSchema.safeParse({
    query: read("query"),
    source: read("source"),
    actorRole: read("actorRole"),
    eventType: read("eventType"),
    preset: read("preset") || defaultLogFilters.preset,
    from: read("from"),
    to: read("to"),
    page: read("page") || "1",
  });

  return parsed.success
    ? parsed.data
    : { ...defaultLogFilters, page: 1 };
}
