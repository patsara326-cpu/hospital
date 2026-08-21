import { expect, test } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";

import { getPhase5Env } from "./env";

function bangkokDateTimeLocal(date: Date) {
  return new Date(date.getTime() + 7 * 60 * 60 * 1_000).toISOString().slice(0, 16);
}

test("auditor sees staff names, readable audit labels, and server-side time filters", async ({ page }) => {
  const env = getPhase5Env();
  const admin = createClient(
    env.E2E_SUPABASE_URL,
    env.E2E_SUPABASE_SERVICE_ROLE_KEY,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
  const { data: profile, error: profileError } = await admin
    .from("users")
    .select("id,auth_user_id,username,prefix,first_name,last_name,role")
    .eq("username", env.E2E_USERNAME)
    .single();
  if (profileError) throw profileError;
  const auditReference = `${env.E2E_HN_PREFIX}LOG-${Date.now()}`;
  const paginationReference = `${env.E2E_HN_PREFIX}PAGE-${Date.now()}`;
  const seededAuditIds: number[] = [];

  try {
    const { error: roleError } = await admin
      .from("users")
      .update({ role: "auditor" })
      .eq("id", profile.id);
    if (roleError) throw roleError;

    const { data: auditRow, error: auditError } = await admin
      .from("audit_log")
      .insert({
        table_name: "backup",
        operation: "INSERT",
        record_ref: auditReference,
        changed_by: profile.auth_user_id,
        changed_by_username: profile.username,
        changed_role: "auditor",
        changed_fields: ["discharge_date", "last_diagnosis"],
      })
      .select("id")
      .single();
    if (auditError) throw auditError;
    seededAuditIds.push(auditRow.id);

    const { data: paginationRows, error: paginationError } = await admin
      .from("audit_log")
      .insert(Array.from({ length: 51 }, (_, index) => ({
        table_name: "backup",
        operation: "INSERT",
        record_ref: `${paginationReference}-${String(index + 1).padStart(2, "0")}`,
        changed_by: profile.auth_user_id,
        changed_by_username: profile.username,
        changed_role: "auditor",
        changed_fields: ["discharge_date"],
      })))
      .select("id");
    if (paginationError) throw paginationError;
    seededAuditIds.push(...(paginationRows ?? []).map((row) => row.id));

    await page.goto("/login");
    await page.locator('[name="username"]').fill(env.E2E_USERNAME);
    await page.locator('[name="password"]').fill(env.E2E_PASSWORD);
    await page.locator('form button[type="submit"]').click();
    await expect(page).toHaveURL(/\/dashboard$/);

    await page.locator(".legacy-user-badge").click();
    await page.locator('a[href="/admin/logs"]').click();

    await expect(page).toHaveURL(/\/admin\/logs$/);
    await expect(page.getByRole("heading", { name: "ประวัติการใช้งานระบบ" })).toBeVisible();
    await expect(page.getByText("Audit & Activity", { exact: true })).toBeVisible();

    const displayName = [profile.prefix, profile.first_name, profile.last_name].filter(Boolean).join(" ");
    await expect(page.getByText(`${displayName} (@${profile.username})`, { exact: true }).first()).toBeVisible();

    await page.locator("#log-query").fill(auditReference);
    await page.getByRole("button", { name: "ใช้ตัวกรอง" }).click();
    await expect(page).toHaveURL(new RegExp(`query=${encodeURIComponent(auditReference)}`));
    await expect(page.locator("article")).toHaveCount(1);

    const auditEntry = page.locator("article").filter({
      hasText: auditReference,
    });
    await expect(auditEntry).toBeVisible();
    await expect(auditEntry.getByRole("heading", { name: "จำหน่ายผู้ป่วย (backup.insert)" })).toBeVisible();
    await expect(auditEntry).toContainText(`ประวัติจำหน่ายผู้ป่วย: ${auditReference}`);
    await expect(auditEntry).toContainText("ข้อมูลที่เปลี่ยน: วันที่จำหน่าย, การวินิจฉัยครั้งสุดท้าย");

    await page.getByRole("button", { name: "3 ชั่วโมง", exact: true }).click();
    await expect(page).toHaveURL(/preset=3h/);
    await expect(page.getByRole("heading", { name: "จำหน่ายผู้ป่วย (backup.insert)" })).toBeVisible();

    await page.locator("#log-query").fill(paginationReference);
    await page.getByRole("button", { name: "ใช้ตัวกรอง" }).click();
    await expect(page.getByText("51 รายการ", { exact: true })).toBeVisible();
    await page.getByRole("link", { name: "ถัดไป" }).click();
    await expect(page).toHaveURL(/page=2/);
    await expect(page.locator("article")).toHaveCount(1);

    await page.locator('select[name="preset"]').selectOption("custom");
    await expect(page.locator("#log-from")).toBeVisible();
    await expect(page.locator("#log-to")).toBeVisible();
    await page.getByRole("button", { name: "ใช้ตัวกรอง" }).click();
    await expect(page.getByText("กรุณาระบุวันเวลาเริ่มต้น", { exact: true })).toBeVisible();
    await expect(page.getByText("กรุณาระบุวันเวลาสิ้นสุด", { exact: true })).toBeVisible();

    const now = new Date();
    await page.locator("#log-from").fill(bangkokDateTimeLocal(new Date(now.getTime() - 60 * 60 * 1_000)));
    await page.locator("#log-to").fill(bangkokDateTimeLocal(new Date(now.getTime() + 60 * 1_000)));
    await page.getByRole("button", { name: "ใช้ตัวกรอง" }).click();
    await expect(page).toHaveURL(/preset=custom/);
    await expect(page).toHaveURL(/from=/);
    await expect(page).toHaveURL(/to=/);

    await page.setViewportSize({ width: 320, height: 720 });
    await page.goto("/admin/logs?preset=3h");
    await expect(page.getByRole("heading", { name: "ประวัติการใช้งานระบบ" })).toBeVisible();
    const widths = await page.evaluate(() => ({
      client: document.documentElement.clientWidth,
      scroll: document.documentElement.scrollWidth,
    }));
    expect(widths.scroll - widths.client).toBeLessThanOrEqual(1);
  } finally {
    if (seededAuditIds.length) {
      const { error } = await admin.from("audit_log").delete().in("id", seededAuditIds);
      if (error) throw error;
    }
    const { error: activityCleanupError } = await admin
      .from("activity_log")
      .delete()
      .eq("actor_username", env.E2E_USERNAME);
    if (activityCleanupError) throw activityCleanupError;
    const { error: restoreRoleError } = await admin
      .from("users")
      .update({ role: profile.role })
      .eq("id", profile.id);
    if (restoreRoleError) throw restoreRoleError;
    const { error: auditCleanupError } = await admin
      .from("audit_log")
      .delete()
      .eq("table_name", "users")
      .eq("record_ref", profile.username);
    if (auditCleanupError) throw auditCleanupError;
  }
});
