import { config } from "dotenv";
import { z } from "zod";

const LOCAL_HOSTS = new Set(["127.0.0.1", "localhost"]);
const configuredValue = (label: string, minimumLength = 8) => z.string()
  .trim()
  .min(minimumLength)
  .refine((value) => !value.startsWith("replace_with_"), `${label} ยังเป็น placeholder`);

export function loadPhase5EnvFile() {
  config({
    path: process.env.E2E_ENV_FILE ?? "phase5.e2e.env.local",
    override: true,
    quiet: true,
  });
}

const phase5EnvSchema = z.object({
  E2E_BASE_URL: z.url(),
  E2E_STAGING_PROJECT_REF: configuredValue("E2E_STAGING_PROJECT_REF"),
  E2E_PRODUCTION_PROJECT_REF: configuredValue("E2E_PRODUCTION_PROJECT_REF"),
  E2E_SUPABASE_URL: z.url(),
  E2E_SUPABASE_ANON_KEY: configuredValue("E2E_SUPABASE_ANON_KEY", 20),
  E2E_SUPABASE_SERVICE_ROLE_KEY: configuredValue("E2E_SUPABASE_SERVICE_ROLE_KEY", 20),
  E2E_USERNAME: z.string().trim().min(1),
  E2E_PASSWORD: configuredValue("E2E_PASSWORD"),
  E2E_HN_PREFIX: z.string().trim().regex(
    /^(E2E|QA|TEST)-[A-Z0-9-]{1,16}$/,
    "ต้องขึ้นต้นด้วย E2E-, QA- หรือ TEST- และลงท้ายด้วย -",
  ),
  E2E_ALLOW_MUTATIONS: z.literal("staging-only"),
}).superRefine((values, context) => {
  const baseHost = new URL(values.E2E_BASE_URL).hostname;
  if (!LOCAL_HOSTS.has(baseHost)) {
    context.addIssue({
      code: "custom",
      path: ["E2E_BASE_URL"],
      message: "Phase 5 harness อนุญาตเฉพาะ local app ที่ชี้ไป staging เท่านั้น",
    });
  }

  if (values.E2E_STAGING_PROJECT_REF === values.E2E_PRODUCTION_PROJECT_REF) {
    context.addIssue({
      code: "custom",
      path: ["E2E_STAGING_PROJECT_REF"],
      message: "staging project ref ต้องไม่ซ้ำกับ production project ref",
    });
  }

  const supabaseHost = new URL(values.E2E_SUPABASE_URL).hostname;
  const projectRef = supabaseHost.endsWith(".supabase.co")
    ? supabaseHost.slice(0, -".supabase.co".length)
    : "";
  if (projectRef !== values.E2E_STAGING_PROJECT_REF) {
    context.addIssue({
      code: "custom",
      path: ["E2E_SUPABASE_URL"],
      message: "Supabase URL ต้องตรงกับ E2E_STAGING_PROJECT_REF",
    });
  }
});

export type Phase5Env = z.infer<typeof phase5EnvSchema>;

export function getPhase5Env(): Phase5Env {
  loadPhase5EnvFile();
  const parsed = phase5EnvSchema.safeParse(process.env);
  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((issue) => `- ${issue.path.join(".")}: ${issue.message}`)
      .join("\n");
    throw new Error(`Phase 5 environment ยังไม่พร้อม:\n${issues}`);
  }
  return parsed.data;
}

export function createSyntheticHn(prefix: string) {
  const timestamp = new Date().toISOString().replace(/\D/g, "").slice(2, 14);
  return `${prefix}${timestamp}`;
}
