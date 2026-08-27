import DashboardCarousel, {
  type DashboardData,
  type DashboardPatientRow,
  type DashboardDoctor,
} from "@/components/dashboard/DashboardCarousel";
import { ChartLineLabel } from "@/components/dashboard/ChartLineLabel";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const NON_SMIV_VALUE = "ไม่เข้าข่าย SMI-V";
const GENDERS = ["ชาย", "หญิง"] as const;

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
  const data = await loadDashboardData();
  return (
    <>
      <DashboardCarousel data={data} />
      <ChartLineLabel />
    </>
  );
}
