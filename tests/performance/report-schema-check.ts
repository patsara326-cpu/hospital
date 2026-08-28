import { createClient } from "@supabase/supabase-js";

import type { Database } from "../../types/database.types.ts";

function required(name: string) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} is required`);
  return value;
}

async function main() {
  if (required("SUPABASE_SCHEMA_CHECK_MODE") !== "read-only") {
    throw new Error("Schema verification is restricted to read-only mode");
  }
  const projectRef = required("SUPABASE_CHECK_PROJECT_REF");
  const forbiddenRef = required("SUPABASE_CHECK_FORBIDDEN_REF");
  const url = required("SUPABASE_CHECK_URL");
  if (projectRef === forbiddenRef) throw new Error("Project separation guard failed");
  if (new URL(url).hostname !== `${projectRef}.supabase.co`) {
    throw new Error("Supabase URL does not match the guarded project ref");
  }

  const supabase = createClient<Database>(
    url,
    required("SUPABASE_CHECK_SERVICE_ROLE_KEY"),
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
  const checks = [
    supabase.from("admission_statistics_rows").select(
      "id,hn,gender,admission_date,report_date,report_year,report_month,smi_v_result,residence_type,residence_district",
    ).limit(0),
    supabase.from("discharge_statistics_rows").select(
      "id,hn,gender,discharge_date,report_date,report_year,report_month,smi_type,residence_type,residence_district",
    ).limit(0),
    supabase.from("statistics_report_years").select(
      "report_type,gender,report_year",
    ).limit(0),
    supabase.from("current_ipd_rows").select("id,hn,gender,admission_date").limit(0),
    supabase.from("dashboard_patient_groups").select(
      "gender,smi_type,oas_score,admitting_doctor,patient_count",
    ).limit(0),
  ];
  const results = await Promise.all(checks);
  for (const [index, result] of results.entries()) {
    if (result.error) throw new Error(`Schema query ${index + 1}: ${result.error.message}`);
    if ((result.data?.length ?? 0) !== 0) {
      throw new Error(`Schema query ${index + 1} unexpectedly returned data`);
    }
  }

  const parsedDate = await supabase.rpc("try_report_date", { value: "2026-08-27" });
  if (parsedDate.error) throw new Error(`try_report_date: ${parsedDate.error.message}`);
  if (parsedDate.data !== "2026-08-27") throw new Error("try_report_date returned an unexpected value");
  console.log(`Read-only report schema check: PASS (${projectRef})`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
