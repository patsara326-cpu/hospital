"use server";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { assessmentSchema } from "@/lib/validation/assessment";
import { calculateRisk } from "@/lib/utils/risk";

export type AssessmentPatient = {
  hn: string;
  prefix: string | null;
  full_name: string | null;
  gender: string | null;
  age: number | null;
  smi_type: string | null;
  admit_date: string | null;
  admitting_doctor: string | null;
  substance: string | null;
  assessment_admit_date: string | null;
};

export type AssessmentPatientState = {
  patients: AssessmentPatient[];
  error: string;
};

export type SaveAssessmentState = {
  status: "error" | "success";
  message: string;
};

function textValue(value: unknown): string {
  return typeof value === "string" || typeof value === "number" ? String(value) : "";
}

function recordValue(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

async function getAuthorizedSupabase() {
  const supabase = await createSupabaseServerClient();
  if (!supabase) {
    return {
      supabase: null,
      error: "ยังไม่ได้ตั้งค่า Supabase environment variables",
    };
  }

  const { data } = await supabase.auth.getUser();
  if (!data.user) {
    return {
      supabase: null,
      error: "กรุณาเข้าสู่ระบบก่อนดำเนินการประเมินผู้ป่วย",
    };
  }

  return { supabase, error: "" };
}

export async function loadAssessmentPatientsAction(gender: string): Promise<AssessmentPatientState> {
  if (gender !== "ชาย" && gender !== "หญิง") return { patients: [], error: "ไม่พบเพศผู้ป่วยที่เลือก" };
  const { supabase, error: accessError } = await getAuthorizedSupabase();
  if (!supabase) return { patients: [], error: accessError };

  const { data, error } = await supabase.from("patients").select("*").eq("gender", gender);
  if (error) return { patients: [], error: error.message };

  const patients = (data ?? []).map((row) => {
    const value = recordValue(row);
    return {
      hn: textValue(value.hn),
      prefix: textValue(value.prefix) || null,
      full_name: textValue(value.full_name) || null,
      gender: textValue(value.gender) || null,
      age: value.age == null ? null : Number(value.age),
      smi_type: textValue(value.smi_type) || null,
      admit_date: textValue(value.admit_date) || null,
      admitting_doctor: textValue(value.admitting_doctor) || null,
      substance: textValue(value.substance) || null,
      assessment_admit_date: null,
    } satisfies AssessmentPatient;
  });

  const hns = patients.map((patient) => patient.hn).filter(Boolean);
  if (hns.length === 0) return { patients, error: "" };

  const { data: assessmentRows } = await supabase
    .from("assessments")
    .select("hn, raw_data, created_at")
    .in("hn", hns)
    .order("created_at", { ascending: false });

  const admitDateMap = new Map<string, string>();
  for (const row of assessmentRows ?? []) {
    const value = recordValue(row);
    const hn = textValue(value.hn);
    const raw = recordValue(value.raw_data);
    const admissionDate = textValue(raw.admission_date);
    if (hn && admissionDate && !admitDateMap.has(hn)) admitDateMap.set(hn, admissionDate);
  }

  return {
    patients: patients.map((patient) => ({ ...patient, assessment_admit_date: admitDateMap.get(patient.hn) ?? null })),
    error: "",
  };
}

export async function saveShiftAssessmentAction(formData: FormData): Promise<SaveAssessmentState> {
  const hn = textValue(formData.get("hn")).trim();
  const assessDate = textValue(formData.get("assessDate")).trim();
  const shift = textValue(formData.get("shift")).trim();
  const oasScore = textValue(formData.get("oasScore"));
  let phuaScores: unknown;
  let ghardScores: unknown;
  try {
    phuaScores = JSON.parse(textValue(formData.get("phuaScores")));
    ghardScores = JSON.parse(textValue(formData.get("ghardScores")));
  } catch {
    return { status: "error", message: "ข้อมูลคะแนนไม่ถูกต้อง" };
  }

  const parsed = assessmentSchema.safeParse({ hn, assessDate, shift, oasScore, phuaScores, ghardScores });
  if (!parsed.success) return { status: "error", message: parsed.error.issues[0]?.message ?? "ข้อมูลการประเมินไม่ถูกต้อง" };

  const { supabase, error: accessError } = await getAuthorizedSupabase();
  if (!supabase) return { status: "error", message: accessError };
  const phua = parsed.data.phuaScores as number[];
  const ghard = parsed.data.ghardScores as number[];
  const record = {
    hn: parsed.data.hn,
    assess_date: parsed.data.assessDate,
    shift: parsed.data.shift,
    oas_score: Number(parsed.data.oasScore),
    phua_risk: calculateRisk(phua),
    ghard_risk: calculateRisk(ghard),
    phua_scores: phua,
    ghard_scores: ghard,
  };
  const { error } = await supabase.from("assessments").insert({
    hn: parsed.data.hn,
    record_type: "shift_assessment",
    assess_date: parsed.data.assessDate,
    shift: parsed.data.shift,
    oas_score: Number(parsed.data.oasScore),
    raw_data: record,
  });
  if (error) return { status: "error", message: `บันทึกผลล้มเหลว: ${error.message}` };
  return { status: "success", message: "บันทึกผลประเมินสำเร็จ" };
}
