import { expect, test } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";

import { getPhase5Env } from "./env";

test("auditor can open and filter the privacy-minimized log viewer", async ({ page }) => {
  const env = getPhase5Env();
  const admin = createClient(
    env.E2E_SUPABASE_URL,
    env.E2E_SUPABASE_SERVICE_ROLE_KEY,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
  const { data: profile, error: profileError } = await admin
    .from("users")
    .select("id,role")
    .eq("username", env.E2E_USERNAME)
    .single();
  if (profileError) throw profileError;

  try {
    const { error: roleError } = await admin
      .from("users")
      .update({ role: "auditor" })
      .eq("id", profile.id);
    if (roleError) throw roleError;

    await page.goto("/login");
    await page.locator('[name="username"]').fill(env.E2E_USERNAME);
    await page.locator('[name="password"]').fill(env.E2E_PASSWORD);
    await page.getByRole("button", { name: "เข้าสู่ระบบ", exact: true }).click();
    await expect(page).toHaveURL(/\/dashboard$/);

    await page.locator(".legacy-user-badge").click();
    await expect(page.getByRole("link", { name: "ประวัติการใช้งาน" })).toBeVisible();
    await page.getByRole("link", { name: "ประวัติการใช้งาน" }).click();

    await expect(page).toHaveURL(/\/admin\/logs$/);
    await expect(page.getByRole("heading", { name: "ประวัติการใช้งานระบบ" })).toBeVisible();
    await expect(page.getByText("Audit & Activity", { exact: true })).toBeVisible();
    await expect(page.locator("#log-query")).toBeVisible();
  } finally {
    await admin.from("users").update({ role: profile.role }).eq("id", profile.id);
    await admin.from("activity_log").delete().eq("actor_username", env.E2E_USERNAME);
  }
});
