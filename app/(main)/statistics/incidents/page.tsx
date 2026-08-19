import IncidentStatistics, {
  type IncidentStatisticRow,
} from "@/components/statistics/IncidentStatistics";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type IorRecord = { id?: unknown; hn: unknown; record_date: unknown; level: unknown };
type PatientRecord = { hn: unknown; full_name: unknown; gender: unknown; smi_type: unknown };

function textValue(value: unknown): string | null {
  return typeof value === "string" || typeof value === "number" ? String(value) : null;
}

function rowFromView(record: Record<string, unknown>, index: number): IncidentStatisticRow {
  const hn = textValue(record.hn) ?? "";
  return {
    id: textValue(record.id) ?? `${hn}-${textValue(record.record_date) ?? "unknown"}-${index}`,
    hn,
    record_date: textValue(record.record_date),
    level: textValue(record.level),
    full_name: textValue(record.full_name) ?? "-",
    gender: textValue(record.gender) ?? "",
    smi_type: textValue(record.smi_type) ?? "-",
  };
}

async function loadLegacyRows(supabase: NonNullable<Awaited<ReturnType<typeof createSupabaseServerClient>>>) {
  const { data: iorData, error: iorError } = await supabase
    .from("ior_records")
    .select("id, hn, record_date, level");
  if (iorError) return { rows: [] as IncidentStatisticRow[], error: iorError.message };

  const iorRows = (iorData ?? []) as IorRecord[];
  const hns = Array.from(new Set(iorRows.map((record) => textValue(record.hn)).filter((hn): hn is string => Boolean(hn))));
  if (hns.length === 0) return { rows: [] as IncidentStatisticRow[], error: null };

  const { data: patientData, error: patientError } = await supabase
    .from("patients")
    .select("hn, full_name, gender, smi_type")
    .in("hn", hns);
  if (patientError) return { rows: [] as IncidentStatisticRow[], error: patientError.message };

  const patientMap = new Map<string, PatientRecord>();
  for (const patient of (patientData ?? []) as PatientRecord[]) {
    const hn = textValue(patient.hn);
    if (hn) patientMap.set(hn, patient);
  }

  return {
    rows: iorRows.map((record, index) => {
      const hn = textValue(record.hn) ?? "";
      return rowFromView({ ...record, ...patientMap.get(hn) }, index);
    }),
    error: null,
  };
}

export default async function IncidentStatisticsPage() {
  const supabase = await createSupabaseServerClient();
  if (!supabase) {
    return <IncidentStatistics initialRows={[]} error="ยังไม่ได้ตั้งค่า Supabase environment variables" />;
  }

  const { data, error } = await supabase
    .from("ior_statistics")
    .select("id, hn, record_date, level, full_name, gender, smi_type");

  if (!error) {
    return <IncidentStatistics initialRows={(data ?? []).map((row, index) => rowFromView(row, index))} error={null} />;
  }

  // Compatibility while the view migration is awaiting staged deployment.
  const legacy = await loadLegacyRows(supabase);
  return <IncidentStatistics initialRows={legacy.rows} error={legacy.error} />;
}
