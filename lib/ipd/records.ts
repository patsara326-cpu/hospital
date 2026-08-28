import type { Json } from "@/types/database.types";

export type IpdPatientSummary = { id: string; hn: string; fullName: string; smivResult: string | null; admissionDate: string | null; admittingDoctor: string | null };
export type IpdPatientRecord = { hn: string; rawData: Record<string, unknown> };

function asRecord(value: Json | null): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function assignIfPresent(target: Record<string, unknown>, key: string, value: unknown) {
  if (value !== null && value !== undefined) target[key] = value;
}

export function ipdRecordFromView(row: Record<string, unknown>): IpdPatientRecord {
  const rawData = { ...asRecord((row.extra_data ?? null) as Json | null) };
  for (const key of [
    "first_name", "last_name", "smi_v_result", "substance_use", "substance_type", "diagnosis",
    "admission_source", "oas_risk_level", "aggressive_behavior", "residence_type", "residence_district",
    "residence_subdistrict", "residence_details", "caregiver_status", "caregiver_name", "caregiver_relation",
    "caregiver_phone", "patient_phone", "is_smi_v",
  ]) assignIfPresent(rawData, key, row[key]);

  Object.assign(rawData, {
    id: row.id ?? null, hn: row.hn ?? null, prefix: row.prefix ?? null, full_name: row.full_name ?? null,
    gender: row.gender ?? null, age: row.age ?? null, smi_type: row.smi_type ?? null, substance: row.substance ?? null,
    admission_date: row.admission_date ?? null, admitting_doctor: row.admitting_doctor ?? null,
    oas_score: row.oas_score ?? null, oas_risk: row.oas_risk ?? null,
  });
  return { hn: typeof row.hn === "string" ? row.hn : "", rawData };
}
