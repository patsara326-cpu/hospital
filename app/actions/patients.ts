"use server";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  newPatientInputFromFormData,
  newPatientSchema,
  type NewPatientFormValues,
} from "@/lib/validation/new-patient";
import { todayISOInThailand } from "@/lib/utils/date";
import { dischargeSchema } from "@/lib/validation/discharge";
import { editPatientSchema } from "@/lib/validation/edit-patient";
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
  fieldErrors?: Partial<Record<keyof NewPatientFormValues, string[]>>;
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

function isMissingDatabaseFunction(error: { code?: string; message: string }): boolean {
  return error.code === "PGRST202"
    || error.message.toLowerCase().includes("schema cache")
    || error.message.toLowerCase().includes("could not find the function");
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
  const input = Object.fromEntries(
    Object.keys(emptyEditPatientForm).map((key) => [
      key,
      key === "is_smi_v" ? formData.get(key) === "true" : readText(formData, key),
    ]),
  );
  const parsed = editPatientSchema.safeParse(input);
  if (!parsed.success) return { status: "error", message: parsed.error.issues[0]?.message ?? "ข้อมูลผู้ป่วยไม่ถูกต้อง" };
  const values = parsed.data;
  const { hn } = values;

  const { supabase, error: accessError } = await getAuthorizedSupabase();
  if (!supabase) return { status: "error", message: accessError };

  const ageText = values.age;
  const oasText = values.oas_score;
  const payload = {
    hn,
    prefix: values.prefix || null,
    full_name: values.full_name || null,
    gender: values.gender || null,
    age: ageText ? Number(ageText) : null,
    smi_type: values.smi_type || null,
    substance: values.substance_use || null,
    admit_date: values.admission_date || null,
    admitting_doctor: values.admitting_doctor || null,
    oas_score: oasText ? Number(oasText) : null,
    oas_risk: values.oas_risk_level || null,
  };

  const assessmentId = readText(formData, "assessmentId");
  const { error: rpcError } = await supabase.rpc("update_patient_with_assessment", {
    p_profile: payload as Json,
    p_assessment_id: assessmentId,
    p_raw_data: values as Json,
  });
  if (!rpcError) return { status: "success", message: "บันทึกข้อมูลผู้ป่วยเรียบร้อยแล้ว" };
  if (!isMissingDatabaseFunction(rpcError)) {
    return { status: "error", message: `บันทึกข้อมูลผู้ป่วยล้มเหลว: ${rpcError.message}` };
  }

  const { error: patientError } = await supabase.from("patients").upsert(payload, { onConflict: "hn" });
  if (patientError) return { status: "error", message: `บันทึกข้อมูลผู้ป่วยล้มเหลว: ${patientError.message}` };

  if (assessmentId) {
    const { error: assessmentError } = await supabase
      .from("assessments")
      .update({ raw_data: values as Json, oas_score: oasText ? Number(oasText) : null })
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
  const parsed = dischargeSchema.safeParse({
    hn: readText(formData, "hn"),
    dischargeMethod: readText(formData, "dischargeMethod"),
    transferOther: readText(formData, "transferOther"),
    dischargeDate: readText(formData, "dischargeDate"),
    lastDiagnosis: readText(formData, "lastDiagnosis"),
    dischargeType: readText(formData, "dischargeType"),
  });
  if (!parsed.success) {
    return { status: "error", message: parsed.error.issues[0]?.message ?? "ข้อมูลการจำหน่ายไม่ถูกต้อง" };
  }
  const { hn, dischargeDate, lastDiagnosis, dischargeType } = parsed.data;
  let { dischargeMethod } = parsed.data;

  if (dischargeMethod === "transfer") {
    const { transferOther } = parsed.data;
    dischargeMethod = transferOther ? `transfer (${transferOther})` : "transfer";
  }

  const { supabase, error: accessError } = await getAuthorizedSupabase();
  if (!supabase) return { status: "error", message: accessError };

  const { error: rpcError } = await supabase.rpc("discharge_patient", {
    p_hn: hn,
    p_discharge_method: dischargeMethod,
    p_discharge_date: dischargeDate,
    p_last_diagnosis: lastDiagnosis,
    p_discharge_type: dischargeType,
  });
  if (!rpcError) return { status: "success", message: "จำหน่ายผู้ป่วยเรียบร้อยแล้ว" };
  if (!isMissingDatabaseFunction(rpcError)) {
    return { status: "error", message: `จำหน่ายผู้ป่วยล้มเหลว: ${rpcError.message}` };
  }

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

const riskLevelMap: Record<string, string> = {
  "1": "Semi-urgency",
  "2": "Urgency",
  "3": "Emergency",
};

export async function saveNewPatientAction(
  formData: FormData,
): Promise<SaveNewPatientState> {
  const parsed = newPatientSchema.safeParse(newPatientInputFromFormData(formData));
  if (!parsed.success) {
    const fieldErrors = parsed.error.flatten().fieldErrors;
    const firstError = Object.values(fieldErrors).flat()[0];
    return {
      status: "error",
      message: firstError ?? "ข้อมูลผู้ป่วยไม่ถูกต้อง",
      fieldErrors,
    };
  }

  const values = parsed.data;
  const firstName = values.firstName;
  const lastName = values.lastName;
  const gender = values.gender;
  const age = Number(values.age);
  const hn = values.hn;
  const smiVResult = values.smiV;

  const { supabase, error: accessError } = await getAuthorizedSupabase();
  if (!supabase) {
    return { status: "error", message: accessError };
  }

  const admissionDate = values.admissionDate;
  const record = {
    first_name: firstName,
    last_name: lastName,
    gender,
    age: String(age),
    hn,
    diagnosis: values.diagnosis === "อื่นๆ" ? values.diagnosisOther : values.diagnosis,
    admission_source: values.admissionSource,
    admission_date: admissionDate,
    admitting_doctor: values.admittingDoctor,
    smi_v_result: smiVResult,
    is_smi_v: smiVResult !== "ไม่เข้าข่าย SMI-V",
    oas_score: values.oasScore,
    oas_risk_level: riskLevelMap[values.oasScore] ?? "Low Risk",
    aggressive_behavior: values.aggressiveBehavior,
    substance_use: values.substanceUse,
    substance_type: values.substanceUse === "ใช้" ? values.substanceType : "",
    readmit_28_days: values.readmit28,
    admit_three_times: values.admit3times,
    admit_number: values.admitNumber,
    residence_type: values.residenceType,
    residence_district: values.residenceDistrict,
    residence_subdistrict:
      values.residenceDistrict === "ในเขตอำเภอเมืองชลบุรี"
        ? values.residenceSubdistrict
        : values.residenceOtherDistrict,
    residence_details: values.residenceDetails,
    caregiver_status: values.caregiverStatus,
    caregiver_name: values.caregiverName,
    caregiver_relation:
      values.caregiverRelation === "อื่นๆ"
        ? values.caregiverRelationOther
        : values.caregiverRelation,
    caregiver_phone: values.caregiverPhone,
    patient_phone: values.patientPhone,
  };

  const profile = {
    hn,
    prefix: "",
    full_name: `${firstName} ${lastName}`.trim(),
    gender,
    age,
    smi_type: smiVResult || "ไม่ระบุ",
    substance: record.substance_use || "ไม่ระบุ",
    admit_date: admissionDate || todayISOInThailand(),
    admitting_doctor: record.admitting_doctor || "ไม่ระบุ",
    oas_score: record.oas_score ? Number(record.oas_score) : null,
    oas_risk: record.oas_risk_level,
  };

  const initialAssessment = {
    hn,
    record_type: "smi-v_admission",
    assess_date: todayISOInThailand(),
    shift: null,
    oas_score: record.oas_score ? Number(record.oas_score) : null,
    raw_data: record as Json,
  };

  const { error: rpcError } = await supabase.rpc("register_patient_with_assessment", {
    p_profile: profile as Json,
    p_assessment: initialAssessment as Json,
  });
  if (!rpcError) {
    return {
      status: "success",
      message: "บันทึกข้อมูลผู้ป่วยเรียบร้อยแล้ว",
      result: { firstName, lastName, hn, smiVResult, oasScore: values.oasScore },
    };
  }
  if (!isMissingDatabaseFunction(rpcError)) {
    const duplicate = rpcError.code === "23505" || rpcError.message.includes("duplicate_hn");
    return {
      status: "error",
      message: duplicate ? `มีผู้ป่วย HN ${hn} อยู่ในระบบแล้ว` : `บันทึกข้อมูลผู้ป่วยไม่สำเร็จ: ${rpcError.message}`,
    };
  }

  const { data: existingPatient, error: existingError } = await supabase
    .from("patients")
    .select("hn")
    .eq("hn", hn)
    .maybeSingle();
  if (existingError) return { status: "error", message: existingError.message };
  if (existingPatient) return { status: "error", message: `มีผู้ป่วย HN ${hn} อยู่ในระบบแล้ว` };

  const { error: profileError } = await supabase
    .from("patients")
    .insert(profile);

  if (profileError) {
    return {
      status: "error",
      message: `บันทึกข้อมูลผู้ป่วยไม่สำเร็จ: ${profileError.message}`,
    };
  }

  const { error: assessmentError } = await supabase.from("assessments").insert(initialAssessment);

  if (assessmentError) {
    await supabase.from("patients").delete().eq("hn", hn);
    return {
      status: "error",
      message: `บันทึกผลประเมินไม่สำเร็จและยกเลิกข้อมูลผู้ป่วยแล้ว: ${assessmentError.message}`,
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
      oasScore: values.oasScore,
    },
  };
}
