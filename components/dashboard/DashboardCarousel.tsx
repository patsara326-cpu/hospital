"use client";

import { useEffect, useRef, useState } from "react";
import { formatDateLongBE } from "@/lib/utils/date";

export type DashboardPatientRow = {
  gender: string | null;
  smi_type: string | null;
  oas_score: number | string | null;
  admitting_doctor: string | null;
  patient_count: number;
};

export type DashboardDoctor = {
  id: string;
  name: string;
  match?: string;
};

type WardSummary = {
  gender: "ชาย" | "หญิง";
  total: number;
  general: number;
  smiv: number;
  smivTypes: number[];
};

export type DashboardData = {
  total: number;
  general: number;
  smiv: number;
  wards: WardSummary[];
  doctors: Array<DashboardDoctor & { total: number; general: number; smiv: number }>;
  updatedAt: string;
};

const smivColors = [
  "bg-emerald-500 text-white",
  "bg-yellow-300 text-slate-900",
  "bg-orange-400 text-slate-900",
  "bg-red-600 text-white",
];

function DoctorCard({
  doctor,
}: {
  doctor: DashboardData["doctors"][number];
}) {
  return (
    <article className="flex min-h-44 flex-col rounded-2xl border border-violet-100 bg-gradient-to-br from-violet-50 via-white to-pink-50 p-4 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:shadow-md">
      <h3 className="min-h-12 text-sm font-semibold leading-6 text-violet-950">
        {doctor.name}
      </h3>
      <div className="mt-2 text-center text-4xl font-bold tracking-tight text-violet-700">
        {doctor.total}
      </div>
      <div className="mt-auto grid grid-cols-2 gap-2 pt-3 text-center text-xs">
        <div className="rounded-xl border border-slate-100 bg-white/80 p-2">
          <div className="text-slate-500">ทั่วไป</div>
          <div className="mt-1 text-base font-bold text-slate-800">{doctor.general}</div>
        </div>
        <div className="rounded-xl border border-slate-100 bg-white/80 p-2">
          <div className="text-slate-500">SMI-V</div>
          <div className="mt-1 text-base font-bold text-slate-800">{doctor.smiv}</div>
        </div>
      </div>
    </article>
  );
}

function WardCard({ ward }: { ward: WardSummary }) {
  const isMale = ward.gender === "ชาย";
  return (
    <section
      className={`rounded-2xl border p-4 shadow-sm ${isMale ? "border-sky-200 bg-gradient-to-br from-sky-50 to-white" : "border-pink-200 bg-gradient-to-br from-pink-50 to-white"}`}
      aria-label={`หอผู้ป่วย${ward.gender}`}
    >
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-sm font-semibold text-slate-600">หอผู้ป่วย{ward.gender}</h3>
        <span className="rounded-full bg-white/80 px-2.5 py-1 text-xs font-semibold text-slate-500">ผู้ป่วยปัจจุบัน</span>
      </div>
      <div className="mt-2 text-center text-5xl font-bold tracking-tight text-slate-800">{ward.total}</div>
      <div className="mt-3 grid grid-cols-2 gap-2 text-center text-xs">
        <div className="rounded-xl border border-white/80 bg-white/90 p-2">
          <div className="text-slate-500">จิตเวชทั่วไป</div>
          <div className="mt-1 text-lg font-bold">{ward.general}</div>
        </div>
        <div className="rounded-xl border border-white/80 bg-white/90 p-2">
          <div className="text-slate-500">SMI-V</div>
          <div className="mt-1 text-lg font-bold">{ward.smiv}</div>
        </div>
      </div>
      <div className="mt-2 grid grid-cols-4 gap-1.5 text-center text-xs">
        {ward.smivTypes.map((count, index) => (
          <div key={`${ward.gender}-smiv-${index}`} className={`rounded-xl px-1 py-2 font-bold ${smivColors[index]}`}>
            <div className="text-[10px] font-medium">ระดับ {index + 1}</div>
            <div className="mt-1">{count}</div>
          </div>
        ))}
      </div>
    </section>
  );
}

export default function DashboardCarousel({ data }: { data: DashboardData }) {
  const [page, setPage] = useState<0 | 1 | 2>(0);
  const pointerStart = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    if (page !== 0) return;
    const timer = window.setTimeout(() => setPage(1), 15_000);
    return () => window.clearTimeout(timer);
  }, [page]);

  const updatedDate = formatDateLongBE(data.updatedAt);
  const pageDoctors = page === 1 ? data.doctors.slice(0, 6) : data.doctors.slice(6);

  function movePage(direction: "next" | "prev") {
    setPage((current) => {
      if (direction === "next") return current === 2 ? 0 : ((current + 1) as 0 | 1 | 2);
      return current === 0 ? 2 : ((current - 1) as 0 | 1 | 2);
    });
  }

  function handlePointerDown(event: React.PointerEvent<HTMLElement>) {
    if (event.pointerType === "mouse" && event.button !== 0) return;
    pointerStart.current = { x: event.clientX, y: event.clientY };
  }

  function handlePointerUp(event: React.PointerEvent<HTMLElement>) {
    const start = pointerStart.current;
    pointerStart.current = null;
    if (!start) return;
    const deltaX = event.clientX - start.x;
    const deltaY = event.clientY - start.y;
    if (Math.abs(deltaX) < 48 || Math.abs(deltaX) <= Math.abs(deltaY)) return;
    movePage(deltaX < 0 ? "next" : "prev");
  }

  return (
    <div
      className="mx-auto w-full max-w-6xl px-4 py-6 md:px-6"
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      onPointerCancel={() => { pointerStart.current = null; }}
    >
      {page === 0 ? (
        <section className="relative overflow-hidden rounded-[28px] border border-slate-200 bg-white/95 p-5 shadow-[0_18px_50px_rgba(15,23,42,0.08)] md:p-7" aria-labelledby="dashboard-title">
          <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-indigo-500 via-sky-400 to-pink-400" />
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.22em] text-indigo-600">Ward overview</p>
              <h1 id="dashboard-title" className="mt-1 text-2xl font-bold tracking-tight text-slate-900 md:text-3xl">
              ยอดผู้ป่วยที่รับการรักษาในหอผู้ป่วยจิตเวช
              </h1>
            </div>
            <p className="text-sm text-slate-500">อัปเดต {updatedDate}</p>
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl bg-gradient-to-br from-orange-100 to-amber-50 p-5 text-center ring-1 ring-orange-200/70">
              <div className="text-sm font-medium text-orange-900/70">ยอดรวม</div>
              <div className="mt-2 text-5xl font-bold tracking-tight text-orange-950">{data.total}</div>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5 text-center">
              <div className="text-sm font-medium text-slate-500">จิตเวชทั่วไป</div>
              <div className="mt-2 text-4xl font-bold tracking-tight text-slate-900">{data.general}</div>
            </div>
            <div className="rounded-2xl border border-indigo-100 bg-indigo-50 p-5 text-center">
              <div className="text-sm font-medium text-indigo-600">SMI-V</div>
              <div className="mt-2 text-4xl font-bold tracking-tight text-indigo-950">{data.smiv}</div>
            </div>
          </div>

          <div className="my-6 flex items-center gap-3 text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
            <span className="h-px flex-1 bg-slate-200" />
            <span>Ward breakdown</span>
            <span className="h-px flex-1 bg-slate-200" />
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            {data.wards.map((ward) => (
              <WardCard key={ward.gender} ward={ward} />
            ))}
          </div>
          <DashboardArrow direction="next" onClick={() => movePage("next")} label="ไปหน้าถัดไป" />
          <SwipeHint />
        </section>
      ) : (
        <section className="relative overflow-hidden rounded-[28px] border border-slate-200 bg-white/95 p-5 shadow-[0_18px_50px_rgba(15,23,42,0.08)] md:p-7" aria-labelledby="doctor-summary-title">
          <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-violet-500 via-indigo-400 to-sky-400" />
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.22em] text-violet-600">Doctor overview</p>
              <h2 id="doctor-summary-title" className="mt-1 text-2xl font-bold tracking-tight text-slate-900 md:text-3xl">
              ยอดผู้ป่วยแยกตามแพทย์ผู้รับ
              </h2>
            </div>
            <p className="text-sm text-slate-500">อัปเดต {updatedDate}</p>
          </div>
          <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {pageDoctors.map((doctor) => (
              <DoctorCard key={doctor.id} doctor={doctor} />
            ))}
          </div>
          <DashboardArrow direction="prev" onClick={() => movePage("prev")} label="ย้อนกลับ" />
          <DashboardArrow direction="next" onClick={() => movePage("next")} label={page === 1 ? "ไปหน้าถัดไป" : "กลับหน้าหลัก"} />
          <SwipeHint />
        </section>
      )}
    </div>
  );
}

function DashboardArrow({
  direction,
  onClick,
  label,
}: {
  direction: "prev" | "next";
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className={`absolute top-1/2 z-10 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full border border-slate-300/70 bg-white/50 text-sm text-slate-500/50 opacity-25 backdrop-blur transition hover:bg-white/90 hover:text-indigo-600 hover:opacity-90 focus-visible:opacity-100 ${direction === "prev" ? "left-1" : "right-1"}`}
    >
      {direction === "prev" ? "◀" : "▶"}
    </button>
  );
}

function SwipeHint() {
  return <p className="mt-5 text-center text-xs text-slate-400">ปัดซ้าย/ขวาเพื่อดูหน้าถัดไป</p>;
}
