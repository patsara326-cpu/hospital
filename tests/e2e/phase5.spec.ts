import { expect, test, type Page } from "@playwright/test";

import { cleanupSyntheticPatient } from "./cleanup";
import { createSyntheticHn, getPhase5Env, type Phase5Env } from "./env";
import { todayISOInThailand } from "../../lib/utils/date";

async function login(page: Page, env: Phase5Env) {
  await page.goto("/login");
  await page.locator('[name="username"]').fill(env.E2E_USERNAME);
  await page.locator('[name="password"]').fill(env.E2E_PASSWORD);
  await page.getByRole("button", { name: "เข้าสู่ระบบ", exact: true }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
}

test("authenticated clinical lifecycle and exports", async ({ page }) => {
  const env = getPhase5Env();
  const hn = createSyntheticHn(env.E2E_HN_PREFIX);

  try {
    await login(page, env);

    await test.step("register a synthetic patient", async () => {
      await page.goto("/patients/new");
      await page.locator('[name="firstName"]').fill("ทดสอบระบบ");
      await page.locator('[name="lastName"]').fill("PhaseFive");
      await page.locator('[name="gender"]').selectOption("ชาย");
      await page.locator('[name="age"]').fill("35");
      await page.locator('[name="hn"]').fill(hn);
      await page.getByRole("button", { name: "ถัดไป" }).click();

      await page.locator('[name="smiV"][value="SMI-V 1"]').check();
      await page.getByRole("button", { name: "ถัดไป" }).click();

      await page.locator('[name="oasScore"][value="1"]').check();
      await page.getByRole("button", { name: "ถัดไป" }).click();
      await page
        .getByRole("dialog")
        .getByRole("button", { name: "ไปต่อ", exact: true })
        .click();

      await page.locator('[name="aggressiveBehavior"]').fill("ข้อมูลสังเคราะห์สำหรับ E2E");
      await page.locator('[name="substanceUse"]').selectOption("ไม่ใช้");
      await page.locator('[name="readmit28"]').selectOption("ไม่ใช่");
      await page.locator('[name="admit3times"]').selectOption("ไม่ใช่");
      await page.getByRole("button", { name: "ถัดไป" }).click();

      await page.locator('[name="residenceType"]').selectOption("มีที่อยู่เป็นหลักแหล่ง");
      await page.locator('[name="residenceDistrict"]').selectOption("นอกจังหวัด");
      await page.locator('[name="residenceDetails"]').fill("ที่อยู่สังเคราะห์ ห้ามใช้รักษาจริง");
      await page.locator('[name="caregiverStatus"]').selectOption("อยู่คนเดียว");
      await page.locator('[name="patientPhone"]').fill("0000000000");
      await page.locator('[name="diagnosis"]').selectOption("Schizophrenia");
      await page.locator('[name="admissionSource"]').selectOption("รับจาก ER");
      await page.locator('[name="admissionDate"]').fill(todayISOInThailand());
      await page.locator('[name="admittingDoctor"]').selectOption({ index: 1 });
      await page
        .getByRole("main")
        .getByRole("button", { name: "บันทึกข้อมูล", exact: true })
        .click();
      await expect(page.getByText("บันทึกประเมินเรียบร้อย")).toBeVisible();
      await page.getByRole("button", { name: "ลงทะเบียนรายใหม่", exact: true }).click();
      await expect(page.locator('[name="firstName"]')).toHaveValue("");
      await expect(page.locator('[name="hn"]')).toHaveValue("");
    });

    await test.step("edit the patient", async () => {
      await page.goto("/patients/edit");
      await page.locator('form').first().locator("input").fill(hn);
      await page.getByRole("button", { name: "ค้นหา", exact: true }).click();
      await expect(page.locator('[name="hn"]')).toHaveValue(hn);
      await expect(page.locator('[name="age"]')).toHaveAttribute("type", "number");
      await expect(page.locator('[name="gender"]')).toHaveJSProperty("tagName", "SELECT");
      await expect(page.locator('[name="diagnosis"]')).toHaveJSProperty("tagName", "SELECT");
      await expect(page.locator('[name="admissionSource"]')).toHaveJSProperty("tagName", "SELECT");
      await expect(page.locator('[name="admittingDoctor"]')).toHaveJSProperty("tagName", "SELECT");
      await expect(page.locator('[name="smiV"]')).toHaveCount(5);
      await page.locator('[name="patientPhone"]').fill("0000000001");
      await page
        .getByRole("main")
        .getByRole("button", { name: "บันทึกข้อมูล", exact: true })
        .click();
      await expect(page.getByText("บันทึกข้อมูลผู้ป่วยเรียบร้อยแล้ว")).toBeVisible();
      await expect(page.getByRole("main").locator("form").first().locator("input")).toHaveValue("");
      await expect(page.locator('[name="patientPhone"]')).toHaveCount(0);

      await page.locator("#edit-patient-hn-search").fill(hn);
      await page.getByRole("button", { name: "ค้นหา", exact: true }).click();
      await expect(page.locator('[name="patientPhone"]')).toHaveValue("0000000001");
      await expect(page.locator('[name="diagnosis"]')).toHaveValue("Schizophrenia");
      await expect(page.locator('[name="admissionSource"]')).toHaveValue("รับจาก ER");
    });

    await test.step("save a shift assessment", async () => {
      await page.goto("/assessment");
      await page.getByRole("button", { name: "ผู้ป่วยชาย" }).click();
      const patientButton = page.getByRole("button").filter({ hasText: hn });
      await expect(patientButton).toBeVisible();
      await patientButton.click();
      await page.locator('[name="shift"]').selectOption({ index: 1 });
      await page.locator('[name="oasScore"][value="1"]').check();
      for (const scale of ["PHUA", "G-HARD"]) {
        const count = scale === "PHUA" ? 4 : 5;
        for (let index = 0; index < count; index += 1) {
          await page.locator(`input[name="${scale}-${index}"][value="1"]`).check();
        }
      }
      await page.getByRole("button", { name: "บันทึกผลการประเมิน" }).click();
      await expect(page.getByText("บันทึกผลประเมินสำเร็จ")).toBeVisible();
      await expect(page.locator('[name="shift"]')).toHaveCount(0);
    });

    await test.step("save an IOR record", async () => {
      await page.goto("/ior");
      await page.locator('[name="hn"]').fill(hn);
      await page.getByRole("button", { name: "ค้นหา", exact: true }).click();
      await expect(page.getByText(`HN: ${hn}`)).toBeVisible();
      await page.locator('[name="behaviors"]').first().check();
      await page.locator('[name="level"][value="B"]').check();
      await page
        .getByRole("main")
        .getByRole("button", { name: "บันทึกข้อมูล", exact: true })
        .click();
      await expect(page.getByText("บันทึกข้อมูลสำเร็จ")).toBeVisible();
      await expect(page.locator('[name="hn"]')).toHaveValue("");
      await expect(page.locator('[name="behaviors"]')).toHaveCount(0);
    });

    await test.step("download all statistics workbooks", async () => {
      for (const route of [
        "/statistics/admission/male",
        "/statistics/discharge/male",
        "/statistics/incidents",
      ]) {
        await page.goto(route);
        const smiFilter = page.getByLabel("ประเภทผู้ป่วย (SMI-V)");
        await expect(smiFilter.locator("option")).toHaveText([
          "ทั้งหมด",
          "SMI-V",
          "ไม่เข้าข่าย SMI-V",
        ]);
        await smiFilter.selectOption("SMI-V");
        if (route !== "/statistics/discharge/male") {
          await expect(page.getByRole("main").getByText(hn, { exact: true })).toBeVisible();
        }
        const downloadPromise = page.waitForEvent("download");
        await page.getByRole("button", { name: /ดาวน์โหลด Excel/ }).click();
        const download = await downloadPromise;
        expect(download.suggestedFilename()).toMatch(/\.xlsx$/);
      }
    });

    await test.step("discharge the synthetic patient", async () => {
      await page.goto("/patients/discharge");
      await page.locator('[name="hn"]').fill(hn);
      await page.getByRole("button", { name: "ค้นหา", exact: true }).click();
      await expect(page.locator('[name="dischargeMethod"]')).toBeVisible();
      await page.locator('[name="dischargeMethod"]').selectOption("แพทย์อนุญาต");
      await page.locator('[name="lastDiagnosis"]').fill("F20.99 E2E synthetic discharge");
      await page.locator('[name="dischargeType"]').first().check();
      await page.getByRole("button", { name: "บันทึกการจำหน่าย" }).click();
      await expect(page.getByText("จำหน่ายผู้ป่วยเรียบร้อยแล้ว")).toBeVisible();
      await expect(page.locator('[name="hn"]')).toHaveValue("");
      await expect(page.locator('[name="dischargeMethod"]')).toHaveCount(0);

      await page.goto("/statistics/discharge/male");
      await page.getByLabel("ประเภทผู้ป่วย (SMI-V)").selectOption("SMI-V");
      await expect(page.getByRole("main").getByText(hn, { exact: true })).toBeVisible();
      await page.goto("/statistics/incidents");
      await page.getByLabel(/SMI-V/).selectOption("SMI-V");
      const archivedIorRow = page.locator("tbody tr").filter({ hasText: hn });
      await expect(archivedIorRow).toBeVisible();
      await expect(archivedIorRow).toContainText("PhaseFive");

      await page.goto("/history");
      await page.locator('[name="hn"]').fill(hn);
      await page.getByRole("button", { name: "ค้นหา", exact: true }).click();
      await expect(page.getByText(hn, { exact: true })).toBeVisible();
      await expect(page.getByRole("main")).toContainText("F20.99 E2E synthetic discharge");
    });
  } finally {
    await cleanupSyntheticPatient(env, hn);
  }
});
