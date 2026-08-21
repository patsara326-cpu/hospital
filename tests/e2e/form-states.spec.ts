import { expect, test, type Page } from "@playwright/test";

import { NON_SMIV_VALUE } from "../../lib/constants/admission";
import { getPhase5Env, type Phase5Env } from "./env";

async function login(page: Page, env: Phase5Env) {
  await page.goto("/login");
  await page.locator('[name="username"]').fill(env.E2E_USERNAME);
  await page.locator('[name="password"]').fill(env.E2E_PASSWORD);
  await page.locator('form button[type="submit"]').click();
  await expect(page).toHaveURL(/\/dashboard$/);
}

test("authentication forms expose validation, loading, and error states", async ({ page }) => {
  await page.goto("/login");
  const loginForm = page.locator("main form");
  await loginForm.locator('button[type="submit"]').click();
  await expect(loginForm.locator('[aria-invalid="true"]')).toHaveCount(2);
  await expect(loginForm.locator(".text-destructive")).toHaveCount(2);

  await page.locator('main button[type="button"]').click();
  const dialog = page.getByRole("dialog");
  await dialog.locator('button[type="submit"]').click();
  await expect(dialog.locator(".text-destructive")).toHaveCount(6);
  await page.keyboard.press("Escape");
  await expect(dialog).toHaveCount(0);

  let releaseRequest: (() => void) | undefined;
  const requestGate = new Promise<void>((resolve) => { releaseRequest = resolve; });
  await page.route("**/login", async (route) => {
    if (route.request().method() === "POST") await requestGate;
    await route.continue();
  });
  await page.locator('[name="username"]').fill(`missing_${Date.now()}`);
  await page.locator('[name="password"]').fill("invalid-password");
  const submitButton = loginForm.locator('button[type="submit"]');
  await submitButton.click();
  await expect(submitButton).toBeDisabled();
  releaseRequest?.();
  await expect(loginForm.locator('[role="alert"]')).toBeVisible();
});

test("clinical forms expose validation and empty-result states", async ({ page }) => {
  await login(page, getPhase5Env());

  await test.step("new patient wizard blocks an empty first step", async () => {
    await page.goto("/patients/new");
    await page.locator("main form button").filter({ hasText: /.+/ }).last().click();
    await expect(page.locator("main form .text-destructive").first()).toBeVisible();
  });

  await test.step("new patient address step keeps items 1 and 4-7 visible", async () => {
    await page.goto("/patients/new");
    await page.locator('[name="firstName"]').fill("ทดสอบเงื่อนไข");
    await page.locator('[name="lastName"]').fill("ที่อยู่");
    await page.locator('[name="gender"]').selectOption("ชาย");
    await page.locator('[name="age"]').fill("30");
    await page.locator('[name="hn"]').fill(`UI-${Date.now()}`);
    await page.getByRole("button", { name: "ถัดไป" }).click();
    await page.locator(`[name="smiV"][value="${NON_SMIV_VALUE}"]`).check();
    await page.getByRole("button", { name: "ถัดไป" }).click();

    for (const name of [
      "residenceType",
      "caregiverStatus",
      "diagnosis",
      "admissionSource",
      "admittingDoctor",
    ]) {
      await expect(page.locator(`[name="${name}"]`)).toBeVisible();
    }
    await expect(page.locator('[name="residenceDistrict"]')).toHaveCount(0);

    await page.locator('[name="residenceType"]').selectOption("มีที่อยู่เป็นหลักแหล่ง");
    await expect(page.locator('[name="residenceDistrict"]')).toBeVisible();
    await page.locator('[name="residenceDistrict"]').selectOption("นอกจังหวัด");
    await page.locator('[name="residenceDetails"]').fill("ค่าที่ต้องถูกล้างเมื่อซ่อน");

    await page.locator('[name="residenceType"]').selectOption("เร่ร่อน/อยู่สถานสงเคราะห์");
    await expect(page.locator('[name="residenceDistrict"]')).toHaveCount(0);
    await page.locator('[name="residenceType"]').selectOption("มีที่อยู่เป็นหลักแหล่ง");
    await expect(page.locator('[name="residenceDistrict"]')).toHaveValue("");
    await expect(page.locator('[name="residenceDetails"]')).toHaveValue("");
  });

  for (const route of ["/patients/edit", "/patients/discharge", "/ior"] as const) {
    await test.step(`${route} requires an HN before searching`, async () => {
      await page.goto(route);
      const form = page.locator("main form").first();
      await form.locator('button[type="submit"], button[type="button"]').filter({ hasText: /.+/ }).first().click();
      await expect(page.locator("main .text-destructive").first()).toBeVisible();
    });
  }

  await test.step("history uses native required validation and renders an empty-state row", async () => {
    await page.goto("/history");
    const hn = page.locator('[name="hn"]');
    await page.locator('main form button[type="submit"]').click();
    await expect(hn).toHaveJSProperty("validity.valid", false);
    await expect(page.locator("main tbody tr")).toHaveCount(1);
    await expect(page.locator("main tbody td[colspan]")).toBeVisible();
  });

  for (const route of ["/ipd/male", "/ipd/female"] as const) {
    await test.step(`${route} renders data or an explicit empty state after choosing a group`, async () => {
      await page.goto(route);
      for (const group of ["Non SMIV", "SMIV"] as const) {
        await page.getByRole("button", { name: group, exact: true }).click();
        const content = page.locator("main section article, main section p.rounded-xl");
        await expect(content.first()).toBeVisible();
        expect(await content.count()).toBeGreaterThan(0);
      }
    });
  }

  for (const route of [
    "/statistics/admission/male",
    "/statistics/admission/female",
    "/statistics/discharge/male",
    "/statistics/discharge/female",
    "/statistics/incidents",
  ] as const) {
    await test.step(`${route} always renders either data or an explicit empty state`, async () => {
      await page.goto(route);
      const rows = page.locator("main tbody tr");
      await expect(rows.first()).toBeVisible();
      expect(await rows.count()).toBeGreaterThan(0);
    });
  }
});
