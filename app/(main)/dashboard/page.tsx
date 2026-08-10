"use client";

import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { useEffect, useMemo, useState } from "react";

type DashboardSummary = {
  total: number;
  general: number;
  smiv: number;
  maleTotal: number;
  maleGeneral: number;
  maleSmiv: number;
  femaleTotal: number;
  femaleGeneral: number;
  femaleSmiv: number;
};

type DoctorSummary = {
  id: string;
  name: string;
  total: number;
  general: number;
  smiv: number;
};

const DASH_DOCTORS = [
  { id: "anya", name: "พญ. อนัญญา ชัยวัฒนพงศ์" },
  { id: "hattayaphat", name: "พญ. หทัยภัทร วิทยศักดิ์พันธุ์" },
  { id: "saenphon", name: "นพ. แสนพล บุญชัย" },
  { id: "areeya", name: "พญ. อารียา สมบูรณ์เกื้อ" },
  { id: "patimakorn", name: "พญ. ปฏิมาภรณ์ ผลบุณยรักษ์" },
  { id: "boonprom", name: "พญ. บุญพร้อม เชษฐรตานนท์" },
];

async function getCount(filters: Record<string, string> = {}) {
  const supabase = createSupabaseBrowserClient();

  if (!supabase) {
    return 0;
  }

  let query = supabase
    .from("patients")
    .select("*", { count: "exact", head: true });

  if (filters.gender) {
    query = query.eq("gender", filters.gender);
  }

  if (filters.smi_eq) {
    query = query.eq("smi_type", filters.smi_eq);
  }

  if (filters.smi_neq) {
    query = query.neq("smi_type", filters.smi_neq);
  }

  if (filters.doctor) {
    const exact = await query.eq("admitting_doctor", filters.doctor);
    if (!exact.error && (exact.count ?? 0) > 0) {
      return exact.count ?? 0;
    }

    const stripped = filters.doctor.replace(/แพทย์|Dr\.?/g, "").trim();
    const patterns = [filters.doctor, stripped]
      .filter(Boolean)
      .map((value) => `%${value}%`);

    for (const pattern of patterns) {
      const match = await supabase
        .from("patients")
        .select("*", { count: "exact", head: true })
        .ilike("admitting_doctor", pattern);

      if (!match.error && (match.count ?? 0) > 0) {
        return match.count ?? 0;
      }
    }

    const parts = filters.doctor.split(/\s+/).filter(Boolean);
    if (parts.length > 0) {
      const last = parts[parts.length - 1];
      const fallback = await supabase
        .from("patients")
        .select("*", { count: "exact", head: true })
        .ilike("admitting_doctor", `%${last}%`);

      if (!fallback.error && (fallback.count ?? 0) > 0) {
        return fallback.count ?? 0;
      }
    }

    return 0;
  }

  const { count, error } = await query;
  if (error) {
    console.error("Dashboard count query failed", error);
    return 0;
  }

  return count ?? 0;
}

function formatThaiDate(date: Date) {
  return new Intl.DateTimeFormat("th-TH", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
}

export default function HomePage() {
  const [activeView, setActiveView] = useState(0);
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState<DashboardSummary>({
    total: 0,
    general: 0,
    smiv: 0,
    maleTotal: 0,
    maleGeneral: 0,
    maleSmiv: 0,
    femaleTotal: 0,
    femaleGeneral: 0,
    femaleSmiv: 0,
  });
  const [doctorSummary, setDoctorSummary] = useState<DoctorSummary[]>([]);

  useEffect(() => {
    const timer = setInterval(() => {
      setActiveView((current) => (current + 1) % 3);
    }, 4000);

    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    async function loadDashboard() {
      const results = await Promise.all([
        getCount(),
        getCount({ smi_eq: "ไม่เข้าข่าย SMI-V" }),
        getCount({ smi_neq: "ไม่เข้าข่าย SMI-V" }),
        getCount({ gender: "ชาย" }),
        getCount({ gender: "ชาย", smi_eq: "ไม่เข้าข่าย SMI-V" }),
        getCount({ gender: "ชาย", smi_neq: "ไม่เข้าข่าย SMI-V" }),
        getCount({ gender: "หญิง" }),
        getCount({ gender: "หญิง", smi_eq: "ไม่เข้าข่าย SMI-V" }),
        getCount({ gender: "หญิง", smi_neq: "ไม่เข้าข่าย SMI-V" }),
      ]);

      const [
        total,
        general,
        smiv,
        maleTotal,
        maleGeneral,
        maleSmiv,
        femaleTotal,
        femaleGeneral,
        femaleSmiv,
      ] = results;

      setSummary({
        total,
        general,
        smiv,
        maleTotal,
        maleGeneral,
        maleSmiv,
        femaleTotal,
        femaleGeneral,
        femaleSmiv,
      });

      const doctorRows = await Promise.all(
        DASH_DOCTORS.map(async (doctor) => {
          const [totalCount, generalCount, smivCount] = await Promise.all([
            getCount({ doctor: doctor.name }),
            getCount({ doctor: doctor.name, smi_eq: "ไม่เข้าข่าย SMI-V" }),
            getCount({ doctor: doctor.name, smi_neq: "ไม่เข้าข่าย SMI-V" }),
          ]);

          return {
            id: doctor.id,
            name: doctor.name,
            total: totalCount,
            general: generalCount,
            smiv: smivCount,
          };
        }),
      );

      setDoctorSummary(doctorRows);
      setLoading(false);
    }

    void loadDashboard();
  }, []);

  const cards = useMemo(
    () => [
      {
        title: "ผู้ป่วยทั้งหมด",
        value: summary.total,
        tone: "bg-indigo-50 text-indigo-700",
      },
      {
        title: "ไม่เข้าข่าย SMI-V",
        value: summary.general,
        tone: "bg-amber-50 text-amber-700",
      },
      {
        title: "SMI-V",
        value: summary.smiv,
        tone: "bg-emerald-50 text-emerald-700",
      },
    ],
    [summary],
  );

  const doctorCards = doctorSummary.slice(0, 3);

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 md:px-6">
      <section className="legacy-dashboard-card">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <span className="legacy-badge">Dashboard</span>
            <h1 className="legacy-card-title mt-3">ภาพรวมระบบ</h1>
          </div>
          <div className="rounded-full bg-slate-100 px-3 py-1 text-sm text-slate-600">
            {loading ? "กำลังโหลด..." : `อัพเดต: ${formatThaiDate(new Date())}`}
          </div>
        </div>

        <div className="legacy-grid-3 mt-6">
          {cards.map((card, index) => (
            <div
              key={card.title}
              className={`${card.tone} legacy-dashboard-stat transition-all ${
                activeView === index ? "ring-2 ring-indigo-300" : ""
              }`}
            >
              <div className="text-sm font-medium text-slate-600">
                {card.title}
              </div>
              <div className="mt-3 text-4xl font-bold">{card.value}</div>
            </div>
          ))}
        </div>

        <div className="mt-8 border-t border-slate-200 pt-6">
          <div className="mb-5 flex items-center justify-between gap-3">
            <h2 className="text-lg font-semibold text-indigo-900">
              ยอดผู้ป่วยแยกตามแพทย์ผู้รับ
            </h2>
            <div className="text-sm text-slate-500">
              {loading
                ? "กำลังโหลดข้อมูลแพทย์..."
                : `ผู้ป่วยรวม ${doctorSummary.reduce((sum, item) => sum + item.total, 0)} ราย`}
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            {doctorCards.map((doctor) => (
              <div key={doctor.id} className="legacy-dashboard-doctor">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-violet-700">
                      {doctor.name.split(" ").slice(0, 2).join(" ")}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">ผู้รับผิดชอบ</p>
                  </div>
                  <span className="rounded-full bg-white/80 px-2 py-1 text-[10px] font-medium text-slate-600">
                    Active
                  </span>
                </div>

                <div className="mt-5 rounded-xl bg-white p-4 text-center text-3xl font-bold text-violet-700">
                  {doctor.total}
                </div>

                <div className="mt-4 flex gap-2 text-center text-[11px]">
                  <div className="legacy-mini-stat">
                    <div className="font-bold text-slate-800">
                      {doctor.general}
                    </div>
                    <div className="text-slate-500">ทั่วไป</div>
                  </div>
                  <div className="legacy-mini-stat">
                    <div className="font-bold text-slate-800">
                      {doctor.smiv}
                    </div>
                    <div className="text-slate-500">SMI-V</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
