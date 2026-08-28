import { notFound } from "next/navigation";

import IpdList from "@/components/ipd/IpdList";
import { getRequestSupabaseClient } from "@/lib/auth/current-user";
import type { IpdPatientSummary } from "@/lib/ipd/records";
import { observeServerOperation, queryMetrics } from "@/lib/observability/server-performance";

const GENDER_LABELS = { male: "ชาย", female: "หญิง" } as const;
const IPD_PAGE_SIZE = 20;
type IpdTab = "nonsmiv" | "smiv";

const firstValue = (value: string | string[] | undefined) => Array.isArray(value) ? value[0] : value;
function parseTab(value: string | string[] | undefined): IpdTab | null {
  const tab = firstValue(value);
  return tab === "nonsmiv" || tab === "smiv" ? tab : null;
}
function parsePage(value: string | string[] | undefined) {
  const page = Number(firstValue(value));
  return Number.isInteger(page) && page >= 1 && page <= 10_000 ? page : 1;
}

function summaryFromRow(row: {
  id: string | null; hn: string | null; prefix: string | null; full_name: string | null;
  first_name: string | null; last_name: string | null; smi_v_result: string | null;
  admission_date: string | null; admitting_doctor: string | null;
}): IpdPatientSummary | null {
  if (!row.id) return null;
  const splitName = `${row.first_name ?? ""} ${row.last_name ?? ""}`.trim();
  return {
    id: row.id, hn: row.hn ?? "", fullName: splitName || row.full_name || "-",
    smivResult: row.smi_v_result, admissionDate: row.admission_date, admittingDoctor: row.admitting_doctor,
  };
}

async function loadIpdPage(gender: "ชาย" | "หญิง", tab: IpdTab | null, page: number) {
  if (!tab) return { records: [] as IpdPatientSummary[], total: 0, error: null };
  const supabase = await getRequestSupabaseClient();
  if (!supabase) return { records: [] as IpdPatientSummary[], total: 0, error: "ยังไม่ได้ตั้งค่า Supabase environment variables" };
  const offset = (page - 1) * IPD_PAGE_SIZE;
  const result = await observeServerOperation(
    "ipd.list_page",
    () => supabase.from("current_ipd_list_rows")
      .select("id, hn, prefix, full_name, first_name, last_name, smi_v_result, admission_date, admitting_doctor", { count: "exact" })
      .eq("gender", gender).eq("patient_group", tab)
      .order("created_at", { ascending: false }).order("id", { ascending: true })
      .range(offset, offset + IPD_PAGE_SIZE - 1),
    queryMetrics,
  );
  return {
    records: (result.data ?? []).flatMap((row) => { const item = summaryFromRow(row); return item ? [item] : []; }),
    total: result.count ?? 0,
    error: result.error?.message ?? null,
  };
}

export default async function IpdPage({ params, searchParams }: {
  params: Promise<{ gender: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [{ gender: rawGender }, query] = await Promise.all([params, searchParams]);
  if (!(rawGender in GENDER_LABELS)) notFound();
  const gender = GENDER_LABELS[rawGender as keyof typeof GENDER_LABELS];
  const activeTab = parseTab(query.type);
  const page = parsePage(query.page);
  const result = await loadIpdPage(gender, activeTab, page);
  return <IpdList gender={gender} records={result.records} total={result.total} page={page} pageSize={IPD_PAGE_SIZE} activeTab={activeTab} routePath={`/ipd/${rawGender}`} error={result.error} />;
}
