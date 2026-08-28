import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";

import { createClient } from "@supabase/supabase-js";

import { getPhase5Env } from "./env.ts";

async function main() {
  const env = getPhase5Env();
  const createViaAdmin = process.env.E2E_SIGNUP_CREATE_MODE === "admin";
  const runId = `${Date.now()}_${randomBytes(4).toString("hex")}`;
  const username = `qa_signup_${runId}`;
  const email = createViaAdmin
    ? `${username}@app.local`
    : `${username}@gmail.com`;
  const password = `${randomBytes(24).toString("base64url")}!Qa5`;
  const admin = createClient(env.E2E_SUPABASE_URL, env.E2E_SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const signup = createClient(env.E2E_SUPABASE_URL, env.E2E_SUPABASE_ANON_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const metadata = {
        username,
        prefix: "QA",
        first_name: "Signup",
        last_name: "Clinician",
  };
  const { data, error } = createViaAdmin
    ? await admin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: metadata,
      })
    : await signup.auth.signUp({
        email,
        password,
        options: { data: metadata },
      });
  if (error) throw error;
  assert.ok(data.user, "Public signup did not return a user");

  try {
    const { data: profile, error: profileError } = await admin
      .from("users")
      .select("auth_user_id,username,role")
      .eq("auth_user_id", data.user.id)
      .single();
    if (profileError) throw profileError;
    assert.equal(profile.username, username);
    assert.equal(profile.role, "clinician");

    if (!createViaAdmin && !data.session) {
      const { error: confirmError } = await admin.auth.admin.updateUserById(data.user.id, {
        email_confirm: true,
      });
      if (confirmError) throw confirmError;
    }
    if (createViaAdmin || !data.session) {
      const { error: loginError } = await signup.auth.signInWithPassword({ email, password });
      if (loginError) throw loginError;
    }
    const { data: role, error: roleError } = await signup.rpc("current_app_role");
    if (roleError) throw roleError;
    assert.equal(role, "clinician");
    console.log(`${createViaAdmin ? "Auth trigger" : "Public signup"} role: PASS (clinician)`);
  } finally {
    await signup.auth.signOut();
    const { error: deleteError } = await admin.auth.admin.deleteUser(data.user.id);
    if (deleteError) throw deleteError;
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
