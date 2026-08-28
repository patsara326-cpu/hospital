import { createClient, type SupabaseClient, type User } from "@supabase/supabase-js";

import { getPhase5Env } from "./env.ts";

async function findUserByEmail(
  admin: SupabaseClient,
  email: string,
): Promise<User | undefined> {
  for (let page = 1; page <= 10; page += 1) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) throw error;
    const match = data.users.find((user) => user.email?.toLowerCase() === email.toLowerCase());
    if (match) return match;
    if (data.users.length < 1000) return undefined;
  }
  throw new Error("QA runtime user lookup exceeded the supported page limit");
}

async function main() {
  const env = getPhase5Env();
  const admin = createClient(env.E2E_SUPABASE_URL, env.E2E_SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const email = `${env.E2E_USERNAME}@app.local`;
  const metadata = {
    username: env.E2E_USERNAME,
    prefix: "QA",
    first_name: "Runtime",
    last_name: "Clinician",
  };
  const existing = await findUserByEmail(admin, email);
  const result = existing
    ? await admin.auth.admin.updateUserById(existing.id, {
        password: env.E2E_PASSWORD,
        email_confirm: true,
        user_metadata: metadata,
      })
    : await admin.auth.admin.createUser({
        email,
        password: env.E2E_PASSWORD,
        email_confirm: true,
        user_metadata: metadata,
      });
  if (result.error) throw result.error;

  const { data: profile, error: profileError } = await admin
    .from("users")
    .upsert({
      auth_user_id: result.data.user.id,
      username: env.E2E_USERNAME,
      prefix: metadata.prefix,
      first_name: metadata.first_name,
      last_name: metadata.last_name,
      role: "clinician",
    }, { onConflict: "username" })
    .select("role,auth_user_id")
    .single();
  if (profileError) throw profileError;
  if (profile.role !== "clinician" || profile.auth_user_id !== result.data.user.id) {
    throw new Error("QA runtime profile verification failed");
  }
  console.log("QA runtime clinician provisioned on guarded staging.");
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
