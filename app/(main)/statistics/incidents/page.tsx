import IncidentStatistics, {
  type IncidentStatisticRow,
} from "@/components/statistics/IncidentStatistics";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type IorRecord = {
  hn: unknown;
  record_date: unknown;
  level: unknown;
};

type PatientRecord = {
  hn: unknown;
  full_name: unknown;
  gender: unknown;
  smi_type: unknown;
};

function textValue(value: unknown): string | null {
  return typeof value === "string" || typeof value === "number"
    ? String(value)
    : null;
}

export default async function IncidentStatisticsPage() {
  const supabase = await createSupabaseServerClient();
  let rows: IncidentStatisticRow[] = [];
  let error: string | null = null;

  if (!supabase) {
    error = "ยังไม่ได้ตั้งค่า Supabase environment variables";
  } else {
    const { data: iorData, error: iorError } = await supabase
      .from("ior_records")
      .select("hn, record_date, level");

    if (iorError) {
      error = iorError.message;
    } else {
      const iorRows = (iorData ?? []) as IorRecord[];
      const hns = Array.from(
        new Set(
          iorRows
            .map((record) => textValue(record.hn))
            .filter((hn): hn is string => Boolean(hn)),
        ),
      );

      if (hns.length > 0) {
        const { data: patientData, error: patientError } = await supabase
          .from("patients")
          .select("hn, full_name, gender, smi_type")
          .in("hn", hns);

        if (patientError) {
          error = patientError.message;
        } else {
          const patientMap = new Map<string, PatientRecord>();
          for (const patient of (patientData ?? []) as PatientRecord[]) {
            const hn = textValue(patient.hn);
            if (hn) patientMap.set(hn, patient);
          }

          rows = iorRows.map((record, index) => {
            const hn = textValue(record.hn) ?? "";
            const patient = patientMap.get(hn);
            return {
              id: `${hn}-${textValue(record.record_date) ?? "unknown"}-${index}`,
              hn,
              record_date: textValue(record.record_date),
              level: textValue(record.level),
              full_name: textValue(patient?.full_name) ?? "-",
              gender: textValue(patient?.gender) ?? "",
              smi_type: textValue(patient?.smi_type) ?? "-",
            };
          });
        }
      }
    }
  }

  return <IncidentStatistics initialRows={rows} error={error} />;
}
