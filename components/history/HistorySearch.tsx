"use client";

import {
  initialHistoryState,
  searchBackupHistory,
  type BackupHistoryRow,
} from "@/app/actions/history";
import { formatDateBE, getThailandDateParts } from "@/lib/utils/date";
import { useActionState, useMemo, useState } from "react";

const MONTHS = [
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
];

function rawString(rawData: Record<string, unknown> | null, keys: string[]) {
  for (const key of keys) {
    const value = rawData?.[key];
    if (typeof value === "string" && value.trim()) return value;
  }
  return "ไม่ระบุ";
}

function filterHistory(
  rows: BackupHistoryRow[] = [],
  month: string,
  year: string,
) {
  if (month && !year) return [];

  return rows.filter((row) => {
    if (!row.admit_date) return !month && !year;
    const date = getThailandDateParts(row.admit_date);
    if (!date) return false;
    if (year && date.year !== Number(year)) return false;
    if (month && date.month !== Number(month)) return false;
    return true;
  });
}

function HistoryTable({ rows }: { rows: BackupHistoryRow[] }) {
  return (
    <div className="mt-4 overflow-x-auto rounded-2xl border border-slate-200">
      <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
        <thead className="bg-slate-50 text-slate-700">
          <tr>
            <th className="px-4 py-3 font-semibold">วันที่รับรักษา</th>
            <th className="px-4 py-3 font-semibold">วันที่จำหน่าย</th>
            <th className="px-4 py-3 text-left font-semibold">การวินิจฉัยล่าสุด</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-200 bg-white">
          {rows.length === 0 ? (
            <tr>
              <td colSpan={3} className="px-4 py-6 text-center text-slate-500">
                ไม่พบประวัติในช่วงที่เลือก
              </td>
            </tr>
          ) : (
            rows.map((row, index) => (
              <tr key={`${row.admit_date ?? "unknown"}-${row.discharge_date ?? "unknown"}-${index}`} className="hover:bg-slate-50">
                <td className="px-4 py-3 text-slate-700">{formatDateBE(row.admit_date)}</td>
                <td className="px-4 py-3 text-slate-700">{formatDateBE(row.discharge_date)}</td>
                <td className="px-4 py-3 text-left text-slate-700">{row.last_diagnosis || "-"}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

export default function HistorySearch() {
  const [state, formAction, isPending] = useActionState(searchBackupHistory, initialHistoryState);
  const [month, setMonth] = useState("");
  const [year, setYear] = useState("");
  const filteredRows = useMemo(
    () => filterHistory(state.history ?? [], month, year),
    [month, state.history, year],
  );
  const currentYear = getThailandDateParts(new Date())?.year ?? 2026;
  const patient = state.patient;

  return (
    <div className="mx-auto max-w-3xl px-4 py-6 md:px-6">
      <section className="legacy-card p-5 md:p-6" aria-labelledby="history-title">
        <h1 id="history-title" className="legacy-card-title">
          ค้นหาข้อมูลผู้ป่วย (สำรอง)
        </h1>

        <form action={formAction} className="mt-5">
          <label htmlFor="oldpatient-hn-search" className="text-sm font-semibold text-slate-700">
            ค้นหา (HN)
          </label>
          <div className="mt-2 flex flex-col gap-2 sm:flex-row">
            <input
              id="oldpatient-hn-search"
              name="hn"
              type="text"
              required
              defaultValue={state.searchedHn}
              placeholder="กรอกรหัส HN"
              className="legacy-input"
            />
            <button type="submit" className="legacy-button shrink-0 sm:w-32" disabled={isPending}>
              {isPending ? "กำลังค้นหา..." : "ค้นหา"}
            </button>
          </div>
        </form>

        {state.error ? (
          <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {state.error}
          </div>
        ) : null}

        {patient ? (
          <div className="mt-5 grid gap-x-6 gap-y-2 rounded-2xl border border-indigo-100 bg-indigo-50/60 p-4 sm:grid-cols-2">
            <InfoRow label="HN" value={patient.hn} />
            <InfoRow label="ชื่อ - นามสกุล" value={patient.full_name || rawString(patient.raw_data, ["full_name"])} />
            <InfoRow label="อายุ" value={patient.age ? String(patient.age) : rawString(patient.raw_data, ["age"])} />
            <InfoRow label="เพศ" value={patient.gender || rawString(patient.raw_data, ["gender"])} />
            <InfoRow label="ผู้ดูแล" value={rawString(patient.raw_data, ["caregiver_name", "caregiverName", "caregiver"])} />
            <InfoRow label="ความสัมพันธ์" value={rawString(patient.raw_data, ["caregiver_relation", "caregiverRelation"])} />
            <InfoRow label="เบอร์โทร" value={rawString(patient.raw_data, ["caregiver_phone", "caregiverPhone"])} />
            <InfoRow label="ที่อยู่" value={rawString(patient.raw_data, ["residence_details", "residenceDetails"])} />
            <InfoRow label="วันที่รับ (admit_date)" value={formatDateBE(patient.admit_date || rawString(patient.raw_data, ["admission_date"]))} />
          </div>
        ) : null}

        <div className="mt-5">
          <label className="text-sm font-semibold text-slate-700">กรองประวัติ</label>
          <div className="mt-2 flex flex-col gap-2 sm:flex-row">
            <select value={month} onChange={(event) => setMonth(event.target.value)} className="legacy-input sm:max-w-40">
              <option value="">ทุกเดือน</option>
              {MONTHS.map((label, index) => (
                <option key={label} value={String(index + 1).padStart(2, "0")}>
                  {label}
                </option>
              ))}
            </select>
            <select value={year} onChange={(event) => setYear(event.target.value)} className="legacy-input sm:max-w-40">
              <option value="">ทุกปี</option>
              {[currentYear, currentYear + 1, currentYear + 2, currentYear + 3].map((value) => (
                <option key={value} value={String(value)}>
                  {value + 543}
                </option>
              ))}
            </select>
          </div>
          {month && !year ? <p className="mt-2 text-xs text-amber-700">กรุณาเลือกปีด้วยเพื่อกรองตามเดือน</p> : null}
        </div>

        <HistoryTable rows={filteredRows} />
      </section>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-[minmax(7rem,auto)_1fr] gap-3 border-b border-indigo-100/70 py-1.5 last:border-0">
      <span className="font-semibold text-slate-600">{label}</span>
      <span className="break-words text-slate-800">{value || "ไม่ระบุ"}</span>
    </div>
  );
}
