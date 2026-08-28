import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { NON_SMIV_VALUE } from "@/lib/constants/admission";
import {
  REPORT_PAGE_SIZE,
  INCIDENT_PAGE_SIZE,
  reportDateBounds,
  type IncidentReportFilters,
  type StatisticReportFilters,
} from "@/lib/statistics/report-filters";
import type { Database } from "@/types/database.types";

const ADMISSION_COLUMNS = "id, admission_date, admitting_doctor, diagnosis, first_name, full_name, gender, hn, last_name, residence_details, residence_district, residence_type, smi_v_result, substance_type, report_date, report_year, report_month";
const DISCHARGE_COLUMNS = "id, hn, full_name, gender, discharge_date, discharge_type, last_diagnosis, smi_type, admitting_doctor, first_name, last_name, substance_type, residence_type, residence_district, residence_details, report_date, report_year, report_month";
const INCIDENT_COLUMNS = "id, hn, record_date, level, full_name, gender, smi_type, report_date, report_year, report_month";
const EXPORT_BATCH_SIZE = 1_000;
const MAX_EXPORT_ROWS = 10_000;

export type AdmissionReportRow = Database["public"]["Views"]["admission_statistics_rows"]["Row"];
export type DischargeReportRow = Database["public"]["Views"]["discharge_statistics_rows"]["Row"];
export type IncidentReportRow = Database["public"]["Views"]["incident_statistics_rows"]["Row"];

function applyCommonFilters<T extends {
  gte(column: string, value: string): T;
  lt(column: string, value: string): T;
  eq(column: string, value: string | number): T;
  like(column: string, pattern: string): T;
  ilike(column: string, pattern: string): T;
}>(
  query: T,
  filters: StatisticReportFilters,
  smiColumn: "smi_v_result" | "smi_type",
) {
  const bounds = reportDateBounds(filters);
  if (bounds && "start" in bounds) {
    query = query.gte("report_date", bounds.start).lt("report_date", bounds.end);
  } else if (bounds?.month) {
    query = query.eq("report_month", bounds.month);
  }

  if (filters.smiv === "SMI-V") {
    query = query.like(smiColumn, "SMI-V%");
  } else if (filters.smiv === NON_SMIV_VALUE) {
    query = query.eq(smiColumn, NON_SMIV_VALUE);
  }

  if (filters.residence === "เร่ร่อน") {
    query = query.ilike("residence_type", "%เร่ร่อน%");
  } else if (filters.residence) {
    query = query.eq("residence_district", filters.residence);
  }

  return query;
}

export async function loadAdmissionReportPage(
  supabase: SupabaseClient<Database>,
  gender: string,
  filters: StatisticReportFilters,
) {
  const offset = (filters.page - 1) * REPORT_PAGE_SIZE;
  let query = supabase
    .from("admission_statistics_rows")
    .select(ADMISSION_COLUMNS, { count: "exact" })
    .eq("gender", gender);
  query = applyCommonFilters(query, filters, "smi_v_result");

  return query
    .order("report_date", { ascending: false, nullsFirst: false })
    .order("id", { ascending: true })
    .range(offset, offset + REPORT_PAGE_SIZE - 1);
}

export async function loadDischargeReportPage(
  supabase: SupabaseClient<Database>,
  gender: string,
  filters: StatisticReportFilters,
) {
  const offset = (filters.page - 1) * REPORT_PAGE_SIZE;
  let query = supabase
    .from("discharge_statistics_rows")
    .select(DISCHARGE_COLUMNS, { count: "exact" })
    .eq("gender", gender);
  query = applyCommonFilters(query, filters, "smi_type");

  return query
    .order("report_date", { ascending: false, nullsFirst: false })
    .order("id", { ascending: true })
    .range(offset, offset + REPORT_PAGE_SIZE - 1);
}

function applyIncidentFilters<T extends {
  gte(column: string, value: string): T; lt(column: string, value: string): T;
  eq(column: string, value: string | number): T; like(column: string, pattern: string): T;
}>(query: T, filters: IncidentReportFilters) {
  const bounds = reportDateBounds(filters);
  if (bounds && "start" in bounds) query = query.gte("report_date", bounds.start).lt("report_date", bounds.end);
  else if (bounds?.month) query = query.eq("report_month", bounds.month);
  if (filters.gender) query = query.eq("gender", filters.gender);
  if (filters.smiv === "SMI-V") query = query.like("smi_type", "SMI-V%");
  else if (filters.smiv === NON_SMIV_VALUE) query = query.eq("smi_type", NON_SMIV_VALUE);
  return query;
}

export async function loadIncidentReportPage(
  supabase: SupabaseClient<Database>, filters: IncidentReportFilters,
) {
  const offset = (filters.page - 1) * INCIDENT_PAGE_SIZE;
  let query = supabase.from("incident_statistics_rows").select(INCIDENT_COLUMNS, { count: "exact" });
  query = applyIncidentFilters(query, filters);
  return query.order("report_date", { ascending: false, nullsFirst: false })
    .order("id", { ascending: true }).range(offset, offset + INCIDENT_PAGE_SIZE - 1);
}

export async function loadReportYears(
  supabase: SupabaseClient<Database>,
  reportType: "admission" | "discharge" | "incidents",
  gender?: string,
) {
  let query = supabase
    .from("statistics_report_years")
    .select("report_year")
    .eq("report_type", reportType)
  if (gender) query = query.eq("gender", gender);
  const result = await query.order("report_year", { ascending: false });

  return {
    years: (result.data ?? [])
      .flatMap((row) => row.report_year == null ? [] : [row.report_year + 543]),
    error: result.error,
  };
}

async function loadAllBatches<Row>(loadBatch: (
  from: number,
  to: number,
) => PromiseLike<{ data: Row[] | null; error: { message: string } | null }>) {
  const rows: Row[] = [];
  for (let from = 0; from <= MAX_EXPORT_ROWS; from += EXPORT_BATCH_SIZE) {
    const to = Math.min(from + EXPORT_BATCH_SIZE - 1, MAX_EXPORT_ROWS);
    const requestedRows = to - from + 1;
    const result = await loadBatch(from, to);
    if (result.error) throw new Error(result.error.message);
    const batch = result.data ?? [];
    rows.push(...batch);
    if (rows.length > MAX_EXPORT_ROWS) break;
    if (batch.length < requestedRows) return rows;
  }
  throw new Error(`รายงานมีข้อมูลเกิน ${MAX_EXPORT_ROWS.toLocaleString("th-TH")} แถว กรุณาระบุตัวกรองเพิ่มเติม`);
}

export function loadAllAdmissionReportRows(
  supabase: SupabaseClient<Database>,
  gender: string,
  filters: StatisticReportFilters,
) {
  return loadAllBatches<AdmissionReportRow>((from, to) => {
    let query = supabase
      .from("admission_statistics_rows")
      .select(ADMISSION_COLUMNS)
      .eq("gender", gender);
    query = applyCommonFilters(query, filters, "smi_v_result");
    return query
      .order("report_date", { ascending: false, nullsFirst: false })
      .order("id", { ascending: true })
      .range(from, to);
  });
}

export function loadAllDischargeReportRows(
  supabase: SupabaseClient<Database>,
  gender: string,
  filters: StatisticReportFilters,
) {
  return loadAllBatches<DischargeReportRow>((from, to) => {
    let query = supabase
      .from("discharge_statistics_rows")
      .select(DISCHARGE_COLUMNS)
      .eq("gender", gender);
    query = applyCommonFilters(query, filters, "smi_type");
    return query
      .order("report_date", { ascending: false, nullsFirst: false })
      .order("id", { ascending: true })
      .range(from, to);
  });
}

export function loadAllIncidentReportRows(
  supabase: SupabaseClient<Database>, filters: IncidentReportFilters,
) {
  return loadAllBatches<IncidentReportRow>((from, to) => {
    let query = supabase.from("incident_statistics_rows").select(INCIDENT_COLUMNS);
    query = applyIncidentFilters(query, filters);
    return query.order("report_date", { ascending: false, nullsFirst: false })
      .order("id", { ascending: true }).range(from, to);
  });
}
