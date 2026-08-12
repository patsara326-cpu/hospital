import IpdList, {
  type IpdAssessmentRow,
  type IpdPatientRecord,
} from "@/components/ipd/IpdList";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";

const GENDER_LABELS = {
  male: "ชาย",
  female: "หญิง",
} as const;

function toRecord(row: IpdAssessmentRow): IpdPatientRecord | null {
  if (!row.raw_data || typeof row.raw_data !== "object" || Array.isArray(row.raw_data)) {
    return null;
  }

  const rawData = row.raw_data as Record<string, unknown>;
  const hn = typeof row.hn === "string" ? row.hn : "";

  return {
    hn,
    rawData: typeof rawData.hn === "string" || hn === "" ? rawData : { ...rawData, hn },
  };
}

async function loadIpdRecords(gender: "ชาย" | "หญิง") {
  const supabase = await createSupabaseServerClient();
  if (!supabase) {
    return {
      records: [] as IpdPatientRecord[],
      error: "ยังไม่ได้ตั้งค่า Supabase environment variables",
    };
  }

  const { data, error } = await supabase
    .from("assessments")
    .select("hn, raw_data, created_at")
    .eq("record_type", "smi-v_admission")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("IPD assessment query failed", error);
    return { records: [] as IpdPatientRecord[], error: error.message };
  }

  const latestByHn = new Set<string>();
  const records: IpdPatientRecord[] = [];

  for (const row of (data ?? []) as IpdAssessmentRow[]) {
    const record = toRecord(row);
    if (!record || latestByHn.has(record.hn)) continue;

    latestByHn.add(record.hn);
    if (record.rawData.gender === gender) {
      records.push(record);
    }
  }

  return { records, error: null };
}

export default async function IpdPage({
  params,
}: {
  params: Promise<{ gender: string }>;
}) {
  const { gender: rawGender } = await params;
  if (!(rawGender in GENDER_LABELS)) notFound();

  const gender = GENDER_LABELS[rawGender as keyof typeof GENDER_LABELS];
  const { records, error } = await loadIpdRecords(gender);

  return <IpdList gender={gender} records={records} error={error} />;
}
