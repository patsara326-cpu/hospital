import { randomBytes } from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";

import { createClient, type SupabaseClient, type User } from "@supabase/supabase-js";
import { parse } from "dotenv";
import { z } from "zod";

const LOCAL_ENV_FILE = "phase5.e2e.env.local";
const EXAMPLE_ENV_FILE = "phase5.e2e.env.example";
const LINKED_REF_FILE = "supabase/.temp/project-ref";

const provisionEnvSchema = z.object({
  E2E_BASE_URL: z.url(),
  E2E_STAGING_PROJECT_REF: z.string().trim().min(8),
  E2E_PRODUCTION_PROJECT_REF: z.string().trim().min(8),
  E2E_SUPABASE_URL: z.url(),
  E2E_SUPABASE_ANON_KEY: z.string().trim().min(20),
  E2E_SUPABASE_SERVICE_ROLE_KEY: z.string().trim().min(20),
  E2E_USERNAME: z.string().trim().regex(/^\S+$/),
  E2E_HN_PREFIX: z.string().trim().min(1),
  E2E_ALLOW_MUTATIONS: z.literal("staging-only"),
});

function replaceEnvValue(content: string, name: string, value: string) {
  const pattern = new RegExp(`^${name}=.*$`, "m");
  if (!pattern.test(content)) {
    throw new Error(`Missing ${name} in Phase 5 environment file`);
  }
  return content.replace(pattern, () => `${name}=${value}`);
}

function assertNotPlaceholder(name: string, value: string) {
  if (/replace_with|your_|example|changeme|placeholder/i.test(value)) {
    throw new Error(`${name} still contains a placeholder`);
  }
}

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
  throw new Error("QA user lookup exceeded the supported page limit");
}

async function main() {
  const sourceFile = existsSync(LOCAL_ENV_FILE) ? LOCAL_ENV_FILE : EXAMPLE_ENV_FILE;
  let localContent = readFileSync(sourceFile, "utf8");
  const parsed = provisionEnvSchema.parse(parse(localContent));

  assertNotPlaceholder("E2E_SUPABASE_ANON_KEY", parsed.E2E_SUPABASE_ANON_KEY);
  assertNotPlaceholder("E2E_SUPABASE_SERVICE_ROLE_KEY", parsed.E2E_SUPABASE_SERVICE_ROLE_KEY);

  const linkedRef = readFileSync(LINKED_REF_FILE, "utf8").trim();
  if (linkedRef !== parsed.E2E_STAGING_PROJECT_REF) {
    throw new Error("Refusing provisioning: Supabase CLI is not linked to E2E staging");
  }
  if (linkedRef === parsed.E2E_PRODUCTION_PROJECT_REF) {
    throw new Error("Refusing provisioning: staging ref matches production ref");
  }

  const urlRef = new URL(parsed.E2E_SUPABASE_URL).hostname.replace(/\.supabase\.co$/, "");
  if (urlRef !== linkedRef) {
    throw new Error("Refusing provisioning: E2E Supabase URL does not match the linked staging ref");
  }

  const password = `${randomBytes(24).toString("base64url")}!Qa5`;
  const email = `${parsed.E2E_USERNAME}@app.local`;
  const metadata = {
    username: parsed.E2E_USERNAME,
    prefix: "QA",
    first_name: "Phase 5",
    last_name: "Clinician",
  };

  const admin = createClient(
    parsed.E2E_SUPABASE_URL,
    parsed.E2E_SUPABASE_SERVICE_ROLE_KEY,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );

  let user = await findUserByEmail(admin, email);
  if (user) {
    const { data, error } = await admin.auth.admin.updateUserById(user.id, {
      password,
      email_confirm: true,
      user_metadata: metadata,
    });
    if (error) throw error;
    user = data.user;
  } else {
    const { data, error } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: metadata,
    });
    if (error) throw error;
    user = data.user;
  }

  const { data: profile, error: profileError } = await admin
    .from("users")
    .upsert({
      auth_user_id: user.id,
      username: parsed.E2E_USERNAME,
      prefix: metadata.prefix,
      first_name: metadata.first_name,
      last_name: metadata.last_name,
      role: "clinician",
    }, { onConflict: "username" })
    .select("username,role,auth_user_id")
    .single();
  if (profileError) throw profileError;
  if (profile.role !== "clinician" || profile.auth_user_id !== user.id) {
    throw new Error("QA profile verification failed");
  }

  const loginClient = createClient(parsed.E2E_SUPABASE_URL, parsed.E2E_SUPABASE_ANON_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { error: loginError } = await loginClient.auth.signInWithPassword({ email, password });
  if (loginError) throw loginError;
  const { data: role, error: roleError } = await loginClient.rpc("current_app_role");
  if (roleError) throw roleError;
  if (role !== "clinician") throw new Error(`QA role verification failed: ${String(role)}`);
  await loginClient.auth.signOut();

  localContent = replaceEnvValue(localContent, "E2E_USERNAME", parsed.E2E_USERNAME);
  localContent = replaceEnvValue(localContent, "E2E_PASSWORD", password);
  writeFileSync(LOCAL_ENV_FILE, localContent, { encoding: "utf8", mode: 0o600 });

  if (sourceFile === EXAMPLE_ENV_FILE) {
    let exampleContent = readFileSync(EXAMPLE_ENV_FILE, "utf8");
    exampleContent = replaceEnvValue(
      exampleContent,
      "E2E_SUPABASE_ANON_KEY",
      "replace_with_staging_anon_key",
    );
    exampleContent = replaceEnvValue(
      exampleContent,
      "E2E_SUPABASE_SERVICE_ROLE_KEY",
      "replace_with_staging_service_role_key",
    );
    exampleContent = replaceEnvValue(exampleContent, "E2E_PASSWORD", "replace_with_a_strong_password");
    writeFileSync(EXAMPLE_ENV_FILE, exampleContent, "utf8");
  }

  console.log("Phase 5 QA clinician provisioned and verified on staging.");
  console.log(`Credentials saved to ignored file: ${LOCAL_ENV_FILE}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
