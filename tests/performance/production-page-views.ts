import assert from "node:assert/strict";

import { createClient } from "@supabase/supabase-js";

import { NON_SMIV_VALUE } from "../../lib/constants/admission.ts";
import type { Database } from "../../types/database.types.ts";

function required(name: string) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} is required`);
  return value;
}

function monthKeysBangkok() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Bangkok", year: "numeric", month: "2-digit",
  }).formatToParts(new Date());
  const year = Number(parts.find((part) => part.type === "year")?.value);
  const month = Number(parts.find((part) => part.type === "month")?.value);
  return Array.from({ length: 8 }, (_, index) => {
    const date = new Date(Date.UTC(year, month - 1 - (7 - index), 1));
    return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
  });
}

async function main() {
  if (required("SUPABASE_PRODUCTION_CHECK_MODE") !== "read-only") throw new Error("Production verification is read-only only");
  const projectRef = required("SUPABASE_PRODUCTION_PROJECT_REF");
  const forbiddenRef = required("SUPABASE_STAGING_PROJECT_REF");
  assert.notEqual(projectRef, forbiddenRef, "Production and staging refs must differ");
  const url = required("SUPABASE_PRODUCTION_URL");
  assert.equal(new URL(url).hostname, `${projectRef}.supabase.co`);

  const service = createClient<Database>(url, required("SUPABASE_PRODUCTION_SERVICE_ROLE_KEY"), {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const anon = createClient<Database>(url, required("SUPABASE_PRODUCTION_ANON_KEY"), {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const [patients, backup, ior, trends, ipdDetails, ipdList, incidents, incidentPage] = await Promise.all([
    service.from("patients").select("admit_date,smi_type"),
    service.from("backup").select("admit_date,smi_type"),
    service.from("ior_statistics").select("id,hn,record_date,level,full_name,gender,smi_type"),
    service.from("dashboard_monthly_trends").select("series,month_start,event_count"),
    service.from("current_ipd_rows").select("id,gender,smi_v_result"),
    service.from("current_ipd_list_rows").select("id,gender,smi_v_result,patient_group"),
    service.from("incident_statistics_rows").select("id,hn,record_date,level,full_name,gender,smi_type,report_date,report_year,report_month"),
    service.from("incident_statistics_rows").select("id", { count: "exact" }).order("report_date", { ascending: false }).order("id", { ascending: true }).range(0, 19),
  ]);
  for (const result of [patients, backup, ior, trends, ipdDetails, ipdList, incidents, incidentPage]) {
    if (result.error) throw result.error;
  }

  const keys = monthKeysBangkok();
  const expected = new Map(keys.flatMap((key) => [[`admit:${key}`, 0], [`ior:${key}`, 0]]));
  for (const row of [...(patients.data ?? []), ...(backup.data ?? [])]) {
    const key = row.admit_date?.slice(0, 7);
    if (key && expected.has(`admit:${key}`) && row.smi_type !== null && row.smi_type !== NON_SMIV_VALUE) {
      expected.set(`admit:${key}`, (expected.get(`admit:${key}`) ?? 0) + 1);
    }
  }
  for (const row of ior.data ?? []) {
    const key = row.record_date?.slice(0, 7);
    if (key && expected.has(`ior:${key}`) && row.smi_type !== null && row.smi_type !== NON_SMIV_VALUE) {
      expected.set(`ior:${key}`, (expected.get(`ior:${key}`) ?? 0) + 1);
    }
  }
  const actual = new Map((trends.data ?? []).map((row) => [`${row.series}:${row.month_start?.slice(0, 7)}`, Number(row.event_count ?? 0)]));
  for (const [key, count] of expected) assert.equal(actual.get(key) ?? 0, count, `dashboard trend mismatch: ${key}`);

  const listMap = new Map((ipdList.data ?? []).map((row) => [row.id, row]));
  assert.equal(listMap.size, ipdDetails.data?.length ?? 0, "IPD list row count differs");
  for (const row of ipdDetails.data ?? []) {
    const summary = listMap.get(row.id);
    assert.ok(summary, "IPD list omitted a current patient");
    assert.equal(summary.patient_group, row.smi_v_result === NON_SMIV_VALUE ? "nonsmiv" : "smiv");
  }

  const incidentMap = new Map((incidents.data ?? []).map((row) => [row.id, row]));
  assert.equal(incidentMap.size, ior.data?.length ?? 0, "Incident projection row count differs");
  for (const row of ior.data ?? []) {
    const projected = incidentMap.get(row.id);
    assert.ok(projected, "Incident projection omitted an IOR row");
    assert.deepEqual(
      [projected.hn, projected.record_date, projected.level, projected.full_name, projected.gender, projected.smi_type],
      [row.hn, row.record_date, row.level, row.full_name, row.gender, row.smi_type],
    );
  }
  assert.equal(incidentPage.count ?? 0, incidents.data?.length ?? 0, "Incident exact count differs");
  assert.ok((incidentPage.data?.length ?? 0) <= 20, "Incident page exceeded its bound");

  for (const view of ["dashboard_monthly_trends", "current_ipd_list_rows", "incident_statistics_rows"] as const) {
    const result = await anon.from(view).select("*").limit(1);
    assert.ok(result.error, `Anonymous access unexpectedly succeeded for ${view}`);
  }
  console.log(`Production read-only parity: dashboard=pass; ipd=${listMap.size}; incidents=${incidentMap.size}; anon=denied`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
