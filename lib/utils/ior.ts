import type { Json } from "@/types/database.types";

export function formatIorBehaviors(value: Json | null | undefined): string {
  if (typeof value === "string") return value.trim() || "-";
  if (!Array.isArray(value)) return "-";

  const behaviors = value.flatMap((item) =>
    typeof item === "string" && item.trim() ? [item.trim()] : [],
  );
  return behaviors.join(", ") || "-";
}
