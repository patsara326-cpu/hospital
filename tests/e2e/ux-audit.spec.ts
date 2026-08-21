import { expect, test, type Page } from "@playwright/test";

import { getPhase5Env, type Phase5Env } from "./env";

const VIEWPORTS = [
  { name: "mobile-320", width: 320, height: 720 },
  { name: "mobile-375", width: 375, height: 812 },
  { name: "tablet-768", width: 768, height: 1024 },
  { name: "laptop-1024", width: 1024, height: 768 },
  { name: "desktop-1440", width: 1440, height: 900 },
] as const;

const ROUTES = [
  "/dashboard",
  "/patients/new",
  "/patients/edit",
  "/patients/discharge",
  "/assessment",
  "/ior",
  "/history",
  "/ipd/male",
  "/ipd/female",
  "/statistics/admission/male",
  "/statistics/admission/female",
  "/statistics/discharge/male",
  "/statistics/discharge/female",
  "/statistics/incidents",
] as const;

type AuditIssue = {
  route: string;
  viewport: string;
  detail: string;
};

async function login(page: Page, env: Phase5Env) {
  await page.goto("/login");
  await page.locator('[name="username"]').fill(env.E2E_USERNAME);
  await page.locator('[name="password"]').fill(env.E2E_PASSWORD);
  await page.locator('form button[type="submit"]').click();
  await expect(page).toHaveURL(/\/dashboard$/);
}

async function unnamedInteractiveElements(page: Page) {
  return page.locator("button, a[href], input:not([type=hidden]), select, textarea").evaluateAll((elements) => {
    function referencedText(element: Element, attribute: string) {
      return (element.getAttribute(attribute) ?? "")
        .split(/\s+/)
        .map((id) => document.getElementById(id)?.textContent?.trim() ?? "")
        .filter(Boolean)
        .join(" ");
    }

    function hasName(element: Element) {
      if (element.getAttribute("aria-label")?.trim()) return true;
      if (referencedText(element, "aria-labelledby")) return true;
      if (element.getAttribute("title")?.trim()) return true;

      const id = element.getAttribute("id");
      if (id && document.querySelector(`label[for="${CSS.escape(id)}"]`)?.textContent?.trim()) return true;
      if (element.closest("label")?.textContent?.trim()) return true;

      if (element instanceof HTMLButtonElement || element instanceof HTMLAnchorElement) {
        return Boolean(element.textContent?.trim());
      }
      return false;
    }

    return elements
      .filter((element) => {
        const htmlElement = element as HTMLElement;
        const style = window.getComputedStyle(htmlElement);
        return element.getAttribute("aria-hidden") !== "true"
          && style.display !== "none"
          && style.visibility !== "hidden"
          && htmlElement.getClientRects().length > 0
          && !hasName(element);
      })
      .map((element) => element.outerHTML.slice(0, 220));
  });
}

test("all authenticated routes stay usable at target viewports", async ({ page }) => {
  test.setTimeout(300_000);
  const issues: AuditIssue[] = [];
  const pageErrors: string[] = [];
  const tableMeasurements: string[] = [];
  page.on("pageerror", (error) => pageErrors.push(error.message));

  await login(page, getPhase5Env());

  for (const viewport of VIEWPORTS) {
    await page.setViewportSize({ width: viewport.width, height: viewport.height });

    for (const route of ROUTES) {
      await page.goto(route, { waitUntil: "domcontentloaded" });
      await expect(page.locator("main")).toBeVisible();
      await expect(page.locator("main h1, main h2").first()).toBeVisible();
      if (await page.locator("main h1").count() === 0) {
        issues.push({ route, viewport: viewport.name, detail: "page is missing an h1 heading" });
      }

      const layout = await page.evaluate(() => ({
        clientWidth: document.documentElement.clientWidth,
        scrollWidth: document.documentElement.scrollWidth,
      }));
      if (layout.scrollWidth - layout.clientWidth > 1) {
        issues.push({
          route,
          viewport: viewport.name,
          detail: `page-level horizontal overflow ${layout.scrollWidth}px > ${layout.clientWidth}px`,
        });
      }

      for (const element of await unnamedInteractiveElements(page)) {
        issues.push({ route, viewport: viewport.name, detail: `unnamed control: ${element}` });
      }

      if (route.startsWith("/statistics/") && viewport.width < 768) {
        const measurement = await page.locator("table").first().evaluate((table) => {
          const wrapper = table.parentElement;
          return {
            tableWidth: table.scrollWidth,
            wrapperWidth: wrapper?.clientWidth ?? 0,
            wrapperScrollWidth: wrapper?.scrollWidth ?? 0,
          };
        });
        tableMeasurements.push(`${viewport.name} ${route}: ${JSON.stringify(measurement)}`);
      }
    }

    if (viewport.width < 768) {
      await page.goto("/dashboard");
      const menuButton = page.locator('button[aria-controls="main-navigation"]');
      await expect(menuButton).toBeVisible();
      await menuButton.click();
      await expect(menuButton).toHaveAttribute("aria-expanded", "true");
      await expect(page.locator("#main-navigation")).toBeVisible();
      await page.keyboard.press("Escape");
      await expect(menuButton).toHaveAttribute("aria-expanded", "false");
      await expect(menuButton).toBeFocused();
    }
  }

  console.log(`Statistics mobile table measurements:\n${tableMeasurements.join("\n")}`);
  expect(pageErrors, "uncaught browser errors").toEqual([]);
  expect(issues, "responsive/accessibility audit issues").toEqual([]);
});

test("navbar menu labels use consistent typography", async ({ page }) => {
  await login(page, getPhase5Env());

  for (const viewport of [
    { width: 375, height: 812, expectedSize: "16px" },
    { width: 1440, height: 900, expectedSize: "14px" },
  ]) {
    await page.setViewportSize(viewport);
    await page.goto("/dashboard");

    const typography = await page
      .locator("#main-navigation .legacy-nav-item, #main-navigation .legacy-dropdown-item, #main-navigation .legacy-subgroup-trigger")
      .evaluateAll((elements) => elements.map((element) => {
        const style = window.getComputedStyle(element);
        return {
          family: style.fontFamily,
          size: style.fontSize,
          weight: style.fontWeight,
          lineHeight: style.lineHeight,
        };
      }));

    expect(new Set(typography.map((item) => item.family)).size).toBe(1);
    expect(new Set(typography.map((item) => item.size))).toEqual(new Set([viewport.expectedSize]));
    expect(new Set(typography.map((item) => item.weight))).toEqual(new Set(["600"]));
    expect(new Set(typography.map((item) => item.lineHeight))).toEqual(new Set(["24px"]));
  }
});
