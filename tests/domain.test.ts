import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { NON_SMIV_VALUE, OAS_CARE_CONTENT, OAS_OPTIONS, SMI_V_OPTIONS } from "../lib/constants/admission.ts";
import {
  matchesStatisticSmiFilter,
  STATISTIC_SMI_OPTIONS,
} from "../lib/constants/statistics.ts";
import {
  getActorLabel,
  getChangedFieldDetails,
  getEventLabel,
} from "../lib/logs/event-labels.ts";
import {
  formatDateBE,
  formatDateLongBE,
  formatDateTimeBE,
  getThailandDateParts,
  todayISOInThailand,
} from "../lib/utils/date.ts";
import { calculateRisk } from "../lib/utils/risk.ts";
import { assessmentSchema } from "../lib/validation/assessment.ts";
import { loginSchema, registerSchema } from "../lib/validation/auth.ts";
import { dischargeSchema } from "../lib/validation/discharge.ts";
import { editPatientSchema } from "../lib/validation/edit-patient.ts";
import { iorSchema } from "../lib/validation/ior.ts";
import {
  logFilterSchema,
  resolveLogTimeRange,
} from "../lib/validation/log-filter.ts";
import { newPatientDefaultValues, newPatientSchema } from "../lib/validation/new-patient.ts";
import { reportExportSchema } from "../lib/validation/report-export.ts";

test("calculateRisk preserves the legacy PHUA/G-HARD thresholds", () => {
  assert.equal(calculateRisk([]), "Mild");
  assert.equal(calculateRisk([1, 3, 5, 3]), "Moderate");
  assert.equal(calculateRisk([5, 5, 3, 1]), "Severe");
  assert.equal(calculateRisk([5, 5, 5, 1]), "Critical");
  assert.equal(calculateRisk([7, 1, 1, 1]), "Critical");
});

test("statistics groups every SMI-V subtype into one filter", () => {
  assert.deepEqual([...STATISTIC_SMI_OPTIONS], ["SMI-V", NON_SMIV_VALUE]);
  for (const subtype of ["SMI-V 1", "SMI-V 2", "SMI-V 3", "SMI-V 4"]) {
    assert.equal(matchesStatisticSmiFilter(subtype, "SMI-V"), true);
    assert.equal(matchesStatisticSmiFilter(subtype, NON_SMIV_VALUE), false);
  }
  assert.equal(matchesStatisticSmiFilter(NON_SMIV_VALUE, "SMI-V"), false);
  assert.equal(matchesStatisticSmiFilter(NON_SMIV_VALUE, NON_SMIV_VALUE), true);
  assert.equal(matchesStatisticSmiFilter("", ""), true);
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

test("formatDateTimeBE renders a Bangkok timestamp in the Buddhist Era", () => {
  const formatted = formatDateTimeBE("2024-01-01T18:30:00.000Z");
  assert.match(formatted, /2567/);
  assert.match(formatted, /01:30:00/);
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
  diagnosis: "Schizophrenia",
  admissionSource: "รับจาก ER",
  admissionDate: "2026-08-19",
  admittingDoctor: "พญ. บุญพร้อม เชษฐรตานนท์",
};

test("new patient schema accepts a complete SMI-V admission", () => {
  assert.equal(newPatientSchema.safeParse(completeSmivPatient).success, true);
});

test("new patient schema allows an empty patient phone", () => {
  assert.equal(
    newPatientSchema.safeParse({
      ...completeSmivPatient,
      patientPhone: "",
    }).success,
    true,
  );
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

test("new patient schema requires shared caregiver and admission fields for every residence type", () => {
  const incomplete = newPatientSchema.safeParse({
    ...newPatientDefaultValues,
    firstName: "สมหญิง",
    lastName: "ทดลอง",
    gender: "หญิง",
    age: "29",
    hn: "HN-101",
    smiV: NON_SMIV_VALUE,
    residenceType: "เร่ร่อน/อยู่สถานสงเคราะห์",
  });

  assert.equal(incomplete.success, false);
  if (!incomplete.success) {
    const fields = incomplete.error.flatten().fieldErrors;
    assert.ok(fields.caregiverStatus?.length);
    assert.ok(fields.diagnosis?.length);
    assert.ok(fields.admissionSource?.length);
    assert.ok(fields.admittingDoctor?.length);
    assert.equal(fields.residenceDistrict, undefined);
  }

  const complete = newPatientSchema.safeParse({
    ...newPatientDefaultValues,
    firstName: "สมหญิง",
    lastName: "ทดลอง",
    gender: "หญิง",
    age: "29",
    hn: "HN-101",
    smiV: NON_SMIV_VALUE,
    residenceType: "เร่ร่อน/อยู่สถานสงเคราะห์",
    caregiverStatus: "อยู่คนเดียว",
    patientPhone: "0812345678",
    diagnosis: "Schizophrenia",
    admissionSource: "รับจาก ER",
    admissionDate: "2026-08-21",
    admittingDoctor: "พญ. บุญพร้อม เชษฐรตานนท์",
  });
  assert.equal(complete.success, true);
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
  assert.equal(editPatientSchema.safeParse({ ...completeSmivPatient, age: "151" }).success, false);
  assert.equal(editPatientSchema.safeParse({ ...completeSmivPatient, diagnosis: "ค่าที่ไม่มีในตัวเลือก" }).success, false);
  assert.equal(editPatientSchema.safeParse(completeSmivPatient).success, true);
});

test("Supabase hardening migration covers every sensitive table and atomic workflow", () => {
  const baselineSql = readFileSync(
    new URL("../supabase/migrations/20260819000100_baseline.sql", import.meta.url),
    "utf8",
  );
  const sql = readFileSync(
    new URL("../supabase/migrations/20260819000200_security_rpcs_and_views.sql", import.meta.url),
    "utf8",
  );

  assert.match(baselineSql, /alter table public\.patients[\s\S]+add column if not exists id uuid/i);
  assert.match(baselineSql, /add column if not exists raw_data jsonb/i);
  assert.match(baselineSql, /alter table public\.assessments[\s\S]+add column if not exists phua_risk text/i);

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

test("IOR history survives discharge and resolves patient details from the matching archive", () => {
  const sql = readFileSync(
    new URL("../supabase/migrations/20260821000500_preserve_ior_on_discharge.sql", import.meta.url),
    "utf8",
  );

  assert.match(sql, /drop constraint if exists ior_records_hn_fkey/i);
  assert.doesNotMatch(sql, /on delete cascade/i);
  assert.match(sql, /create or replace view public\.ior_statistics/i);
  assert.match(sql, /left join lateral[\s\S]+from public\.backup/i);
  assert.match(sql, /archived\.admit_date <= incident\.record_date/i);
  assert.match(sql, /incident\.record_date <= archived\.discharge_date/i);
  assert.match(sql, /coalesce\(active_patient\.full_name, archived_patient\.full_name\)/i);
});

test("report export validation permits only bounded, safe workbook payloads", () => {
  assert.equal(reportExportSchema.safeParse({
    reportType: "admission",
    filename: "admission.xlsx",
    sheetName: "Admission",
    headers: ["HN"],
    rows: [["QA-001"]],
    filters: { gender: "male", year: "2569" },
  }).success, true);
  assert.equal(reportExportSchema.safeParse({
    reportType: "admission",
    filename: "../patient-data.xlsx",
    sheetName: "Admission",
    headers: ["HN"],
    rows: [["QA-001", "extra"]],
    filters: {},
  }).success, false);
});

test("activity logging migration is append-only and removes PHI snapshots", () => {
  const sql = readFileSync(
    new URL("../supabase/migrations/20260819000300_activity_logging.sql", import.meta.url),
    "utf8",
  );

  assert.match(sql, /create table if not exists public\.activity_log/i);
  assert.match(sql, /alter table public\.activity_log enable row level security/i);
  assert.match(sql, /create or replace function public\.record_app_activity/i);
  assert.match(sql, /revoke all on public\.activity_log from public, anon, authenticated/i);
  assert.match(sql, /drop column if exists old_data[\s\S]+drop column if exists new_data/i);
  assert.match(sql, /changed_fields text\[\]/i);
  assert.match(sql, /unsupported_export_metadata_key/i);

  const triggerFix = readFileSync(
    new URL("../supabase/migrations/20260819000400_fix_activity_trigger_record_type.sql", import.meta.url),
    "utf8",
  );
  assert.match(triggerFix, /v_new ->> 'record_type'/i);
  assert.doesNotMatch(triggerFix, /new\.record_type/i);
});

test("admin log labels translate audit codes and staff identity for general users", () => {
  assert.equal(getEventLabel("backup.insert", "audit"), "จำหน่ายผู้ป่วย (backup.insert)");
  assert.equal(getEventLabel("patient.discharged", "activity"), "จำหน่ายผู้ป่วย");
  assert.equal(getEventLabel("unknown.update", "audit"), "แก้ไขข้อมูล unknown (unknown.update)");
  assert.equal(getActorLabel("นาย สมชาย ใจดี", "qa_clinician"), "นาย สมชาย ใจดี (@qa_clinician)");
  assert.equal(getActorLabel(null, "former_user"), "@former_user");
  assert.deepEqual(
    getChangedFieldDetails(["discharge_date", "last_diagnosis"]),
    ["ข้อมูลที่เปลี่ยน: วันที่จำหน่าย, การวินิจฉัยครั้งสุดท้าย"],
  );
});

test("admin log time filters validate Bangkok custom ranges and rolling presets", () => {
  assert.equal(logFilterSchema.safeParse({
    query: "",
    source: "",
    actorRole: "",
    eventType: "",
    preset: "custom",
    from: "2026-08-21T12:00",
    to: "2026-08-21T11:59",
  }).success, false);

  const now = new Date("2026-08-21T06:00:00.000Z");
  assert.deepEqual(
    resolveLogTimeRange({ preset: "3h", from: "", to: "" }, now),
    { from: "2026-08-21T03:00:00.000Z", to: "2026-08-21T06:00:00.000Z" },
  );
  assert.deepEqual(
    resolveLogTimeRange({ preset: "today", from: "", to: "" }, now),
    { from: "2026-08-20T17:00:00.000Z", to: "2026-08-21T06:00:00.000Z" },
  );
});

test("admin log view preserves RLS and resolves current staff names without copying clinical rows", () => {
  const sql = readFileSync(
    new URL("../supabase/migrations/20260821000600_admin_log_entries.sql", import.meta.url),
    "utf8",
  );
  assert.match(sql, /create or replace view public\.admin_log_entries/i);
  assert.match(sql, /with \(security_invoker = true\)/i);
  assert.match(sql, /profile\.auth_user_id = activity\.actor_user_id/i);
  assert.match(sql, /profile\.auth_user_id = audit\.changed_by/i);
  assert.match(sql, /revoke all on public\.admin_log_entries from public, anon/i);
  assert.doesNotMatch(sql, /old_data|new_data/i);
});
