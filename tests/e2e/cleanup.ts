import { createClient } from "@supabase/supabase-js";

import type { Phase5Env } from "./env";

export async function cleanupSyntheticPatient(env: Phase5Env, hn: string) {
  if (!hn.startsWith(env.E2E_HN_PREFIX)) {
    throw new Error(`Refusing cleanup: HN ${hn} is outside the approved synthetic prefix`);
  }

  const supabase = createClient(
    env.E2E_SUPABASE_URL,
    env.E2E_SUPABASE_SERVICE_ROLE_KEY,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );

  for (const table of ["ior_records", "assessments", "backup", "patients"] as const) {
    const { error } = await supabase.from(table).delete().eq("hn", hn);
    if (error) throw new Error(`Cleanup ${table} failed: ${error.message}`);
  }

  const { error: activityError } = await supabase
    .from("activity_log")
    .delete()
    .or(`target_ref.eq.${hn},actor_username.eq.${env.E2E_USERNAME}`);
  if (activityError) throw new Error(`Cleanup activity_log failed: ${activityError.message}`);

  const { data: auditRows, error: auditReadError } = await supabase
    .from("audit_log")
    .select("id,record_ref")
    .eq("record_ref", hn);
  if (auditReadError) throw new Error(`Cleanup audit lookup failed: ${auditReadError.message}`);

  const auditIds = (auditRows ?? []).map((row) => row.id);
  if (auditIds.length) {
    const { error } = await supabase.from("audit_log").delete().in("id", auditIds);
    if (error) throw new Error(`Cleanup audit_log failed: ${error.message}`);
  }
}
