import IncidentStatistics, { type IncidentStatisticRow } from "@/components/statistics/IncidentStatistics";
import { getRequestSupabaseClient } from "@/lib/auth/current-user";
import { observeServerOperation, queryMetrics } from "@/lib/observability/server-performance";
import { loadIncidentReportPage, loadReportYears } from "@/lib/statistics/report-data";
import { INCIDENT_PAGE_SIZE, parseIncidentReportFilters } from "@/lib/statistics/report-filters";

function rowFromView(row: {
  id: string | null; hn: string | null; record_date: string | null; level: string | null;
  full_name: string | null; gender: string | null; smi_type: string | null;
}): IncidentStatisticRow | null {
  if (!row.id) return null;
  return {
    id: row.id, hn: row.hn ?? "", record_date: row.record_date, level: row.level,
    full_name: row.full_name ?? "-", gender: row.gender ?? "", smi_type: row.smi_type ?? "-",
  };
}

export default async function IncidentStatisticsPage({ searchParams }: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const filters = parseIncidentReportFilters(await searchParams);
  const supabase = await getRequestSupabaseClient();
  if (!supabase) return <IncidentStatistics initialRows={[]} total={0} years={[]} filters={filters} pageSize={INCIDENT_PAGE_SIZE} routePath="/statistics/incidents" error="ยังไม่ได้ตั้งค่า Supabase environment variables" />;

  const [pageResult, yearsResult] = await Promise.all([
    observeServerOperation("incidents.list_page", () => loadIncidentReportPage(supabase, filters), queryMetrics),
    observeServerOperation("incidents.year_options", () => loadReportYears(supabase, "incidents")),
  ]);
  const error = pageResult.error?.message ?? yearsResult.error?.message ?? null;
  return <IncidentStatistics
    initialRows={(pageResult.data ?? []).flatMap((row) => { const item = rowFromView(row); return item ? [item] : []; })}
    total={pageResult.count ?? 0} years={Array.from(new Set(yearsResult.years))} filters={filters}
    pageSize={INCIDENT_PAGE_SIZE} routePath="/statistics/incidents" error={error}
  />;
}
