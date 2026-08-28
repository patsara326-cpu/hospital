import { notFound } from "next/navigation";

import DischargeStatistics, {
  type DischargeStatisticRow,
} from "@/components/statistics/DischargeStatistics";
import { getRequestSupabaseClient } from "@/lib/auth/current-user";
import {
  loadDischargeReportPage,
  loadReportYears,
} from "@/lib/statistics/report-data";
import {
  parseStatisticReportFilters,
  REPORT_PAGE_SIZE,
} from "@/lib/statistics/report-filters";

type PageProps = {
  params: Promise<{ gender: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

const GENDER_CONFIG = {
  male: { label: "ชาย", title: "สถิติผู้ป่วยจำหน่ายหอผู้ป่วยจิตเวชชาย" },
  female: { label: "หญิง", title: "สถิติผู้ป่วยจำหน่ายหอผู้ป่วยจิตเวชหญิง" },
} as const;

export default async function DischargeStatisticsPage({
  params,
  searchParams,
}: PageProps) {
  const [{ gender }, rawFilters] = await Promise.all([params, searchParams]);
  const config = GENDER_CONFIG[gender as keyof typeof GENDER_CONFIG];
  if (!config) notFound();

  const filters = parseStatisticReportFilters(rawFilters);
  const supabase = await getRequestSupabaseClient();
  let rows: DischargeStatisticRow[] = [];
  let years: number[] = [];
  let total = 0;
  let error: string | null = null;

  if (!supabase) {
    error = "ยังไม่ได้ตั้งค่า Supabase environment variables";
  } else {
    const [reportResult, yearsResult] = await Promise.all([
      loadDischargeReportPage(supabase, config.label, filters),
      loadReportYears(supabase, "discharge", config.label),
    ]);

    if (reportResult.error || yearsResult.error) {
      console.error(
        "Discharge server-filtered report failed",
        reportResult.error?.code ?? yearsResult.error?.code ?? "unknown",
      );
      error = "ไม่สามารถโหลดข้อมูลสถิติจำหน่ายได้";
    } else {
      rows = (reportResult.data ?? []).flatMap((entry) => {
        if (!entry.id || !entry.discharge_date) return [];
        return [{ ...entry, id: entry.id, discharge_date: entry.discharge_date }];
      });
      years = yearsResult.years;
      total = reportResult.count ?? 0;
    }
  }

  return (
    <DischargeStatistics
      genderLabel={config.label}
      title={config.title}
      initialRows={rows}
      total={total}
      years={years}
      filters={filters}
      pageSize={REPORT_PAGE_SIZE}
      routePath={`/statistics/discharge/${gender}`}
      error={error}
    />
  );
}
