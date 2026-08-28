import { z } from "zod";

import { NON_SMIV_VALUE } from "../constants/admission.ts";
import { STATISTIC_RESIDENCE_OPTIONS } from "../constants/statistics.ts";

export const REPORT_PAGE_SIZE = 50;
export const INCIDENT_PAGE_SIZE = 20;

const firstValue = (value: string | string[] | undefined) =>
  Array.isArray(value) ? value[0] : value;

const filterSchema = z.object({
  month: z.coerce.number().int().min(1).max(12).optional().catch(undefined),
  year: z.coerce.number().int().min(2400).max(3000).optional().catch(undefined),
  smiv: z.enum(["SMI-V", NON_SMIV_VALUE]).optional().catch(undefined),
  residence: z.enum(STATISTIC_RESIDENCE_OPTIONS).optional().catch(undefined),
  page: z.coerce.number().int().min(1).max(10_000).default(1).catch(1),
});

const incidentFilterSchema = z.object({
  month: z.coerce.number().int().min(1).max(12).optional().catch(undefined),
  year: z.coerce.number().int().min(2400).max(3000).optional().catch(undefined),
  gender: z.enum(["ชาย", "หญิง"]).optional().catch(undefined),
  smiv: z.enum(["SMI-V", NON_SMIV_VALUE]).optional().catch(undefined),
  page: z.coerce.number().int().min(1).max(10_000).default(1).catch(1),
});

export type StatisticReportFilters = {
  month: string;
  year: string;
  smiv: "" | "SMI-V" | typeof NON_SMIV_VALUE;
  residence: "" | (typeof STATISTIC_RESIDENCE_OPTIONS)[number];
  page: number;
};

export type IncidentReportFilters = Omit<StatisticReportFilters, "residence"> & {
  gender: "" | "ชาย" | "หญิง";
};

export function parseStatisticReportFilters(
  searchParams: Record<string, string | string[] | undefined>,
): StatisticReportFilters {
  const parsed = filterSchema.parse({
    month: firstValue(searchParams.month),
    year: firstValue(searchParams.year),
    smiv: firstValue(searchParams.smiv),
    residence: firstValue(searchParams.residence),
    page: firstValue(searchParams.page),
  });

  return {
    month: parsed.month ? String(parsed.month) : "",
    year: parsed.year ? String(parsed.year) : "",
    smiv: parsed.smiv ?? "",
    residence: parsed.residence ?? "",
    page: parsed.page,
  };
}

export function parseIncidentReportFilters(
  searchParams: Record<string, string | string[] | undefined>,
): IncidentReportFilters {
  const parsed = incidentFilterSchema.parse({
    month: firstValue(searchParams.month), year: firstValue(searchParams.year),
    gender: firstValue(searchParams.gender), smiv: firstValue(searchParams.smiv),
    page: firstValue(searchParams.page),
  });
  return {
    month: parsed.month ? String(parsed.month) : "",
    year: parsed.year ? String(parsed.year) : "",
    gender: parsed.gender ?? "",
    smiv: parsed.smiv ?? "",
    page: parsed.page,
  };
}

export function reportDateBounds(filters: Pick<StatisticReportFilters, "month" | "year">):
  | null
  | { start: string; end: string }
  | { month: number } {
  if (!filters.month && !filters.year) return null;

  const buddhistYear = filters.year ? Number(filters.year) : null;
  const christianYear = buddhistYear ? buddhistYear - 543 : null;
  const month = filters.month ? Number(filters.month) : null;

  if (christianYear && month) {
    const start = `${christianYear}-${String(month).padStart(2, "0")}-01`;
    const nextMonth = month === 12
      ? `${christianYear + 1}-01-01`
      : `${christianYear}-${String(month + 1).padStart(2, "0")}-01`;
    return { start, end: nextMonth };
  }

  if (christianYear) {
    return {
      start: `${christianYear}-01-01`,
      end: `${christianYear + 1}-01-01`,
    };
  }

  return { month: month as number };
}

export function filtersToSearchParams(
  filters: StatisticReportFilters,
  changes: Partial<StatisticReportFilters> = {},
) {
  const next = { ...filters, ...changes };
  const params = new URLSearchParams();
  if (next.month) params.set("month", next.month);
  if (next.year) params.set("year", next.year);
  if (next.smiv) params.set("smiv", next.smiv);
  if (next.residence) params.set("residence", next.residence);
  if (next.page > 1) params.set("page", String(next.page));
  return params;
}

export function incidentFiltersToSearchParams(
  filters: IncidentReportFilters,
  changes: Partial<IncidentReportFilters> = {},
) {
  const next = { ...filters, ...changes };
  const params = new URLSearchParams();
  if (next.month) params.set("month", next.month);
  if (next.year) params.set("year", next.year);
  if (next.gender) params.set("gender", next.gender);
  if (next.smiv) params.set("smiv", next.smiv);
  if (next.page > 1) params.set("page", String(next.page));
  return params;
}
