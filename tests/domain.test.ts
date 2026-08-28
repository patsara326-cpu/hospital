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
  filtersToSearchParams,
  incidentFiltersToSearchParams,
  parseIncidentReportFilters,
  parseStatisticReportFilters,
  reportDateBounds,
} from "../lib/statistics/report-filters.ts";
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

test("new registrations become clinicians without an approval workflow", () => {
  const sql = readFileSync(
    new URL("../supabase/migrations/20260828001000_signup_clinician_by_default.sql", import.meta.url),
    "utf8",
  );
  const authAction = readFileSync(
    new URL("../app/actions/auth.ts", import.meta.url),
    "utf8",
  );
  const logViewer = readFileSync(
    new URL("../components/logs/LogViewer.tsx", import.meta.url),
    "utf8",
  );

  assert.match(sql, /alter column role set default 'clinician'/i);
  assert.match(sql, /update public\.users[\s\S]+set role = 'clinician'[\s\S]+where role = 'pending'/i);
  assert.match(sql, /create or replace function public\.handle_new_auth_user/i);
  assert.match(sql, /values \([\s\S]+new\.id[\s\S]+'clinician'[\s\S]+\)/i);
  assert.match(sql, /when public\.users\.role = 'pending' then 'clinician'[\s\S]+else public\.users\.role/i);
  assert.match(sql, /create policy users_insert_own_clinician[\s\S]+role = 'clinician'/i);
  assert.doesNotMatch(authAction, /กรุณารอผู้ดูแลระบบอนุมัติสิทธิ์/);
  assert.doesNotMatch(logViewer, /<option value="pending">/);
});

test("low-risk performance migration preserves role rules and adds query indexes", () => {
  const sql = readFileSync(
    new URL("../supabase/migrations/20260823000700_low_risk_performance.sql", import.meta.url),
    "utf8",
  );

  for (const policy of [
    "users_select_own_or_privileged",
    "patients_staff_read",
    "assessments_staff_read",
    "backup_staff_read",
    "ior_staff_read",
    "audit_privileged_read",
    "activity_log_privileged_read",
  ]) {
    assert.match(sql, new RegExp(`alter policy ${policy}`, "i"));
  }

  assert.match(sql, /\(select auth\.uid\(\)\)/i);
  assert.match(sql, /\(select public\.current_app_role\(\)\)/i);
  assert.match(sql, /patients \(gender, created_at desc\)/i);
  assert.match(sql, /assessments \(hn, record_type, assess_date desc, created_at desc\)/i);
  assert.match(sql, /backup \(gender, discharge_date desc\)[\s\S]+where discharge_date is not null/i);
});

test("read-optimized views preserve RLS and project raw data server-side", () => {
  const sql = readFileSync(
    new URL("../supabase/migrations/20260827000800_read_optimized_views.sql", import.meta.url),
    "utf8",
  );

  for (const view of [
    "admission_statistics_rows",
    "discharge_statistics_rows",
    "current_ipd_rows",
    "dashboard_patient_groups",
  ]) {
    assert.match(
      sql,
      new RegExp(`create or replace view public\\.${view}\\s+with \\(security_invoker = true\\)`, "i"),
    );
    assert.match(sql, new RegExp(`revoke all on public\\.${view} from public, anon`, "i"));
    assert.match(sql, new RegExp(`grant select on public\\.${view} to authenticated`, "i"));
  }

  assert.match(sql, /row_number\(\)[\s\S]+partition by[\s\S]+admission_rank = 1/i);
  assert.match(
    sql,
    /record_type = 'smi-v_admission'[\s\S]+assess_date desc nulls last[\s\S]+created_at desc[\s\S]+id desc/i,
  );
  assert.match(sql, /count\(\*\) as patient_count[\s\S]+group by/i);
  assert.doesNotMatch(sql, /grant select[\s\S]+to anon/i);
});

test("remote load tests require an explicit staging origin allowlist", () => {
  const script = readFileSync(
    new URL("../scripts/performance/load-test.mjs", import.meta.url),
    "utf8",
  );

  assert.match(script, /PERF_ALLOW_REMOTE[^\n]+staging-only/i);
  assert.match(script, /PERF_STAGING_ORIGIN/);
  assert.match(script, /target\.origin !== stagingOrigin/);
  assert.match(script, /PERF_PRODUCTION_ORIGIN/);
  assert.match(script, /Refusing to load test the production origin/);
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

  assert.equal(reportExportSchema.safeParse({
    source: "database",
    reportType: "discharge",
    filename: "discharge.xlsx",
    sheetName: "Discharge",
    filters: {
      gender: "หญิง",
      month: "12",
      year: "2569",
      smi_filter: "SMI-V",
      residence_filter: "นอกจังหวัด",
    },
  }).success, true);
  assert.equal(reportExportSchema.safeParse({
    source: "database",
    reportType: "incidents",
    filename: "incidents.xlsx",
    sheetName: "Incidents",
    filters: { gender: "หญิง", month: "13" },
  }).success, false);
});

test("statistics URL filters are bounded and preserve month-only filtering", () => {
  const parsed = parseStatisticReportFilters({
    month: "2",
    year: "2569",
    smiv: "SMI-V",
    residence: "เร่ร่อน",
    page: "3",
  });
  assert.deepEqual(parsed, {
    month: "2",
    year: "2569",
    smiv: "SMI-V",
    residence: "เร่ร่อน",
    page: 3,
  });
  assert.deepEqual(reportDateBounds(parsed), {
    start: "2026-02-01",
    end: "2026-03-01",
  });
  assert.deepEqual(reportDateBounds({ ...parsed, year: "" }), { month: 2 });
  assert.equal(filtersToSearchParams(parsed).toString(),
    "month=2&year=2569&smiv=SMI-V&residence=%E0%B9%80%E0%B8%A3%E0%B9%88%E0%B8%A3%E0%B9%88%E0%B8%AD%E0%B8%99&page=3");

  assert.deepEqual(parseStatisticReportFilters({
    month: "13",
    year: "not-a-year",
    smiv: "unknown",
    residence: "unknown",
    page: "-1",
  }), { month: "", year: "", smiv: "", residence: "", page: 1 });
});

test("server-filtered report migration keeps RLS and typed date filters", () => {
  const sql = readFileSync(
    new URL("../supabase/migrations/20260827000900_server_filtered_reports.sql", import.meta.url),
    "utf8",
  );

  assert.match(sql, /create or replace function public\.try_report_date\(value text\)/i);
  assert.match(sql, /create or replace view public\.admission_statistics_rows[\s\S]+with \(security_invoker = true\)/i);
  assert.match(sql, /report_year[\s\S]+report_month/i);
  assert.match(sql, /create or replace view public\.statistics_report_years/i);
  assert.match(sql, /grant select on public\.statistics_report_years to authenticated/i);
  assert.match(sql, /assessments_admission_report_filter_idx/i);
  assert.match(sql, /backup_admission_report_filter_idx/i);
  assert.doesNotMatch(sql, /security_definer/i);
});

test("page-loading performance views are bounded, filterable, and RLS preserving", () => {
  const sql = readFileSync(
    new URL("../supabase/migrations/20260828001100_page_loading_performance.sql", import.meta.url),
    "utf8",
  );
  for (const view of ["dashboard_monthly_trends", "current_ipd_list_rows", "incident_statistics_rows"]) {
    assert.match(sql, new RegExp(`create or replace view public\\.${view}[\\s\\S]+with \\(security_invoker = true\\)`, "i"));
    assert.match(sql, new RegExp(`revoke all on public\\.${view} from public, anon`, "i"));
    assert.match(sql, new RegExp(`grant select on public\\.${view} to authenticated`, "i"));
  }
  assert.match(sql, /interval '7 months'/i);
  assert.match(sql, /when inpatient\.smi_v_result = 'ไม่เข้าข่าย SMI-V' then 'nonsmiv'[\s\S]+else 'smiv'/i);
  assert.match(sql, /'incidents'::text[\s\S]+incident_statistics_rows/i);
  assert.match(sql, /ior_records_record_date_id_idx/i);
  assert.doesNotMatch(sql, /grant select[\s\S]+to anon/i);
});

test("incident URL filters preserve the old SMI-V semantics and pagination", () => {
  const parsed = parseIncidentReportFilters({ month: "8", year: "2569", gender: "หญิง", smiv: "SMI-V", page: "2" });
  assert.deepEqual(parsed, { month: "8", year: "2569", gender: "หญิง", smiv: "SMI-V", page: 2 });
  assert.equal(incidentFiltersToSearchParams(parsed).toString(),
    "month=8&year=2569&gender=%E0%B8%AB%E0%B8%8D%E0%B8%B4%E0%B8%87&smiv=SMI-V&page=2");
  assert.deepEqual(parseIncidentReportFilters({ month: "99", gender: "unknown", page: "0" }),
    { month: "", year: "", gender: "", smiv: "", page: 1 });
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
