"use client";

import { useMemo, useState } from "react";

import { downloadExcelFile } from "@/lib/utils/export";
import { formatDateBE } from "@/lib/utils/date";

export type AdmissionStatisticRow = {
  id: string;
  raw_data: Record<string, unknown>;
};

type Props = {
  genderLabel: string;
  title: string;
  initialRows: AdmissionStatisticRow[];
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

function textValue(row: AdmissionStatisticRow, key: string): string {
  const value = row.raw_data[key];
  return typeof value === "string" || typeof value === "number" ? String(value) : "";
}

function admissionDate(row: AdmissionStatisticRow): string {
  return textValue(row, "admission_date") || textValue(row, "admit_date");
}

function displayName(row: AdmissionStatisticRow): string {
  const fullName = `${textValue(row, "first_name")} ${textValue(row, "last_name")}`.trim();
  return fullName || textValue(row, "full_name") || "-";
}

function displaySubstance(row: AdmissionStatisticRow): string {
  const substance = textValue(row, "substance_type").trim();
  return substance || "ไม่ใช้";
}

export default function AdmissionStatistics({
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
            .map((row) => new Date(admissionDate(row)))
            .filter((date) => !Number.isNaN(date.getTime()))
            .map((date) => date.getFullYear() + 543),
        ),
      ).sort((a, b) => b - a),
    [initialRows],
  );

  const filteredRows = useMemo(() => {
    return initialRows.filter((row) => {
      const value = admissionDate(row);
      const date = new Date(value);
      if ((month || year) && Number.isNaN(date.getTime())) return false;
      if (month && date.getMonth() + 1 !== Number(month)) return false;
      if (year && date.getFullYear() + 543 !== Number(year)) return false;

      if (smiv && textValue(row, "smi_v_result") !== smiv) return false;

      if (residence === "เร่ร่อน") {
        if (!textValue(row, "residence_type").includes("เร่ร่อน")) return false;
      } else if (residence && textValue(row, "residence_district") !== residence) {
        return false;
      }

      return true;
    });
  }, [initialRows, month, residence, smiv, year]);

  const exportRows = filteredRows.map((row) => [
    formatDateBE(admissionDate(row)),
    textValue(row, "hn") || "-",
    displayName(row),
    textValue(row, "diagnosis") || "-",
    textValue(row, "smi_v_result") || "-",
    displaySubstance(row),
    textValue(row, "admitting_doctor") || "-",
    textValue(row, "residence_details") || "-",
  ]);

  function exportAsExcel() {
    downloadExcelFile({
      filename: `สถิติผู้ป่วยรับใหม่${genderLabel}.xlsx`,
      sheetName: `รับใหม่${genderLabel}`,
      headers: [
        "Admit",
        "HN",
        "ชื่อ-นามสกุล",
        "Dx.แรกรับ",
        "SMIV",
        "การใช้สารเสพติด",
        "แพทย์ที่รับผิดชอบ",
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
            ยอดรวมผู้ป่วยรับใหม่: {filteredRows.length} ราย
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
            {RESIDENCE_OPTIONS.map((item) => <option key={item} value={item}>{item === "เร่ร่อน" ? "เร่ร่อน/อยู่สถานสงเคราะห์" : item}</option>)}
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
                {["Admit", "HN", "ชื่อ-นามสกุล", "Dx.แรกรับ", "SMIV", "การใช้สารเสพติด", "แพทย์ที่รับผิดชอบ", "ที่อยู่"].map((heading) => <th key={heading} className="whitespace-nowrap px-3 py-3 font-semibold">{heading}</th>)}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 bg-white">
              {filteredRows.length === 0 ? (
                <tr><td colSpan={8} className="px-4 py-8 text-center text-slate-500">ไม่พบข้อมูลสถิติ</td></tr>
              ) : filteredRows.map((row, index) => (
                <tr key={`${row.id}-${index}`} className="hover:bg-slate-50">
                  <td className="whitespace-nowrap px-3 py-2 text-slate-700">{formatDateBE(admissionDate(row))}</td>
                  <td className="px-3 py-2 font-medium text-slate-800">{textValue(row, "hn") || "-"}</td>
                  <td className="px-3 py-2 text-slate-700">{displayName(row)}</td>
                  <td className="px-3 py-2 text-slate-700">{textValue(row, "diagnosis") || "-"}</td>
                  <td className="px-3 py-2 text-slate-700">{textValue(row, "smi_v_result") || "-"}</td>
                  <td className="px-3 py-2 text-slate-700">{displaySubstance(row)}</td>
                  <td className="px-3 py-2 text-slate-700">{textValue(row, "admitting_doctor") || "-"}</td>
                  <td className="px-3 py-2 text-slate-700">{textValue(row, "residence_details") || "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
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
      <select value={value} onChange={(event) => onChange(event.target.value)} className="rounded-lg border border-slate-300 bg-white px-3 py-2 font-normal outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200">
        <option value="">ทั้งหมด</option>
        {children}
      </select>
    </label>
  );
}
