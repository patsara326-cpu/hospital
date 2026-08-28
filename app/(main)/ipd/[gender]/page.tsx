import IpdList, { type IpdPatientRecord } from "@/components/ipd/IpdList";
import { isMissingRelationError } from "@/lib/supabase/errors";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";

const GENDER_LABELS = { male: "ชาย", female: "หญิง" } as const;

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

function textValue(value: unknown): string {
  return typeof value === "string" || typeof value === "number" ? String(value) : "";
}

function assignIfPresent(
  target: Record<string, unknown>,
  key: string,
  value: unknown,
) {
  if (value !== null && value !== undefined) target[key] = value;
}

function recordFromView(
  row: Record<string, unknown>,
): IpdPatientRecord {
  const rawData = { ...asRecord(row.extra_data) };

  for (const key of [
    "first_name",
    "last_name",
    "smi_v_result",
    "substance_use",
    "substance_type",
    "diagnosis",
    "admission_source",
    "oas_risk_level",
    "aggressive_behavior",
    "residence_type",
    "residence_district",
    "residence_subdistrict",
    "residence_details",
    "caregiver_status",
    "caregiver_name",
    "caregiver_relation",
    "caregiver_phone",
    "patient_phone",
    "is_smi_v",
  ]) {
    assignIfPresent(rawData, key, row[key]);
  }

  Object.assign(rawData, {
    id: row.id ?? null,
    hn: row.hn ?? null,
    prefix: row.prefix ?? null,
    full_name: row.full_name ?? null,
    gender: row.gender ?? null,
    age: row.age ?? null,
    smi_type: row.smi_type ?? null,
    substance: row.substance ?? null,
    admission_date: row.admission_date ?? null,
    admitting_doctor: row.admitting_doctor ?? null,
    oas_score: row.oas_score ?? null,
    oas_risk: row.oas_risk ?? null,
  });

  return { hn: textValue(row.hn), rawData };
}

async function loadIpdRecords(gender: "ชาย" | "หญิง") {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return { records: [] as IpdPatientRecord[], error: "ยังไม่ได้ตั้งค่า Supabase environment variables" };

  const viewResult = await supabase
    .from("current_ipd_rows")
    .select(
      "id, hn, prefix, full_name, first_name, last_name, gender, age, smi_type, smi_v_result, substance, substance_use, substance_type, admission_date, admitting_doctor, diagnosis, admission_source, oas_score, oas_risk, oas_risk_level, aggressive_behavior, residence_type, residence_district, residence_subdistrict, residence_details, caregiver_status, caregiver_name, caregiver_relation, caregiver_phone, patient_phone, is_smi_v, extra_data, created_at",
    )
    .eq("gender", gender)
    .order("created_at", { ascending: false });

  if (!viewResult.error) {
    return {
      records: (viewResult.data ?? []).map((row) => recordFromView(row)),
      error: null,
    };
  }

  if (!isMissingRelationError(viewResult.error)) {
    return { records: [] as IpdPatientRecord[], error: viewResult.error.message };
  }

  // `patients` is the source of truth for current inpatients; discharged HNs live in backup.
  const { data: patientRows, error: patientError } = await supabase
    .from("patients")
    .select("*")
    .eq("gender", gender)
    .order("created_at", { ascending: false });
  if (patientError) return { records: [] as IpdPatientRecord[], error: patientError.message };

  const patients = patientRows ?? [];
  const hns = patients.map((row) => row.hn).filter(Boolean);
  if (hns.length === 0) return { records: [] as IpdPatientRecord[], error: null };

  const { data: assessmentRows, error: assessmentError } = await supabase
    .from("assessments")
    .select("hn, raw_data, assess_date, created_at")
    .in("hn", hns)
    .eq("record_type", "smi-v_admission")
    .order("assess_date", { ascending: false })
    .order("created_at", { ascending: false });

  const latestAssessment = new Map<string, Record<string, unknown>>();
  for (const row of assessmentRows ?? []) {
    if (!latestAssessment.has(row.hn)) latestAssessment.set(row.hn, asRecord(row.raw_data));
  }

  const records = patients.map((patient) => {
    const structured = {
      id: patient.id,
      hn: patient.hn,
      prefix: patient.prefix,
      full_name: patient.full_name,
      gender: patient.gender,
      age: patient.age,
      smi_type: patient.smi_type,
      substance: patient.substance,
      admission_date: patient.admit_date,
      admitting_doctor: patient.admitting_doctor,
      oas_score: patient.oas_score,
      oas_risk: patient.oas_risk,
    };
    return {
      hn: textValue(patient.hn),
      rawData: {
        ...asRecord(patient.raw_data),
        ...latestAssessment.get(patient.hn),
        ...structured,
      },
    } satisfies IpdPatientRecord;
  });

  return { records, error: assessmentError?.message ?? null };
}

export default async function IpdPage({ params }: { params: Promise<{ gender: string }> }) {
  const { gender: rawGender } = await params;
  if (!(rawGender in GENDER_LABELS)) notFound();
  const gender = GENDER_LABELS[rawGender as keyof typeof GENDER_LABELS];
  const { records, error } = await loadIpdRecords(gender);
  return <IpdList gender={gender} records={records} error={error} />;
}
