"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import type { IpdPatientRecord, IpdPatientSummary } from "@/lib/ipd/records";
import { formatDateBE } from "@/lib/utils/date";

type IpdTab = "nonsmiv" | "smiv";
type Gender = "ชาย" | "หญิง";

const LABELS: Record<string, string> = {
  hn: "HN", first_name: "ชื่อ", last_name: "นามสกุล", gender: "เพศ", age: "อายุ",
  smi_v_result: "ผล SMI-V", admission_date: "วันที่รับ", admitting_doctor: "แพทย์",
  diagnosis: "การวินิจฉัย", substance_use: "การใช้สารเสพติด", substance_type: "ประเภทสารเสพติด",
  admission_source: "แหล่งที่รับ", oas_score: "OAS Score", oas_risk_level: "OAS Risk Level",
  aggressive_behavior: "พฤติกรรมก้าวร้าว", residence_type: "ประเภทที่อยู่", residence_district: "อำเภอ",
  residence_subdistrict: "ตำบล", residence_details: "ที่อยู่รายละเอียด", caregiver_status: "สถานะผู้ดูแล",
  caregiver_name: "ชื่อผู้ดูแล", caregiver_relation: "ความสัมพันธ์", caregiver_phone: "เบอร์ผู้ดูแล",
  patient_phone: "เบอร์ผู้ป่วย", is_smi_v: "เข้าข่าย SMI-V",
};

function displayValue(key: string, value: unknown) {
  if (value === null || value === undefined || value === "") return "-";
  if (typeof value === "boolean") return value ? "ใช่" : "ไม่ใช่";
  if (key.includes("date")) return formatDateBE(String(value), String(value));
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

function detailKeys(rawData: Record<string, unknown>) {
  const knownKeys = Object.keys(LABELS);
  return [...knownKeys, ...Object.keys(rawData).filter((key) => !knownKeys.includes(key))]
    .filter((key) => key in rawData);
}

export default function IpdList({ gender, records, total, page, pageSize, activeTab, routePath, error }: {
  gender: Gender;
  records: IpdPatientSummary[];
  total: number;
  page: number;
  pageSize: number;
  activeTab: IpdTab | null;
  routePath: string;
  error: string | null;
}) {
  const router = useRouter();
  const [navigationPending, startNavigation] = useTransition();
  const [openId, setOpenId] = useState<string | null>(null);
  const [details, setDetails] = useState<Record<string, IpdPatientRecord>>({});
  const [detailPending, setDetailPending] = useState<string | null>(null);
  const [detailError, setDetailError] = useState("");
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  function navigate(tab: IpdTab | null, nextPage = 1) {
    const params = new URLSearchParams();
    if (tab) params.set("type", tab);
    if (nextPage > 1) params.set("page", String(nextPage));
    setOpenId(null);
    startNavigation(() => router.replace(params.size ? `${routePath}?${params}` : routePath, { scroll: false }));
  }

  async function toggleRecord(id: string) {
    if (openId === id) { setOpenId(null); return; }
    setOpenId(id);
    setDetailError("");
    if (details[id]) return;
    setDetailPending(id);
    try {
      const response = await fetch(`/api/ipd/${encodeURIComponent(id)}`, { cache: "no-store" });
      const payload = await response.json() as { record?: IpdPatientRecord; error?: string };
      if (!response.ok || !payload.record) throw new Error(payload.error ?? "ไม่สามารถโหลดรายละเอียดผู้ป่วยได้");
      setDetails((current) => ({ ...current, [id]: payload.record as IpdPatientRecord }));
    } catch (loadError) {
      setDetailError(loadError instanceof Error ? loadError.message : "ไม่สามารถโหลดรายละเอียดผู้ป่วยได้");
    } finally {
      setDetailPending(null);
    }
  }

  return <div className="mx-auto max-w-3xl px-4 py-6 md:px-6">
    <section className="legacy-card p-5 md:p-6" aria-labelledby="ipd-title">
      <h1 id="ipd-title" className="legacy-card-title">IPD {gender}</h1>
      <div className="mt-5 flex gap-3">
        {(["nonsmiv", "smiv"] as const).map((tab) => <button key={tab} type="button" className={`flex-1 rounded-xl px-4 py-3 font-semibold transition ${activeTab === tab ? "bg-indigo-600 text-white" : "bg-slate-400 text-white hover:bg-indigo-500"}`} aria-pressed={activeTab === tab} disabled={navigationPending} onClick={() => navigate(activeTab === tab ? null : tab)}>{tab === "nonsmiv" ? "Non SMIV" : "SMIV"}</button>)}
      </div>
      {error ? <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">เกิดข้อผิดพลาด: {error}</div> : null}
      {detailError ? <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{detailError}</div> : null}
      {activeTab ? <div className={`mt-4 space-y-2 ${navigationPending ? "opacity-60" : ""}`} aria-busy={navigationPending}>
        {records.length === 0 ? <p className="rounded-xl bg-slate-50 px-4 py-5 text-center text-sm text-slate-500">ไม่พบข้อมูลผู้ป่วย</p> : records.map((record) => {
          const detail = details[record.id];
          const isOpen = openId === record.id;
          return <article key={record.id} className="overflow-hidden rounded-xl border border-slate-200">
            <button type="button" className="flex w-full items-center gap-3 bg-slate-50 px-4 py-3 text-left transition hover:bg-slate-100" aria-expanded={isOpen} onClick={() => void toggleRecord(record.id)}>
              <span className="font-semibold text-slate-800">{record.hn || "-"}</span><span className="flex-1 text-slate-700">{record.fullName}</span><span className="text-slate-400" aria-hidden="true">{isOpen ? "▲" : "▼"}</span>
            </button>
            {isOpen ? <div className="space-y-1 border-t border-slate-200 bg-white px-4 py-3">
              {detailPending === record.id ? <p className="py-3 text-sm text-slate-500">กำลังโหลดรายละเอียด...</p> : detail ? detailKeys(detail.rawData).map((key) => <div key={key} className="flex gap-3 border-b border-slate-100 py-1.5 last:border-0"><span className="min-w-36 text-xs text-slate-500">{LABELS[key] ?? key}</span><span className="break-words text-sm text-slate-800">{displayValue(key, detail.rawData[key])}</span></div>) : null}
            </div> : null}
          </article>;
        })}
        <div className="mt-4 flex items-center justify-between text-sm text-slate-600"><span>{navigationPending ? "กำลังโหลดข้อมูล..." : `หน้า ${page} จาก ${totalPages} · ${total} ราย`}</span><div className="flex gap-2"><button type="button" className="rounded-lg border border-slate-300 px-3 py-1.5 disabled:opacity-50" disabled={navigationPending || page <= 1} onClick={() => navigate(activeTab, page - 1)}>ก่อนหน้า</button><button type="button" className="rounded-lg border border-slate-300 px-3 py-1.5 disabled:opacity-50" disabled={navigationPending || page >= totalPages} onClick={() => navigate(activeTab, page + 1)}>ถัดไป</button></div></div>
      </div> : null}
    </section>
  </div>;
}
