import { notFound } from "next/navigation";

import AdmissionStatistics, {
  type AdmissionStatisticRow,
} from "@/components/statistics/AdmissionStatistics";
import { getRequestSupabaseClient } from "@/lib/auth/current-user";
import {
  loadAdmissionReportPage,
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
  male: { label: "ชาย", title: "สถิติผู้ป่วยรับใหม่หอผู้ป่วยจิตเวชชาย" },
  female: { label: "หญิง", title: "สถิติผู้ป่วยรับใหม่หอผู้ป่วยจิตเวชหญิง" },
} as const;

export default async function AdmissionStatisticsPage({
  params,
  searchParams,
}: PageProps) {
  const [{ gender }, rawFilters] = await Promise.all([params, searchParams]);
  const config = GENDER_CONFIG[gender as keyof typeof GENDER_CONFIG];
  if (!config) notFound();

  const filters = parseStatisticReportFilters(rawFilters);
  const supabase = await getRequestSupabaseClient();
  let rows: AdmissionStatisticRow[] = [];
  let years: number[] = [];
  let total = 0;
  let error: string | null = null;

  if (!supabase) {
    error = "ยังไม่ได้ตั้งค่า Supabase environment variables";
  } else {
    const [reportResult, yearsResult] = await Promise.all([
      loadAdmissionReportPage(supabase, config.label, filters),
      loadReportYears(supabase, "admission", config.label),
    ]);

    if (reportResult.error || yearsResult.error) {
      console.error(
        "Admission server-filtered report failed",
        reportResult.error?.code ?? yearsResult.error?.code ?? "unknown",
      );
      error = "ไม่สามารถโหลดข้อมูลสถิติรับใหม่ได้";
    } else {
      rows = (reportResult.data ?? []).flatMap((entry) => {
        if (!entry.id || !entry.admission_date) return [];
        return [{ ...entry, id: entry.id, admission_date: entry.admission_date }];
      });
      years = yearsResult.years;
      total = reportResult.count ?? 0;
    }
  }

  return (
    <AdmissionStatistics
      genderLabel={config.label}
      title={config.title}
      initialRows={rows}
      total={total}
      years={years}
      filters={filters}
      pageSize={REPORT_PAGE_SIZE}
      routePath={`/statistics/admission/${gender}`}
      error={error}
    />
  );
}
