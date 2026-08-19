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

  const { data: auditRows, error: auditReadError } = await supabase
    .from("audit_log")
    .select("id,old_data,new_data");
  if (auditReadError) throw new Error(`Cleanup audit lookup failed: ${auditReadError.message}`);

  const auditIds = (auditRows ?? [])
    .filter((row) => row.old_data?.hn === hn || row.new_data?.hn === hn)
    .map((row) => row.id);
  if (auditIds.length) {
    const { error } = await supabase.from("audit_log").delete().in("id", auditIds);
    if (error) throw new Error(`Cleanup audit_log failed: ${error.message}`);
  }
}
