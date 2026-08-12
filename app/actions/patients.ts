"use server";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Json } from "@/types/database.types";

export type SavePatientState = {
  status: "idle" | "error" | "success";
  message: string;
};

export type NewPatientResult = {
  firstName: string;
  lastName: string;
  hn: string;
  smiVResult: string;
  oasScore: string;
};

export type SaveNewPatientState = SavePatientState & {
  result?: NewPatientResult;
};

export type EditPatientForm = {
  hn: string;
  prefix: string;
  first_name: string;
  last_name: string;
  full_name: string;
  gender: string;
  age: string;
  is_smi_v: boolean;
  diagnosis: string;
  smi_v_result: string;
  smi_type: string;
  substance_use: string;
  substance_type: string;
  patient_phone: string;
  admission_date: string;
  admitting_doctor: string;
  caregiver_name: string;
  caregiver_relation: string;
  caregiver_phone: string;
  admission_source: string;
  residence_type: string;
  residence_details: string;
  residence_district: string;
  residence_subdistrict: string;
  aggressive_behavior: string;
  oas_score: string;
  oas_risk_level: string;
};

export type EditPatientState = {
  form: EditPatientForm | null;
  assessmentId: string | null;
  message: string;
  error: string;
};

const emptyEditPatientForm: EditPatientForm = {
  hn: "", prefix: "", first_name: "", last_name: "", full_name: "", gender: "", age: "",
  is_smi_v: false, diagnosis: "", smi_v_result: "", smi_type: "", substance_use: "",
  substance_type: "", patient_phone: "", admission_date: "", admitting_doctor: "",
  caregiver_name: "", caregiver_relation: "", caregiver_phone: "", admission_source: "",
  residence_type: "", residence_details: "", residence_district: "", residence_subdistrict: "",
  aggressive_behavior: "", oas_score: "", oas_risk_level: "",
};

function readRecordText(record: Record<string, unknown>, key: string): string {
  const value = record[key];
  return typeof value === "string" || typeof value === "number" ? String(value) : "";
}

function asRecord(value: unknown): Record<string, unknown> {
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
      error: "กรุณาเข้าสู่ระบบก่อนดำเนินการกับข้อมูลผู้ป่วย",
    };
  }

  return { supabase, error: "" };
}

function editFormFromRaw(rawData: Record<string, unknown>, hn: string, fallback: Record<string, unknown> = {}): EditPatientForm {
  const value = (key: string, fallbackKey = key) => readRecordText(rawData, key) || readRecordText(fallback, fallbackKey);
  return {
    hn,
    prefix: value("prefix"),
    first_name: value("first_name"),
    last_name: value("last_name"),
    full_name: value("full_name") || `${value("first_name")} ${value("last_name")}`.trim(),
    gender: value("gender"),
    age: value("age"),
    is_smi_v: rawData.is_smi_v === true || value("is_smi_v").toLowerCase() === "true",
    diagnosis: value("diagnosis"),
    smi_v_result: value("smi_v_result"),
    smi_type: value("smi_type") || value("smi_v_result"),
    substance_use: value("substance_use") || value("substance"),
    substance_type: value("substance_type"),
    patient_phone: value("patient_phone"),
    admission_date: value("admission_date") || value("admit_date"),
    admitting_doctor: value("admitting_doctor"),
    caregiver_name: value("caregiver_name"),
    caregiver_relation: value("caregiver_relation"),
    caregiver_phone: value("caregiver_phone"),
    admission_source: value("admission_source"),
    residence_type: value("residence_type"),
    residence_details: value("residence_details"),
    residence_district: value("residence_district"),
    residence_subdistrict: value("residence_subdistrict"),
    aggressive_behavior: value("aggressive_behavior"),
    oas_score: value("oas_score"),
    oas_risk_level: value("oas_risk_level") || value("oas_risk"),
  };
}

export async function searchPatientForEditAction(
  formData: FormData,
): Promise<EditPatientState> {
  const hn = readText(formData, "hn");
  if (!hn) return { form: null, assessmentId: null, message: "", error: "กรุณากรอก HN" };

  const { supabase, error: accessError } = await getAuthorizedSupabase();
  if (!supabase) return { form: null, assessmentId: null, message: "", error: accessError };

  const { data: assessments, error: assessmentError } = await supabase
    .from("assessments")
    .select("id, raw_data, oas_score, assess_date")
    .eq("hn", hn)
    .order("assess_date", { ascending: false })
    .limit(1);

  if (assessmentError) return { form: null, assessmentId: null, message: "", error: assessmentError.message };

  const assessment = assessments?.[0] as { id?: unknown; raw_data?: unknown; oas_score?: unknown; assess_date?: unknown } | undefined;
  if (assessment) {
    const rawData = asRecord(assessment.raw_data);
    const form = editFormFromRaw(rawData, hn);
    form.oas_score = readRecordText(rawData, "oas_score") || readRecordText(asRecord(assessment), "oas_score");
    form.admission_date = form.admission_date || readRecordText(asRecord(assessment), "assess_date");
    return {
      form,
      assessmentId: readRecordText(asRecord(assessment), "id") || null,
      message: `พบข้อมูล HN ${hn} จากผลประเมินล่าสุด`,
      error: "",
    };
  }

  const { data: patient, error: patientError } = await supabase
    .from("patients")
    .select("*")
    .eq("hn", hn)
    .maybeSingle();

  if (patientError) return { form: null, assessmentId: null, message: "", error: patientError.message };
  if (!patient) return { form: null, assessmentId: null, message: "", error: `ไม่พบผู้ป่วย HN: ${hn}` };

  const patientRecord = asRecord(patient);
  const form = editFormFromRaw(patientRecord, hn, patientRecord);
  form.is_smi_v = form.smi_type !== "ไม่เข้าข่าย SMI-V" && Boolean(form.smi_type);
  return { form, assessmentId: null, message: `พบข้อมูล HN ${hn}`, error: "" };
}

export async function saveEditedPatientAction(
  formData: FormData,
): Promise<SavePatientState> {
  const hn = readText(formData, "hn");
  if (!hn) return { status: "error", message: "HN ไม่ถูกต้อง" };

  const { supabase, error: accessError } = await getAuthorizedSupabase();
  if (!supabase) return { status: "error", message: accessError };

  const ageText = readText(formData, "age");
  const oasText = readText(formData, "oas_score");
  const payload = {
    hn,
    prefix: readText(formData, "prefix") || null,
    full_name: readText(formData, "full_name") || null,
    gender: readText(formData, "gender") || null,
    age: ageText ? Number(ageText) : null,
    smi_type: readText(formData, "smi_type") || null,
    substance: readText(formData, "substance_use") || null,
    admit_date: readText(formData, "admission_date") || null,
    admitting_doctor: readText(formData, "admitting_doctor") || null,
    oas_score: oasText ? Number(oasText) : null,
    oas_risk: readText(formData, "oas_risk_level") || null,
  };

  const { error: patientError } = await supabase.from("patients").upsert(payload, { onConflict: "hn" });
  if (patientError) return { status: "error", message: `บันทึกข้อมูลผู้ป่วยล้มเหลว: ${patientError.message}` };

  const assessmentId = readText(formData, "assessmentId");
  if (assessmentId) {
    const updatedRaw: Record<string, unknown> = {};
    for (const key of Object.keys(emptyEditPatientForm)) {
      updatedRaw[key] = key === "is_smi_v" ? formData.get(key) === "true" : readText(formData, key);
    }
    const { error: assessmentError } = await supabase
      .from("assessments")
      .update({ raw_data: updatedRaw as Json, oas_score: oasText ? Number(oasText) : null })
      .eq("id", assessmentId);
    if (assessmentError) return { status: "error", message: `อัปเดต assessment ล้มเหลว: ${assessmentError.message}` };
  }

  return { status: "success", message: "บันทึกข้อมูลผู้ป่วยเรียบร้อยแล้ว" };
}

export type DischargePatient = {
  hn: string;
  prefix: string | null;
  full_name: string | null;
  gender: string | null;
  age: number | null;
  smi_type: string | null;
  substance: string | null;
  admit_date: string | null;
  admitting_doctor: string | null;
  raw_data: Record<string, unknown>;
};

export type DischargeSearchState = {
  patient: DischargePatient | null;
  message: string;
  error: string;
};

export async function searchPatientForDischargeAction(
  formData: FormData,
): Promise<DischargeSearchState> {
  const hn = readText(formData, "hn");
  if (!hn) return { patient: null, message: "", error: "กรุณากรอก HN" };

  const { supabase, error: accessError } = await getAuthorizedSupabase();
  if (!supabase) return { patient: null, message: "", error: accessError };

  const { data, error } = await supabase.from("patients").select("*").eq("hn", hn).maybeSingle();
  if (error) return { patient: null, message: "", error: error.message };
  if (!data) return { patient: null, message: "", error: `ไม่พบผู้ป่วย HN: ${hn}` };

  const row = asRecord(data);
  return {
    patient: {
      hn,
      prefix: readRecordText(row, "prefix") || null,
      full_name: readRecordText(row, "full_name") || null,
      gender: readRecordText(row, "gender") || null,
      age: row.age == null ? null : Number(row.age),
      smi_type: readRecordText(row, "smi_type") || null,
      substance: readRecordText(row, "substance") || null,
      admit_date: readRecordText(row, "admit_date") || null,
      admitting_doctor: readRecordText(row, "admitting_doctor") || null,
      raw_data: row,
    },
    message: `พบข้อมูลผู้ป่วย ${readRecordText(row, "full_name") || hn}`,
    error: "",
  };
}

export async function saveDischargeAction(formData: FormData): Promise<SavePatientState> {
  const hn = readText(formData, "hn");
  const dischargeDate = readText(formData, "dischargeDate");
  const lastDiagnosis = readText(formData, "lastDiagnosis");
  const dischargeType = readText(formData, "dischargeType");
  let dischargeMethod = readText(formData, "dischargeMethod");

  if (dischargeMethod === "transfer") {
    const transferOther = readText(formData, "transferOther");
    dischargeMethod = transferOther ? `transfer (${transferOther})` : "transfer";
  }

  if (!hn || !dischargeMethod || !dischargeDate || !lastDiagnosis || !dischargeType) {
    return { status: "error", message: "กรุณากรอกข้อมูลการจำหน่ายให้ครบ" };
  }

  const { supabase, error: accessError } = await getAuthorizedSupabase();
  if (!supabase) return { status: "error", message: accessError };

  const { data: patientData, error: patientError } = await supabase
    .from("patients")
    .select("*")
    .eq("hn", hn)
    .maybeSingle();
  if (patientError) return { status: "error", message: patientError.message };
  if (!patientData) return { status: "error", message: `ไม่พบผู้ป่วย HN: ${hn}` };

  const patient = asRecord(patientData);
  let rawData = { ...patient };
  const { data: assessments } = await supabase
    .from("assessments")
    .select("raw_data")
    .eq("hn", hn)
    .order("assess_date", { ascending: false })
    .limit(1);
  const assessmentRaw = asRecord(assessments?.[0]?.raw_data);
  if (Object.keys(assessmentRaw).length > 0) rawData = { ...rawData, ...assessmentRaw };

  const record = {
    hn,
    prefix: readRecordText(patient, "prefix") || null,
    full_name: readRecordText(patient, "full_name") || hn,
    gender: readRecordText(patient, "gender") || null,
    age: patient.age == null ? null : Number(patient.age),
    smi_type: readRecordText(patient, "smi_type") || null,
    substance: readRecordText(patient, "substance") || null,
    admit_date: readRecordText(patient, "admit_date") || null,
    admitting_doctor: readRecordText(patient, "admitting_doctor") || null,
    last_diagnosis: lastDiagnosis,
    discharge_method: dischargeMethod,
    discharge_date: dischargeDate,
    discharge_type: dischargeType,
    discharged_at: new Date().toISOString(),
    raw_data: rawData as Json,
  };

  const { error: insertError } = await supabase.from("backup").insert(record);
  if (insertError) return { status: "error", message: `บันทึกสำรองล้มเหลว: ${insertError.message}` };

  const { error: deleteError } = await supabase.from("patients").delete().eq("hn", hn);
  if (deleteError) return { status: "error", message: `ลบผู้ป่วยจาก patients ล้มเหลว: ${deleteError.message}` };

  return { status: "success", message: "จำหน่ายผู้ป่วยเรียบร้อยแล้ว" };
}

function readText(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function readNumber(formData: FormData, key: string): number | null {
  const value = readText(formData, key);
  if (!value) return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

const riskLevelMap: Record<string, string> = {
  "1": "Semi-urgency",
  "2": "Urgency",
  "3": "Emergency",
};

export async function saveNewPatientAction(
  formData: FormData,
): Promise<SaveNewPatientState> {
  const firstName = readText(formData, "firstName");
  const lastName = readText(formData, "lastName");
  const gender = readText(formData, "gender");
  const age = readNumber(formData, "age");
  const hn = readText(formData, "hn");
  const smiVResult = readText(formData, "smiV");

  if (!firstName || !lastName || !gender || age === null || !hn || !smiVResult) {
    return { status: "error", message: "กรุณากรอกข้อมูลผู้ป่วยให้ครบถ้วน" };
  }

  const { supabase, error: accessError } = await getAuthorizedSupabase();
  if (!supabase) {
    return { status: "error", message: accessError };
  }

  const admissionDate = readText(formData, "admissionDate");
  const record = {
    first_name: firstName,
    last_name: lastName,
    gender,
    age: String(age),
    hn,
    diagnosis: readText(formData, "diagnosis") === "อื่นๆ"
      ? readText(formData, "diagnosisOther")
      : readText(formData, "diagnosis"),
    admission_source: readText(formData, "admissionSource"),
    admission_date: admissionDate,
    admitting_doctor: readText(formData, "admittingDoctor"),
    smi_v_result: smiVResult,
    is_smi_v: smiVResult !== "ไม่เข้าข่าย SMI-V",
    oas_score: readText(formData, "oasScore"),
    oas_risk_level: riskLevelMap[readText(formData, "oasScore")] ?? "Low Risk",
    aggressive_behavior: readText(formData, "aggressiveBehavior"),
    substance_use: readText(formData, "substanceUse"),
    substance_type: readText(formData, "substanceUse") === "ใช้"
      ? readText(formData, "substanceType")
      : "",
    readmit_28_days: readText(formData, "readmit28"),
    admit_three_times: readText(formData, "admit3times"),
    admit_number: readText(formData, "admitNumber"),
    residence_type: readText(formData, "residenceType"),
    residence_district: readText(formData, "residenceDistrict"),
    residence_subdistrict: readText(formData, "residenceLocation"),
    residence_details: readText(formData, "residenceDetails"),
    caregiver_status: readText(formData, "caregiverStatus"),
    caregiver_name: readText(formData, "caregiverName"),
    caregiver_relation: readText(formData, "caregiverRelation"),
    caregiver_phone: readText(formData, "caregiverPhone"),
    patient_phone: readText(formData, "patientPhone"),
  };

  const profile = {
    hn,
    prefix: "",
    full_name: `${firstName} ${lastName}`.trim(),
    gender,
    age,
    smi_type: smiVResult || "ไม่ระบุ",
    substance: record.substance_use || "ไม่ระบุ",
    admit_date: admissionDate || new Date().toISOString().split("T")[0],
    admitting_doctor: record.admitting_doctor || "ไม่ระบุ",
    oas_score: record.oas_score ? Number(record.oas_score) : null,
    oas_risk: record.oas_risk_level,
  };

  const { error: profileError } = await supabase
    .from("patients")
    .upsert(profile, { onConflict: "hn" });

  if (profileError) {
    return {
      status: "error",
      message: `บันทึกข้อมูลผู้ป่วยไม่สำเร็จ: ${profileError.message}`,
    };
  }

  const { error: assessmentError } = await supabase.from("assessments").insert({
    hn,
    record_type: "smi-v_admission",
    assess_date: new Date().toISOString().split("T")[0],
    shift: null,
    oas_score: record.oas_score ? Number(record.oas_score) : null,
    raw_data: record,
  });

  if (assessmentError) {
    return {
      status: "error",
      message: `บันทึกผลประเมินไม่สำเร็จ: ${assessmentError.message}`,
    };
  }

  return {
    status: "success",
    message: "บันทึกข้อมูลผู้ป่วยและผลประเมินเรียบร้อยแล้ว",
    result: {
      firstName,
      lastName,
      hn,
      smiVResult,
      oasScore: readText(formData, "oasScore"),
    },
  };
}
