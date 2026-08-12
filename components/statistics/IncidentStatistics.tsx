"use client";

import { useMemo, useState } from "react";

import { downloadExcelFile } from "@/lib/utils/export";

export type IncidentStatisticRow = {
  id: string;
  hn: string;
  record_date: string | null;
  level: string | null;
  full_name: string;
  gender: string;
  smi_type: string;
};

type Props = {
  initialRows: IncidentStatisticRow[];
  error: string | null;
};

const MONTHS = [
  "มกราคม",
  "กุมภาพันธ์",
  "มีนาคม",
  "เมษายน",
  "พฤษภาคม",
  "มิถุนายน",
  "กรกฎาคม",
  "สิงหาคม",
  "กันยายน",
  "ตุลาคม",
  "พฤศจิกายน",
  "ธันวาคม",
];

function FilterSelect({
  label,
  value,
  onChange,
  children,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  children: React.ReactNode;
}) {
  return (
    <label className="flex min-w-40 flex-col gap-1 text-sm font-medium text-slate-700">
      {label}
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="rounded-lg border border-slate-300 bg-white px-3 py-2 font-normal outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
      >
        <option value="">ทั้งหมด</option>
        {children}
      </select>
    </label>
  );
}

function formatDate(value: string | null): Date | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export default function IncidentStatistics({ initialRows, error }: Props) {
  const [month, setMonth] = useState("");
  const [year, setYear] = useState("");
  const [gender, setGender] = useState("");

  const years = useMemo(
    () =>
      Array.from(
        new Set(
          initialRows
            .map((row) => formatDate(row.record_date))
            .filter((date): date is Date => date !== null)
            .map((date) => date.getFullYear() + 543),
        ),
      ).sort((a, b) => b - a),
    [initialRows],
  );

  const filteredRows = useMemo(
    () =>
      initialRows.filter((row) => {
        const date = formatDate(row.record_date);
        if ((month || year) && !date) return false;
        if (month && (!date || date.getMonth() + 1 !== Number(month))) return false;
        if (year && (!date || date.getFullYear() + 543 !== Number(year))) return false;
        if (gender && row.gender !== gender) return false;
        return true;
      }),
    [gender, initialRows, month, year],
  );

  function exportAsExcel() {
    downloadExcelFile({
      filename: "สถิติผู้ป่วยอุบัติการณ์_IOR.xlsx",
      sheetName: "สถิติอุบัติการณ์ IOR",
      headers: ["HN", "ชื่อ-สกุล", "SMIV type", "Level"],
      rows: filteredRows.map((row) => [
        row.hn || "-",
        row.full_name || "-",
        row.smi_type || "-",
        row.level || "-",
      ]),
    });
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 md:px-6">
      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-sm font-medium uppercase tracking-[0.2em] text-indigo-600">Statistics</p>
            <h1 className="mt-1 text-2xl font-bold text-slate-800 md:text-3xl">IOR : SMI-V</h1>
          </div>
          <div className="rounded-full bg-slate-100 px-3 py-1 text-sm font-medium text-slate-700">
            ยอดผู้ป่วยอุบัติการณ์: {filteredRows.length} ราย
          </div>
        </div>

        {error ? (
          <div className="mt-5 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>
        ) : null}

        <div className="mt-6 flex flex-wrap items-end gap-3">
          <FilterSelect label="เดือน" value={month} onChange={setMonth}>
            {MONTHS.map((item, index) => <option key={item} value={index + 1}>{item}</option>)}
          </FilterSelect>
          <FilterSelect label="ปี (พ.ศ.)" value={year} onChange={setYear}>
            {years.map((item) => <option key={item} value={item}>{item}</option>)}
          </FilterSelect>
          <FilterSelect label="หอผู้ป่วย" value={gender} onChange={setGender}>
            <option value="ชาย">ชาย</option>
            <option value="หญิง">หญิง</option>
          </FilterSelect>
          <button
            type="button"
            onClick={exportAsExcel}
            className="rounded-lg bg-emerald-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-800"
          >
            ⬇ ดาวน์โหลด Excel
          </button>
        </div>

        <div className="mt-6 overflow-x-auto rounded-2xl border border-slate-200">
          <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
            <thead className="bg-amber-600 text-white">
              <tr>
                {["HN", "ชื่อ-สกุล", "SMIV type", "Level"].map((heading) => (
                  <th key={heading} className="whitespace-nowrap px-3 py-3 font-semibold">{heading}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 bg-white">
              {filteredRows.length === 0 ? (
                <tr><td colSpan={4} className="px-4 py-8 text-center text-slate-500">ยังไม่มีข้อมูล IOR</td></tr>
              ) : (
                filteredRows.map((row) => (
                  <tr key={row.id} className="hover:bg-slate-50">
                    <td className="px-3 py-2 font-medium text-slate-800">{row.hn || "-"}</td>
                    <td className="px-3 py-2 text-slate-700">{row.full_name || "-"}</td>
                    <td className="px-3 py-2 text-slate-700">{row.smi_type || "-"}</td>
                    <td className="px-3 py-2 text-slate-700">{row.level || "-"}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
