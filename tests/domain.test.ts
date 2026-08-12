import assert from "node:assert/strict";
import test from "node:test";

import { formatDateBE, formatDateLongBE } from "../lib/utils/date.ts";
import { calculateRisk } from "../lib/utils/risk.ts";

test("calculateRisk preserves the legacy PHUA/G-HARD thresholds", () => {
  assert.equal(calculateRisk([]), "Mild");
  assert.equal(calculateRisk([1, 3, 5, 3]), "Moderate");
  assert.equal(calculateRisk([5, 5, 3, 1]), "Severe");
  assert.equal(calculateRisk([5, 5, 5, 1]), "Critical");
  assert.equal(calculateRisk([7, 1, 1, 1]), "Critical");
});

test("formatDateBE uses the Thai Buddhist Era and stable date-only parsing", () => {
  assert.equal(formatDateBE("2024-01-02"), "02/01/2567");
  assert.equal(formatDateBE("2024-12-31T12:00:00Z"), "31/12/2567");
  assert.equal(formatDateBE(null, "ไม่ระบุ"), "ไม่ระบุ");
  assert.equal(formatDateBE("not-a-date"), "-");
});

test("formatDateLongBE uses Thai month names and Buddhist Era", () => {
  assert.equal(formatDateLongBE("2024-01-02"), "2 มกราคม 2567");
  assert.equal(formatDateLongBE(undefined), "");
});
