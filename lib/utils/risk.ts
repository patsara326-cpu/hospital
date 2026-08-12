export type RiskCategory = "Critical" | "Severe" | "Moderate" | "Mild";

/** Keep the legacy PHUA/G-HARD calculation unchanged. */
export function calculateRisk(scores: number[]): RiskCategory {
  const count7 = scores.filter((score) => score === 7).length;
  const count5 = scores.filter((score) => score === 5).length;
  if (count7 >= 1 || count5 >= 3) return "Critical";
  if (count5 === 2) return "Severe";
  if (count5 === 1) return "Moderate";
  return "Mild";
}

export const RISK_COLORS: Record<RiskCategory, string> = {
  Critical: "text-red-600",
  Severe: "text-orange-600",
  Moderate: "text-amber-600",
  Mild: "text-emerald-600",
};
