import { randomBytes } from "node:crypto";
import { performance } from "node:perf_hooks";

import { createClient } from "@supabase/supabase-js";

import { getPhase5Env } from "../e2e/env.ts";

type QueryResult = {
  data: unknown;
  error: { message: string } | null;
};

function payloadSize(data: unknown) {
  return Buffer.byteLength(JSON.stringify(data ?? null), "utf8");
}

async function measure(label: string, operation: () => PromiseLike<QueryResult>) {
  const startedAt = performance.now();
  const result = await operation();
  const elapsedMs = performance.now() - startedAt;

  if (result.error) {
    throw new Error(`${label}: ${result.error.message}`);
  }

  const rows = Array.isArray(result.data) ? result.data.length : result.data ? 1 : 0;
  console.log(
    `${label}: ${elapsedMs.toFixed(1)} ms; rows=${rows}; payload=${payloadSize(result.data)} bytes`,
  );

  return result.data;
}

async function main() {
  const env = getPhase5Env();
  const admin = createClient(
    env.E2E_SUPABASE_URL,
    env.E2E_SUPABASE_SERVICE_ROLE_KEY,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
  const supabase = createClient(env.E2E_SUPABASE_URL, env.E2E_SUPABASE_ANON_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const runId = `${Date.now()}_${randomBytes(4).toString("hex")}`;
  const username = `qa_perf_${runId}`;
  const email = `${username}@app.local`;
  const password = `${randomBytes(24).toString("base64url")}!Qa5`;
  const { data: created, error: createError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: {
      username,
      prefix: "QA",
      first_name: "Performance",
      last_name: "Clinician",
    },
  });
  if (createError) throw createError;

  try {
    const { error: roleError } = await admin
      .from("users")
      .update({ role: "clinician" })
      .eq("auth_user_id", created.user.id);
    if (roleError) throw roleError;

    const authStartedAt = performance.now();
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    const authElapsedMs = performance.now() - authStartedAt;
    if (authError) throw authError;
    if (!authData.user) throw new Error("Synthetic clinician login returned no user");
    console.log(`auth.signInWithPassword: ${authElapsedMs.toFixed(1)} ms`);

    const claimsStartedAt = performance.now();
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims();
    const claimsElapsedMs = performance.now() - claimsStartedAt;
    if (claimsError) throw claimsError;
    if (claimsData?.claims?.sub !== created.user.id) {
      throw new Error("getClaims returned an unexpected subject");
    }
    console.log(`auth.getClaims: ${claimsElapsedMs.toFixed(1)} ms`);

    await measure("profile", () => supabase
      .from("users")
      .select("id,role")
      .eq("auth_user_id", created.user.id)
      .single());

    await measure("dashboard-current-shape", () => supabase
      .from("patients")
      .select("gender,smi_type,oas_score,admitting_doctor"));

    await measure("admission-assessments-current-shape", () => supabase
      .from("assessments")
      .select("raw_data")
      .not("raw_data", "is", null));

    await measure("admission-backup-current-shape", () => supabase
      .from("backup")
      .select("id,raw_data")
      .not("raw_data", "is", null));

    await measure("latest-assessments-sample", () => supabase
      .from("assessments")
      .select("hn,assess_date,created_at")
      .order("assess_date", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(20));

    await measure("dashboard-optimized-view", () => supabase
      .from("dashboard_patient_groups")
      .select("gender,smi_type,oas_score,admitting_doctor,patient_count"));

    await measure("admission-optimized-view", () => supabase
      .from("admission_statistics_rows")
      .select(
        "id,admission_date,admitting_doctor,diagnosis,first_name,full_name,hn,last_name,residence_details,residence_district,residence_type,smi_v_result,substance_type",
      )
      .eq("gender", "ชาย"));

    await measure("discharge-optimized-view", () => supabase
      .from("discharge_statistics_rows")
      .select(
        "id,hn,full_name,gender,discharge_date,discharge_type,last_diagnosis,smi_type,admitting_doctor,first_name,last_name,substance_type,residence_type,residence_district,residence_details",
      )
      .eq("gender", "ชาย"));

    await measure("current-ipd-optimized-view", () => supabase
      .from("current_ipd_rows")
      .select(
        "id,hn,prefix,full_name,first_name,last_name,gender,age,smi_type,smi_v_result,substance,substance_use,substance_type,admission_date,admitting_doctor,diagnosis,admission_source,oas_score,oas_risk,oas_risk_level,aggressive_behavior,residence_type,residence_district,residence_subdistrict,residence_details,caregiver_status,caregiver_name,caregiver_relation,caregiver_phone,patient_phone,is_smi_v,extra_data",
      )
      .eq("gender", "ชาย"));

    await measure("dashboard-monthly-trends", () => supabase
      .from("dashboard_monthly_trends")
      .select("series,month_start,event_count"));

    await measure("current-ipd-list-page", () => supabase
      .from("current_ipd_list_rows")
      .select("id,hn,full_name,first_name,last_name,smi_v_result,admission_date,admitting_doctor", { count: "exact" })
      .eq("gender", "ชาย")
      .eq("patient_group", "smiv")
      .order("created_at", { ascending: false })
      .limit(20));

    await measure("incident-statistics-page", () => supabase
      .from("incident_statistics_rows")
      .select("id,hn,record_date,level,full_name,gender,smi_type", { count: "exact" })
      .order("report_date", { ascending: false })
      .limit(20));
  } finally {
    await supabase.auth.signOut();
    const { error: deleteError } = await admin.auth.admin.deleteUser(created.user.id);
    if (deleteError) throw deleteError;
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
