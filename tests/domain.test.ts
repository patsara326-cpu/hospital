import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { NON_SMIV_VALUE, OAS_CARE_CONTENT, OAS_OPTIONS, SMI_V_OPTIONS } from "../lib/constants/admission.ts";
import {
  formatDateBE,
  formatDateLongBE,
  getThailandDateParts,
  todayISOInThailand,
} from "../lib/utils/date.ts";
import { calculateRisk } from "../lib/utils/risk.ts";
import { assessmentSchema } from "../lib/validation/assessment.ts";
import { loginSchema, registerSchema } from "../lib/validation/auth.ts";
import { dischargeSchema } from "../lib/validation/discharge.ts";
import { editPatientSchema } from "../lib/validation/edit-patient.ts";
import { iorSchema } from "../lib/validation/ior.ts";
import { newPatientDefaultValues, newPatientSchema } from "../lib/validation/new-patient.ts";

test("calculateRisk preserves the legacy PHUA/G-HARD thresholds", () => {
  assert.equal(calculateRisk([]), "Mild");
  assert.equal(calculateRisk([1, 3, 5, 3]), "Moderate");
  assert.equal(calculateRisk([5, 5, 3, 1]), "Severe");
  assert.equal(calculateRisk([5, 5, 5, 1]), "Critical");
  assert.equal(calculateRisk([7, 1, 1, 1]), "Critical");
});

test("formatDateBE uses the Thai Buddhist Era and stable date-only parsing", () => {
  assert.equal(formatDateBE("2024-01-02"), "02/01/2567");
  assert.equal(formatDateBE("2024-12-31T12:00:00Z"), "31/12/2567");
  assert.equal(formatDateBE(null, "ไม่ระบุ"), "ไม่ระบุ");
  assert.equal(formatDateBE("not-a-date"), "-");
});

test("formatDateLongBE uses Thai month names and Buddhist Era", () => {
  assert.equal(formatDateLongBE("2024-01-02"), "2 มกราคม 2567");
  assert.equal(formatDateLongBE(undefined), "");
});

test("Thailand date helpers cross the UTC day boundary consistently", () => {
  const lateUtc = new Date("2024-01-01T18:30:00.000Z");
  assert.equal(todayISOInThailand(lateUtc), "2024-01-02");
  assert.equal(formatDateBE(lateUtc), "02/01/2567");
  assert.deepEqual(getThailandDateParts("2024-02-29"), { year: 2024, month: 2, day: 29 });
  assert.equal(getThailandDateParts("2024-02-30"), null);
});

const completeSmivPatient = {
  ...newPatientDefaultValues,
  firstName: "สมชาย",
  lastName: "ใจดี",
  gender: "ชาย",
  age: "34",
  hn: "HN-100",
  smiV: "SMI-V 1",
  oasScore: "2",
  aggressiveBehavior: "เอะอะเสียงดัง",
  substanceUse: "ไม่ใช้",
  readmit28: "ไม่ใช่",
  admit3times: "ไม่ใช่",
  residenceType: "มีที่อยู่เป็นหลักแหล่ง",
  residenceDistrict: "ในเขตอำเภอเมืองชลบุรี",
  residenceSubdistrict: "บ้านสวน",
  residenceDetails: "1/1 หมู่ 1",
  caregiverStatus: "อยู่คนเดียว",
  patientPhone: "0812345678",
  diagnosis: "F20",
  admissionSource: "ER",
  admissionDate: "2026-08-19",
  admittingDoctor: "แพทย์ ก",
};

test("new patient schema accepts a complete SMI-V admission", () => {
  assert.equal(newPatientSchema.safeParse(completeSmivPatient).success, true);
});

test("new patient schema enforces conditional OAS and admission fields", () => {
  const result = newPatientSchema.safeParse({
    ...completeSmivPatient,
    oasScore: "",
    admissionDate: "19/08/2569",
  });

  assert.equal(result.success, false);
  if (!result.success) {
    const fields = result.error.flatten().fieldErrors;
    assert.ok(fields.oasScore?.length);
    assert.ok(fields.admissionDate?.length);
  }
});

test("new patient schema preserves the legacy homeless short flow", () => {
  const result = newPatientSchema.safeParse({
    ...newPatientDefaultValues,
    firstName: "สมหญิง",
    lastName: "ทดลอง",
    gender: "หญิง",
    age: "29",
    hn: "HN-101",
    smiV: NON_SMIV_VALUE,
    residenceType: "ไม่มีที่อยู่เป็นหลักแหล่ง",
  });

  assert.equal(result.success, true);
});

test("clinical choices retain the detailed legacy SMI-V and OAS guidance", () => {
  assert.equal(SMI_V_OPTIONS.length, 5);
  assert.match(SMI_V_OPTIONS[1].description, /สะเทือนขวัญในชุมชน/);
  assert.equal(OAS_OPTIONS.length, 3);
  assert.ok(OAS_OPTIONS.every((option) => option.self && option.others && option.property));
  assert.match(OAS_CARE_CONTENT["2"].items.join(" "), /Hadol \(5\) IM \/ Valium \(10\) IV/);
});

test("auth schemas reject weak or mismatched credentials", () => {
  assert.equal(loginSchema.safeParse({ username: "", password: "" }).success, false);
  assert.equal(registerSchema.safeParse({ prefix: "นพ.", firstName: "ก", lastName: "ข", username: "staff", password: "123456", confirmPassword: "654321" }).success, false);
});

test("clinical write schemas enforce conditional data before Server Actions", () => {
  assert.equal(iorSchema.safeParse({ hn: "HN1", recordDate: "2026-08-19", behaviors: [], level: "B" }).success, false);
  assert.equal(dischargeSchema.safeParse({ hn: "HN1", dischargeMethod: "แพทย์อนุญาต", transferOther: "", dischargeDate: "2026-02-30", lastDiagnosis: "F20", dischargeType: "อนุญาตเยี่ยมบ้าน" }).success, false);
  assert.equal(assessmentSchema.safeParse({ hn: "HN1", assessDate: "2026-08-19", shift: "เวรเช้า", oasScore: "1", phuaScores: [1, 3, null, 7], ghardScores: [1, 1, 1, 1, 1] }).success, false);
  assert.equal(editPatientSchema.safeParse({
    hn: "HN1", prefix: "", first_name: "", last_name: "", full_name: "", gender: "ชาย", age: "151", is_smi_v: false,
    diagnosis: "", smi_v_result: "", smi_type: "", substance_use: "", substance_type: "", patient_phone: "", admission_date: "",
    admitting_doctor: "", caregiver_name: "", caregiver_relation: "", caregiver_phone: "", admission_source: "", residence_type: "",
    residence_details: "", residence_district: "", residence_subdistrict: "", aggressive_behavior: "", oas_score: "", oas_risk_level: "",
  }).success, false);
});

test("Supabase hardening migration covers every sensitive table and atomic workflow", () => {
  const sql = readFileSync(
    new URL("../supabase/migrations/20260819000200_security_rpcs_and_views.sql", import.meta.url),
    "utf8",
  );

  for (const table of ["users", "patients", "assessments", "backup", "ior_records", "audit_log"]) {
    assert.match(sql, new RegExp(`alter table public\\.${table} enable row level security`, "i"));
  }
  assert.match(sql, /create or replace function public\.register_patient_with_assessment/i);
  assert.match(sql, /create or replace function public\.discharge_patient/i);
  assert.match(sql, /create or replace function public\.update_patient_with_assessment/i);
  assert.match(sql, /create or replace view public\.ior_statistics/i);
  assert.match(sql, /revoke all on function[\s\S]+from public, anon/i);
  assert.match(sql, /set search_path = ''/i);
});
