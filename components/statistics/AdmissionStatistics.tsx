"use client";

import { useMemo, useState } from "react";

import { FilterSelect, StatisticsPage } from "@/components/statistics/StatisticsPage";
import { STATISTIC_MONTHS, STATISTIC_RESIDENCE_OPTIONS, STATISTIC_SMI_OPTIONS } from "@/lib/constants/statistics";
import { downloadExcelFile } from "@/lib/utils/export";
import { formatDateBE, getThailandDateParts } from "@/lib/utils/date";

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
            .map((row) => getThailandDateParts(admissionDate(row)))
            .filter((date): date is NonNullable<typeof date> => date !== null)
            .map((date) => date.year + 543),
        ),
      ).sort((a, b) => b - a),
    [initialRows],
  );

  const filteredRows = useMemo(() => {
    return initialRows.filter((row) => {
      const date = getThailandDateParts(admissionDate(row));
      if ((month || year) && !date) return false;
      if (month && (!date || date.month !== Number(month))) return false;
      if (year && (!date || date.year + 543 !== Number(year))) return false;

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
    <StatisticsPage
      title={title}
      totalLabel="ยอดรวมผู้ป่วยรับใหม่"
      total={filteredRows.length}
      error={error}
      onExport={exportAsExcel}
      filters={
        <>
          <FilterSelect label="เดือน" value={month} onChange={setMonth}>
            {STATISTIC_MONTHS.map((item, index) => <option key={item} value={index + 1}>{item}</option>)}
          </FilterSelect>
          <FilterSelect label="ปี (พ.ศ.)" value={year} onChange={setYear}>
            {years.map((item) => <option key={item} value={item}>{item}</option>)}
          </FilterSelect>
          <FilterSelect label="ประเภทผู้ป่วย (SMI-V)" value={smiv} onChange={setSmiv}>
            {STATISTIC_SMI_OPTIONS.map((item) => <option key={item} value={item}>{item}</option>)}
          </FilterSelect>
          <FilterSelect label="ที่อยู่" value={residence} onChange={setResidence}>
            {STATISTIC_RESIDENCE_OPTIONS.map((item) => <option key={item} value={item}>{item === "เร่ร่อน" ? "เร่ร่อน/อยู่สถานสงเคราะห์" : item}</option>)}
          </FilterSelect>
        </>
      }
    >
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
    </StatisticsPage>
  );
}
