"use client";

import { useMemo, useState } from "react";

import { downloadExcelFile } from "@/lib/utils/export";
import { formatDateBE } from "@/lib/utils/date";

export type DischargeStatisticRow = {
  id: string;
  hn: string | null;
  full_name: string | null;
  gender: string | null;
  discharge_date: string;
  discharge_type: string | null;
  last_diagnosis: string | null;
  smi_type: string | null;
  admitting_doctor: string | null;
  raw_data: Record<string, unknown>;
};

type Props = {
  genderLabel: string;
  title: string;
  initialRows: DischargeStatisticRow[];
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

const SMI_OPTIONS = [
  "SMI-V 1",
  "SMI-V 2",
  "SMI-V 3",
  "SMI-V 4",
  "ไม่เข้าข่าย SMI-V",
];

const RESIDENCE_OPTIONS = [
  "นอกเขตอำเภอเมืองชลบุรี",
  "ในเขตอำเภอเมืองชลบุรี",
  "นอกจังหวัด",
  "เร่ร่อน",
];

function rawText(row: DischargeStatisticRow, key: string): string {
  const value = row.raw_data[key];
  return typeof value === "string" || typeof value === "number" ? String(value) : "";
}

function displayName(row: DischargeStatisticRow): string {
  const first = rawText(row, "first_name");
  const last = rawText(row, "last_name");
  return first || last ? `${first} ${last}`.trim() : row.full_name || "-";
}

function displaySubstance(row: DischargeStatisticRow): string {
  const substance = rawText(row, "substance_type").trim();
  return substance || "ไม่ใช้";
}

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

export default function DischargeStatistics({
  genderLabel,
  title,
  initialRows,
  error,
}: Props) {
  const [month, setMonth] = useState("");
  const [year, setYear] = useState("");
  const [smiv, setSmiv] = useState("");
  const [residence, setResidence] = useState("");

  const years = useMemo(
    () =>
      Array.from(
        new Set(
          initialRows
            .map((row) => new Date(row.discharge_date))
            .filter((date) => !Number.isNaN(date.getTime()))
            .map((date) => date.getFullYear() + 543),
        ),
      ).sort((a, b) => b - a),
    [initialRows],
  );

  const filteredRows = useMemo(
    () =>
      initialRows.filter((row) => {
        const date = new Date(row.discharge_date);
        if ((month || year) && Number.isNaN(date.getTime())) return false;
        if (month && date.getMonth() + 1 !== Number(month)) return false;
        if (year && date.getFullYear() + 543 !== Number(year)) return false;
        if (smiv && row.smi_type !== smiv) return false;

        if (residence === "เร่ร่อน") {
          if (!rawText(row, "residence_type").includes("เร่ร่อน")) return false;
        } else if (residence && rawText(row, "residence_district") !== residence) {
          return false;
        }

        return true;
      }),
    [initialRows, month, residence, smiv, year],
  );

  const exportRows = filteredRows.map((row) => [
    formatDateBE(row.discharge_date),
    row.hn || "-",
    displayName(row),
    row.last_diagnosis || "-",
    row.smi_type || "-",
    displaySubstance(row),
    row.admitting_doctor || "-",
    row.discharge_type || "-",
    rawText(row, "residence_details") || "-",
  ]);

  function exportAsExcel() {
    downloadExcelFile({
      filename: `สถิติผู้ป่วยจำหน่าย${genderLabel}.xlsx`,
      sheetName: `จำหน่าย${genderLabel}`,
      headers: [
        "วันที่จำหน่าย",
        "HN",
        "ชื่อ-นามสกุล",
        "Last Dx.",
        "SMIV",
        "การใช้สารเสพติด",
        "แพทย์ที่รับผิดชอบ",
        "ข้อมูลการเยี่ยม",
        "ที่อยู่",
      ],
      rows: exportRows,
    });
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 md:px-6">
      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-sm font-medium uppercase tracking-[0.2em] text-indigo-600">Statistics</p>
            <h1 className="mt-1 text-2xl font-bold text-slate-800 md:text-3xl">{title}</h1>
          </div>
          <div className="rounded-full bg-slate-100 px-3 py-1 text-sm font-medium text-slate-700">
            ยอดรวมผู้ป่วยจำหน่าย: {filteredRows.length} ราย
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
          <FilterSelect label="ประเภทผู้ป่วย (SMI-V)" value={smiv} onChange={setSmiv}>
            {SMI_OPTIONS.map((item) => <option key={item} value={item}>{item}</option>)}
          </FilterSelect>
          <FilterSelect label="ที่อยู่" value={residence} onChange={setResidence}>
            {RESIDENCE_OPTIONS.map((item) => (
              <option key={item} value={item}>
                {item === "เร่ร่อน" ? "เร่ร่อน/อยู่สถานสงเคราะห์" : item}
              </option>
            ))}
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
            <thead className="bg-blue-600 text-white">
              <tr>
                {[
                  "วันที่จำหน่าย",
                  "HN",
                  "ชื่อ-นามสกุล",
                  "Last Dx.",
                  "SMIV",
                  "การใช้สารเสพติด",
                  "แพทย์ที่รับผิดชอบ",
                  "ข้อมูลการเยี่ยม",
                  "ที่อยู่",
                ].map((heading) => (
                  <th key={heading} className="whitespace-nowrap px-3 py-3 font-semibold">
                    {heading}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 bg-white">
              {filteredRows.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-8 text-center text-slate-500">ไม่พบข้อมูลสถิติ</td>
                </tr>
              ) : (
                filteredRows.map((row, index) => (
                  <tr key={`${row.id}-${index}`} className="hover:bg-slate-50">
                    <td className="whitespace-nowrap px-3 py-2 text-slate-700">{formatDateBE(row.discharge_date)}</td>
                    <td className="px-3 py-2 font-medium text-slate-800">{row.hn || "-"}</td>
                    <td className="px-3 py-2 text-slate-700">{displayName(row)}</td>
                    <td className="px-3 py-2 text-slate-700">{row.last_diagnosis || "-"}</td>
                    <td className="px-3 py-2 text-slate-700">{row.smi_type || "-"}</td>
                    <td className="px-3 py-2 text-slate-700">{displaySubstance(row)}</td>
                    <td className="px-3 py-2 text-slate-700">{row.admitting_doctor || "-"}</td>
                    <td className="px-3 py-2 text-slate-700">{row.discharge_type || "-"}</td>
                    <td className="px-3 py-2 text-slate-700">{rawText(row, "residence_details") || "-"}</td>
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
