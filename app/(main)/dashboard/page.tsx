import DashboardCarousel, {
  type DashboardData,
  type DashboardPatientRow,
  type DashboardDoctor,
} from "@/components/dashboard/DashboardCarousel";
import { SmivTrendCharts, type SmivTrendData } from "@/components/dashboard/SmivTrendCharts";
import { getCurrentUser } from "@/lib/auth/current-user";
import { observeServerOperation, queryMetrics } from "@/lib/observability/server-performance";
import { isMissingFunctionError, isMissingRelationError } from "@/lib/supabase/errors";
import { cache, Suspense } from "react";

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

type DashboardPatientGroupRow = {
  gender: string | null;
  smi_type: string | null;
  oas_score: number | string | null;
  admitting_doctor: string | null;
  patient_count: number | null;
};

type DashboardTrendRow = {
  series: string | null;
  month_start: string | null;
  event_count: number | null;
};

type DashboardSnapshotPayload = {
  patient_groups: DashboardPatientGroupRow[];
  monthly_trends: DashboardTrendRow[];
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
  return rows.reduce(
    (count, row) => count + (predicate(row) ? row.patient_count : 0),
    0,
  );
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

function monthKeyFromDate(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
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

function getLastEightMonthKeys() {
  const now = new Date();
  const keys: string[] = [];
  for (let offset = 7; offset >= 0; offset -= 1) {
    const date = new Date(now.getFullYear(), now.getMonth() - offset, 1);
    keys.push(monthKeyFromDate(date));
  }
  return keys;
}

function buildMonthlySeries(dates: string[]): SmivTrendData["admit"] {
  const counts = new Map<string, number>();
  for (const date of dates) {
    const key = monthKey(date);
    if (!/^\d{4}-\d{2}$/.test(key)) continue;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }

  return getLastEightMonthKeys().map((key) => ({
    key,
    label: monthLabel(key),
    value: counts.get(key) ?? 0,
  }));
}

function emptyTrendData(): SmivTrendData {
  const empty = buildMonthlySeries([]);
  return { admit: empty, ior: empty };
}

function buildAggregateSeries(
  rows: Array<{ series: string | null; month_start: string | null; event_count: number | null }>,
  series: "admit" | "ior",
): SmivTrendData["admit"] {
  const counts = new Map(
    rows
      .filter((row) => row.series === series && row.month_start)
      .map((row) => [monthKey(row.month_start as string), Number(row.event_count ?? 0)]),
  );
  return getLastEightMonthKeys().map((key) => ({
    key,
    label: monthLabel(key),
    value: counts.get(key) ?? 0,
  }));
}

const loadDashboardSnapshot = cache(async () => {
  const { supabase, user } = await getCurrentUser();
  if (!supabase || !user) {
    return {
      patientGroups: [] as DashboardPatientGroupRow[],
      patientGroupsError: null,
      monthlyTrends: [] as DashboardTrendRow[],
      monthlyTrendsError: null,
    };
  }

  const snapshotResult = await observeServerOperation(
    "dashboard.snapshot",
    () => supabase.rpc("get_dashboard_snapshot").single(),
    (value) => queryMetrics({ data: value.data ? [value.data] : [] }),
  );

  if (!snapshotResult.error && snapshotResult.data) {
    const payload = snapshotResult.data as unknown as DashboardSnapshotPayload;
    return {
      patientGroups: Array.isArray(payload.patient_groups) ? payload.patient_groups : [],
      patientGroupsError: null,
      monthlyTrends: Array.isArray(payload.monthly_trends) ? payload.monthly_trends : [],
      monthlyTrendsError: null,
    };
  }

  if (snapshotResult.error && !isMissingFunctionError(snapshotResult.error)) {
    console.error("Dashboard snapshot RPC failed", snapshotResult.error.code);
  }

  // Compatibility path while the RPC migration is rolling out.
  const [patientGroupsResult, monthlyTrendsResult] = await Promise.all([
    observeServerOperation(
      "dashboard.patient_groups",
      () => supabase
        .from("dashboard_patient_groups")
        .select("gender, smi_type, oas_score, admitting_doctor, patient_count"),
      queryMetrics,
    ),
    observeServerOperation(
      "dashboard.monthly_trends",
      () => supabase
        .from("dashboard_monthly_trends")
        .select("series, month_start, event_count"),
      queryMetrics,
    ),
  ]);

  return {
    patientGroups: patientGroupsResult.data ?? [],
    patientGroupsError: patientGroupsResult.error,
    monthlyTrends: monthlyTrendsResult.data ?? [],
    monthlyTrendsError: monthlyTrendsResult.error,
  };
});

async function loadSmivTrendData(): Promise<SmivTrendData> {
  const snapshot = await loadDashboardSnapshot();
  const aggregateResult = {
    data: snapshot.monthlyTrends,
    error: snapshot.monthlyTrendsError,
  };

  if (!aggregateResult.error) {
    const rows = aggregateResult.data ?? [];
    return {
      admit: buildAggregateSeries(rows, "admit"),
      ior: buildAggregateSeries(rows, "ior"),
    };
  }

  if (!isMissingRelationError(aggregateResult.error)) {
    console.error("Dashboard monthly trend query failed", aggregateResult.error.code);
    return emptyTrendData();
  }

  // Compatibility during a staged rollout; removed from the hot path once the view exists.
  const { supabase, user } = await getCurrentUser();
  if (!supabase || !user) return emptyTrendData();
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
  const snapshot = await loadDashboardSnapshot();
  const groupedResult = {
    data: snapshot.patientGroups,
    error: snapshot.patientGroupsError,
  };

  let rows: DashboardPatientRow[];

  if (!groupedResult.error) {
    rows = (groupedResult.data ?? []).map((row) => ({
      gender: row.gender,
      smi_type: row.smi_type,
      oas_score: row.oas_score,
      admitting_doctor: row.admitting_doctor,
      patient_count: Number(row.patient_count ?? 0),
    }));
  } else if (isMissingRelationError(groupedResult.error)) {
    const { supabase, user } = await getCurrentUser();
    if (!supabase || !user) {
      return {
        total: 0,
        general: 0,
        smiv: 0,
        wards: GENDERS.map((gender) => ({ gender, total: 0, general: 0, smiv: 0, smivTypes: [0, 0, 0, 0] })),
        doctors: DOCTORS.map((doctor) => ({ ...doctor, total: 0, general: 0, smiv: 0 })),
        updatedAt: new Date().toISOString(),
      };
    }
    const legacyResult = await supabase
      .from("patients")
      .select("gender, smi_type, oas_score, admitting_doctor");

    if (legacyResult.error) {
      console.error("Dashboard patient summary query failed", legacyResult.error.code);
      throw new Error("ไม่สามารถโหลดข้อมูล dashboard ได้");
    }

    rows = (legacyResult.data ?? []).map((row) => ({
      ...row,
      patient_count: 1,
    }));
  } else {
    console.error("Dashboard grouped query failed", groupedResult.error.code);
    throw new Error("ไม่สามารถโหลดข้อมูล dashboard ได้");
  }

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
    total: countBy(rows, () => true),
    general: countBy(rows, isGeneral),
    smiv: countBy(rows, isSmiv),
    wards: genderRows,
    doctors,
    updatedAt: new Date().toISOString(),
  };
}

async function DashboardOverview() {
  const data = await loadDashboardData();
  return <DashboardCarousel data={data} />;
}

async function DashboardTrends() {
  const trendData = await loadSmivTrendData();
  return <SmivTrendCharts data={trendData} />;
}

function DashboardOverviewSkeleton() {
  return (
    <div className="mx-auto w-full max-w-6xl animate-pulse px-4 py-6 md:px-6" role="status">
      <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
        <div className="h-4 w-32 rounded bg-slate-200" />
        <div className="mt-3 h-8 w-80 max-w-full rounded bg-slate-200" />
        <div className="mt-6 grid gap-3 sm:grid-cols-3">
          <div className="h-32 rounded-2xl bg-slate-100" />
          <div className="h-32 rounded-2xl bg-slate-100" />
          <div className="h-32 rounded-2xl bg-slate-100" />
        </div>
      </div>
      <span className="sr-only">Loading dashboard overview</span>
    </div>
  );
}

function DashboardTrendsSkeleton() {
  return (
    <div className="mx-auto grid w-full max-w-6xl animate-pulse gap-4 px-4 pb-6 md:px-6" role="status">
      <div className="h-80 rounded-[28px] border border-slate-200 bg-slate-100" />
      <div className="h-80 rounded-[28px] border border-slate-200 bg-slate-100" />
      <span className="sr-only">Loading dashboard trends</span>
    </div>
  );
}

export default function HomePage() {
  return (
    <>
      <Suspense fallback={<DashboardOverviewSkeleton />}>
        <DashboardOverview />
      </Suspense>
      <Suspense fallback={<DashboardTrendsSkeleton />}>
        <DashboardTrends />
      </Suspense>
    </>
  );
}
