import DashboardCarousel, {
  type DashboardData,
  type DashboardPatientRow,
  type DashboardDoctor,
} from "@/components/dashboard/DashboardCarousel";
import { ChartLineLabel } from "@/components/dashboard/ChartLineLabel";
import { SmivTrendCharts, type SmivTrendData } from "@/components/dashboard/SmivTrendCharts";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const NON_SMIV_VALUE = "ไม่เข้าข่าย SMI-V";
const GENDERS = ["ชาย", "หญิง"] as const;
const THAI_MONTHS = [
  "ม.ค.",
  "ก.พ.",
  "มี.ค.",
  "เม.ย.",
  "พ.ค.",
  "มิ.ย.",
  "ก.ค.",
  "ส.ค.",
  "ก.ย.",
  "ต.ค.",
  "พ.ย.",
  "ธ.ค.",
] as const;

type DateRow = {
  admit_date: string | null;
  smi_type: string | null;
};

type IorTrendRow = {
  record_date: string | null;
  smi_type: string | null;
};

const DOCTORS: DashboardDoctor[] = [
  { id: "anya", name: "พญ. อนัญญา ชัยวัฒนพงศ์" },
  { id: "hattayaphat", name: "พญ. หทัยภัทร วิทยศักดิ์พันธุ์" },
  { id: "saenphon", name: "นพ. แสนพล บุญชัย" },
  { id: "areeya", name: "พญ. อารียา สมบูรณ์เกื้อ" },
  { id: "patimakorn", name: "พญ. ปฏิมาภรณ์ ผลบุณยรักษ์" },
  { id: "boonprom", name: "พญ. บุญพร้อม เชษฐรตานนท์" },
  { id: "poorchiva", name: "นพ.พูร์ ชีวะสุทโธ", match: "พูร์" },
];

function countBy(
  rows: DashboardPatientRow[],
  predicate: (row: DashboardPatientRow) => boolean,
) {
  return rows.reduce((count, row) => count + (predicate(row) ? 1 : 0), 0);
}

function isGeneral(row: DashboardPatientRow) {
  return row.smi_type === NON_SMIV_VALUE;
}

function isSmiv(row: DashboardPatientRow) {
  return row.smi_type !== null && row.smi_type !== NON_SMIV_VALUE;
}

function hasOasScore(row: DashboardPatientRow, score: number) {
  return row.oas_score !== null && Number(row.oas_score) === score;
}

function doctorCount(
  rows: DashboardPatientRow[],
  doctor: DashboardDoctor,
  predicate: (row: DashboardPatientRow) => boolean,
) {
  const target = doctor.match ?? doctor.name;
  const exactCount = countBy(
    rows,
    (row) => row.admitting_doctor === target && predicate(row),
  );

  // Preserve the legacy matching order: exact, then ilike variants, then last name.
  if (exactCount > 0) {
    return exactCount;
  }

  const stripped = target.replace(/แพทย์|Dr\.?/gi, "").trim();
  const patterns = [target, stripped].filter(Boolean);
  for (const pattern of patterns) {
    const matched = countBy(rows, (row) =>
      Boolean(row.admitting_doctor?.toLocaleLowerCase("th-TH").includes(pattern.toLocaleLowerCase("th-TH"))) &&
      predicate(row),
    );
    if (matched > 0) return matched;
  }

  const parts = target.split(/\s+/).filter(Boolean);
  const last = parts.at(-1);
  if (!last) return 0;

  return countBy(
    rows,
    (row) =>
      Boolean(row.admitting_doctor?.toLocaleLowerCase("th-TH").includes(last.toLocaleLowerCase("th-TH"))) &&
      predicate(row),
  );
}

function monthKey(dateValue: string) {
  return dateValue.slice(0, 7);
}

function monthLabel(key: string) {
  const [yearText, monthText] = key.split("-");
  const monthIndex = Number(monthText) - 1;
  const year = Number(yearText) + 543;
  return `${THAI_MONTHS[monthIndex] ?? monthText} ${year}`;
}

function buildMonthlySeries(dates: string[]): SmivTrendData["admit"] {
  const counts = new Map<string, number>();
  for (const date of dates) {
    const key = monthKey(date);
    if (!/^\d{4}-\d{2}$/.test(key)) continue;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }

  const keys = [...counts.keys()].sort();
  return keys.map((key) => ({
    key,
    label: monthLabel(key),
    value: counts.get(key) ?? 0,
  }));
}

function emptyTrendData(): SmivTrendData {
  return { admit: [], ior: [] };
}

async function loadSmivTrendData(): Promise<SmivTrendData> {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return emptyTrendData();

  const [{ data: patients, error: patientsError }, { data: backup, error: backupError }, { data: ior, error: iorError }] = await Promise.all([
    supabase.from("patients").select("admit_date, smi_type"),
    supabase.from("backup").select("admit_date, smi_type"),
    supabase.from("ior_statistics").select("record_date, smi_type"),
  ]);

  if (patientsError) console.error("SMI-V trend patients query failed", patientsError);
  if (backupError) console.error("SMI-V trend backup query failed", backupError);
  if (iorError) console.error("SMI-V trend IOR query failed", iorError);

  const admitDates = ([...(patients ?? []), ...(backup ?? [])] as DateRow[])
    .filter((row) => row.smi_type !== null && row.smi_type !== NON_SMIV_VALUE && row.admit_date)
    .map((row) => row.admit_date as string);

  const iorDates = (ior ?? [] as IorTrendRow[])
    .filter((row) => row.smi_type !== null && row.smi_type !== NON_SMIV_VALUE && row.record_date)
    .map((row) => row.record_date as string);

  return {
    admit: buildMonthlySeries(admitDates),
    ior: buildMonthlySeries(iorDates),
  };
}

async function loadDashboardData(): Promise<DashboardData> {
  const supabase = await createSupabaseServerClient();
  if (!supabase) {
    return emptyDashboardData();
  }

  const { data, error } = await supabase
    .from("patients")
    .select("gender, smi_type, oas_score, admitting_doctor");

  if (error) {
    console.error("Dashboard patient summary query failed", error);
    return emptyDashboardData();
  }

  const rows = (data ?? []) as DashboardPatientRow[];
  const genderRows = GENDERS.map((gender) => {
    const filterGender = (row: DashboardPatientRow) => row.gender === gender;
    return {
      gender,
      total: countBy(rows, filterGender),
      general: countBy(rows, (row) => filterGender(row) && isGeneral(row)),
      smiv: countBy(rows, (row) => filterGender(row) && isSmiv(row)),
      smivTypes: [0, 1, 2, 3].map((score) =>
        countBy(rows, (row) => filterGender(row) && hasOasScore(row, score)),
      ),
    };
  });

  const doctors = DOCTORS.map((doctor) => ({
    ...doctor,
    total: doctor.match
      ? doctorCount(rows, doctor, (row) => isGeneral(row) || isSmiv(row))
      : doctorCount(rows, doctor, () => true),
    general: doctorCount(rows, doctor, isGeneral),
    smiv: doctorCount(rows, doctor, isSmiv),
  }));

  return {
    total: rows.length,
    general: countBy(rows, isGeneral),
    smiv: countBy(rows, isSmiv),
    wards: genderRows,
    doctors,
    updatedAt: new Date().toISOString(),
  };
}

function emptyDashboardData(): DashboardData {
  return {
    total: 0,
    general: 0,
    smiv: 0,
    wards: GENDERS.map((gender) => ({
      gender,
      total: 0,
      general: 0,
      smiv: 0,
      smivTypes: [0, 0, 0, 0],
    })),
    doctors: DOCTORS.map((doctor) => ({
      ...doctor,
      total: 0,
      general: 0,
      smiv: 0,
    })),
    updatedAt: new Date().toISOString(),
  };
}

export default async function HomePage() {
  const [data, trendData] = await Promise.all([loadDashboardData(), loadSmivTrendData()]);
  return (
    <>
      <DashboardCarousel data={data} />
      <ChartLineLabel />
      <SmivTrendCharts data={trendData} />
    </>
  );
}
