import { getPhase5Env } from "./env.ts";

try {
  const env = getPhase5Env();
  console.log("Phase 5 environment: READY");
  console.log(`- local app: ${env.E2E_BASE_URL}`);
  console.log(`- staging project ref: ${env.E2E_STAGING_PROJECT_REF}`);
  console.log(`- production separation: verified`);
  console.log(`- QA clinician: configured`);
  console.log(`- synthetic HN prefix: ${env.E2E_HN_PREFIX}`);
  console.log(`- exact-HN cleanup credential: configured`);
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
}
