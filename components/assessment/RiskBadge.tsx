import type { RiskCategory } from "@/lib/utils/risk";
import { RISK_COLORS } from "@/lib/utils/risk";

type RiskBadgeProps = {
  risk: RiskCategory;
};

export default function RiskBadge({ risk }: RiskBadgeProps) {
  return <span className={`font-semibold ${RISK_COLORS[risk]}`}>ระดับความเสี่ยง: {risk}</span>;
}
