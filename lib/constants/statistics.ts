import { NON_SMIV_VALUE } from "./admission.ts";

export const STATISTIC_MONTHS = [
  "มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน",
  "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม",
] as const;

export const STATISTIC_SMI_OPTIONS = [
  "SMI-V", NON_SMIV_VALUE,
] as const;

export function matchesStatisticSmiFilter(
  value: string | null | undefined,
  filter: string,
): boolean {
  if (!filter) return true;
  const normalized = value?.trim() ?? "";
  if (filter === NON_SMIV_VALUE) return normalized === NON_SMIV_VALUE;
  if (filter === "SMI-V") return normalized.startsWith("SMI-V");
  return false;
}

export const STATISTIC_RESIDENCE_OPTIONS = [
  "นอกเขตอำเภอเมืองชลบุรี", "ในเขตอำเภอเมืองชลบุรี", "นอกจังหวัด", "เร่ร่อน",
] as const;
