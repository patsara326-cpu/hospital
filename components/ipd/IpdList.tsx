"use client";

import { useMemo, useState } from "react";

import { formatDateBE } from "@/lib/utils/date";

export type IpdAssessmentRow = {
  hn: string | null;
  raw_data: Record<string, unknown> | null;
  created_at: string | null;
};

export type IpdPatientRecord = {
  hn: string;
  rawData: Record<string, unknown>;
};

type IpdTab = "nonsmiv" | "smiv";
type Gender = "ชาย" | "หญิง";

const NON_SMIV_VALUE = "ไม่เข้าข่าย SMI-V";

const IPD_LABEL_MAP: Record<string, string> = {
  hn: "HN",
  first_name: "ชื่อ",
  last_name: "นามสกุล",
  gender: "เพศ",
  age: "อายุ",
  smi_v_result: "ผล SMI-V",
  admission_date: "วันที่รับ",
  admitting_doctor: "แพทย์",
  diagnosis: "การวินิจฉัย",
  substance_use: "การใช้สารเสพติด",
  substance_type: "ประเภทสารเสพติด",
  admission_source: "แหล่งที่รับ",
  oas_score: "OAS Score",
  oas_risk_level: "OAS Risk Level",
  aggressive_behavior: "พฤติกรรมก้าวร้าว",
  residence_type: "ประเภทที่อยู่",
  residence_district: "อำเภอ",
  residence_subdistrict: "ตำบล",
  residence_details: "ที่อยู่รายละเอียด",
  caregiver_status: "สถานะผู้ดูแล",
  caregiver_name: "ชื่อผู้ดูแล",
  caregiver_relation: "ความสัมพันธ์",
  caregiver_phone: "เบอร์ผู้ดูแล",
  patient_phone: "เบอร์ผู้ป่วย",
  is_smi_v: "เข้าข่าย SMI-V",
};

function displayValue(key: string, value: unknown) {
  if (value === null || value === undefined || value === "") return "-";
  if (typeof value === "boolean") return value ? "ใช่" : "ไม่ใช่";

  if (key.includes("date")) {
    return formatDateBE(String(value), String(value));
  }

  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

function patientName(rawData: Record<string, unknown>) {
  const firstName = typeof rawData.first_name === "string" ? rawData.first_name : "";
  const lastName = typeof rawData.last_name === "string" ? rawData.last_name : "";
  return `${firstName} ${lastName}`.trim() || "-";
}

function patientHn(record: IpdPatientRecord) {
  return typeof record.rawData.hn === "string" && record.rawData.hn
    ? record.rawData.hn
    : record.hn || "-";
}

function detailsFor(rawData: Record<string, unknown>) {
  const knownKeys = Object.keys(IPD_LABEL_MAP);
  const extraKeys = Object.keys(rawData).filter((key) => !knownKeys.includes(key));
  return [...knownKeys, ...extraKeys].filter((key) => key in rawData);
}

export default function IpdList({
  gender,
  records,
  error,
}: {
  gender: Gender;
  records: IpdPatientRecord[];
  error: string | null;
}) {
  const [activeTab, setActiveTab] = useState<IpdTab | null>(null);
  const [openRecord, setOpenRecord] = useState<string | null>(null);

  const filteredRecords = useMemo(() => {
    if (!activeTab) return [];
    return records.filter((record) =>
      activeTab === "nonsmiv"
        ? record.rawData.smi_v_result === NON_SMIV_VALUE
        : record.rawData.smi_v_result !== NON_SMIV_VALUE,
    );
  }, [activeTab, records]);

  function toggleTab(tab: IpdTab) {
    setActiveTab((current) => (current === tab ? null : tab));
    setOpenRecord(null);
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-6 md:px-6">
      <section className="legacy-card p-5 md:p-6" aria-labelledby="ipd-title">
        <h1 id="ipd-title" className="legacy-card-title">
          IPD {gender}
        </h1>

        <div className="mt-5 flex gap-3">
          <button
            type="button"
            className={`flex-1 rounded-xl px-4 py-3 font-semibold transition ${activeTab === "nonsmiv" ? "bg-indigo-600 text-white" : "bg-slate-400 text-white hover:bg-indigo-500"}`}
            aria-pressed={activeTab === "nonsmiv"}
            onClick={() => toggleTab("nonsmiv")}
          >
            Non SMIV
          </button>
          <button
            type="button"
            className={`flex-1 rounded-xl px-4 py-3 font-semibold transition ${activeTab === "smiv" ? "bg-indigo-600 text-white" : "bg-slate-400 text-white hover:bg-indigo-500"}`}
            aria-pressed={activeTab === "smiv"}
            onClick={() => toggleTab("smiv")}
          >
            SMIV
          </button>
        </div>

        {error ? (
          <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            เกิดข้อผิดพลาด: {error}
          </div>
        ) : null}

        {activeTab ? (
          <div className="mt-4 space-y-2">
            {filteredRecords.length === 0 ? (
              <p className="rounded-xl bg-slate-50 px-4 py-5 text-center text-sm text-slate-500">
                ไม่พบข้อมูลผู้ป่วย
              </p>
            ) : (
              filteredRecords.map((record, index) => {
                const id = `${activeTab}-${patientHn(record)}-${index}`;
                const isOpen = openRecord === id;
                return (
                  <article key={id} className="overflow-hidden rounded-xl border border-slate-200">
                    <button
                      type="button"
                      className="flex w-full items-center gap-3 bg-slate-50 px-4 py-3 text-left transition hover:bg-slate-100"
                      aria-expanded={isOpen}
                      onClick={() => setOpenRecord(isOpen ? null : id)}
                    >
                      <span className="font-semibold text-slate-800">{patientHn(record)}</span>
                      <span className="flex-1 text-slate-700">{patientName(record.rawData)}</span>
                      <span className="text-slate-400" aria-hidden="true">
                        {isOpen ? "▲" : "▼"}
                      </span>
                    </button>
                    {isOpen ? (
                      <div className="space-y-1 border-t border-slate-200 bg-white px-4 py-3">
                        {detailsFor(record.rawData).map((key) => (
                          <div key={key} className="flex gap-3 border-b border-slate-100 py-1.5 last:border-0">
                            <span className="min-w-36 text-xs text-slate-500">{IPD_LABEL_MAP[key] ?? key}</span>
                            <span className="break-words text-sm text-slate-800">
                              {displayValue(key, record.rawData[key])}
                            </span>
                          </div>
                        ))}
                      </div>
                    ) : null}
                  </article>
                );
              })
            )}
          </div>
        ) : null}
      </section>
    </div>
  );
}
