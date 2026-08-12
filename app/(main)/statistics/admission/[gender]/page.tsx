import { notFound } from "next/navigation";

import AdmissionStatistics, {
  type AdmissionStatisticRow,
} from "@/components/statistics/AdmissionStatistics";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type PageProps = {
  params: Promise<{ gender: string }>;
};

const GENDER_CONFIG = {
  male: { label: "ชาย", title: "สถิติผู้ป่วยรับใหม่หอผู้ป่วยจิตเวชชาย" },
  female: { label: "หญิง", title: "สถิติผู้ป่วยรับใหม่หอผู้ป่วยจิตเวชหญิง" },
} as const;

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function textValue(value: unknown): string | null {
  return typeof value === "string" || typeof value === "number"
    ? String(value)
    : null;
}

export default async function AdmissionStatisticsPage({
  params,
}: PageProps) {
  const { gender } = await params;
  const config = GENDER_CONFIG[gender as keyof typeof GENDER_CONFIG];

  if (!config) {
    notFound();
  }

  const supabase = await createSupabaseServerClient();
  let rows: AdmissionStatisticRow[] = [];
  let error: string | null = null;

  if (!supabase) {
    error = "ยังไม่ได้ตั้งค่า Supabase environment variables";
  } else {
    const [{ data: assessmentData, error: assessmentError }, { data: backupData, error: backupError }] =
      await Promise.all([
        supabase
          .from("assessments")
          .select("raw_data")
          .not("raw_data", "is", null),
        supabase
          .from("backup")
          .select("id, raw_data")
          .not("raw_data", "is", null),
      ]);

    if (assessmentError || backupError) {
      error = assessmentError?.message ?? backupError?.message ?? "ไม่สามารถโหลดข้อมูลได้";
    }

    const assessmentSeen = new Set<string>();
    const fromAssessments: AdmissionStatisticRow[] = (assessmentData ?? [])
      .map((entry, index) => {
        const rawData = asRecord(entry.raw_data);
        if (!rawData) return null;

        const admissionDate = textValue(rawData.admission_date ?? rawData.admit_date);
        const hn = textValue(rawData.hn);
        if (!admissionDate || textValue(rawData.gender) !== config.label) return null;

        const key = `${hn ?? ""}_${admissionDate}`;
        if (assessmentSeen.has(key)) return null;
        assessmentSeen.add(key);

        return {
          id: `assessment-${index}`,
          raw_data: rawData,
        };
      })
      .filter((row): row is AdmissionStatisticRow => row !== null);

    const fromBackup: AdmissionStatisticRow[] = (backupData ?? [])
      .map((entry) => {
        const rawData = asRecord(entry.raw_data);
        if (!rawData) return null;

        const admissionDate = textValue(rawData.admission_date ?? rawData.admit_date);
        if (!admissionDate || textValue(rawData.gender) !== config.label) return null;

        return {
          id: `backup-${textValue(entry.id) ?? admissionDate}`,
          raw_data: rawData,
        };
      })
      .filter((row): row is AdmissionStatisticRow => row !== null);

    rows = [...fromAssessments, ...fromBackup];
  }

  return (
    <AdmissionStatistics
      genderLabel={config.label}
      title={config.title}
      initialRows={rows}
      error={error}
    />
  );
}
