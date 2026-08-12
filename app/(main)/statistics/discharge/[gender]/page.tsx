import { notFound } from "next/navigation";

import DischargeStatistics, {
  type DischargeStatisticRow,
} from "@/components/statistics/DischargeStatistics";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type PageProps = {
  params: Promise<{ gender: string }>;
};

const GENDER_CONFIG = {
  male: { label: "ชาย", title: "สถิติผู้ป่วยจำหน่ายหอผู้ป่วยจิตเวชชาย" },
  female: { label: "หญิง", title: "สถิติผู้ป่วยจำหน่ายหอผู้ป่วยจิตเวชหญิง" },
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

export default async function DischargeStatisticsPage({
  params,
}: PageProps) {
  const { gender } = await params;
  const config = GENDER_CONFIG[gender as keyof typeof GENDER_CONFIG];

  if (!config) {
    notFound();
  }

  const supabase = await createSupabaseServerClient();
  let rows: DischargeStatisticRow[] = [];
  let error: string | null = null;

  if (!supabase) {
    error = "ยังไม่ได้ตั้งค่า Supabase environment variables";
  } else {
    const { data, error: queryError } = await supabase
      .from("backup")
      .select(
        "id, raw_data, discharge_date, discharge_type, last_diagnosis, smi_type, admitting_doctor, full_name, hn, gender",
      )
      .eq("gender", config.label)
      .not("discharge_date", "is", null);

    if (queryError) {
      error = queryError.message;
    }

    rows = (data ?? []).flatMap((entry) => {
      const rawData = asRecord(entry.raw_data) ?? {};
      const id = textValue(entry.id);
      const hn = textValue(entry.hn);
      const dischargeDate = textValue(entry.discharge_date);

      if (!dischargeDate) return [];

      return [
        {
          id: id ?? `${hn ?? "unknown"}-${dischargeDate}`,
          hn,
          full_name: textValue(entry.full_name),
          gender: textValue(entry.gender),
          discharge_date: dischargeDate,
          discharge_type: textValue(entry.discharge_type),
          last_diagnosis: textValue(entry.last_diagnosis),
          smi_type: textValue(entry.smi_type),
          admitting_doctor: textValue(entry.admitting_doctor),
          raw_data: rawData,
        },
      ];
    });
  }

  return (
    <DischargeStatistics
      genderLabel={config.label}
      title={config.title}
      initialRows={rows}
      error={error}
    />
  );
}
