"use client";

import { useMemo, useState } from "react";

import { FilterSelect, StatisticsPage } from "@/components/statistics/StatisticsPage";
import { STATISTIC_MONTHS } from "@/lib/constants/statistics";
import { downloadExcelFile } from "@/lib/utils/export";
import { getThailandDateParts } from "@/lib/utils/date";

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

export default function IncidentStatistics({ initialRows, error }: Props) {
  const [month, setMonth] = useState("");
  const [year, setYear] = useState("");
  const [gender, setGender] = useState("");

  const years = useMemo(
    () =>
      Array.from(
        new Set(
          initialRows
            .map((row) => getThailandDateParts(row.record_date))
            .filter((date): date is NonNullable<typeof date> => date !== null)
            .map((date) => date.year + 543),
        ),
      ).sort((a, b) => b - a),
    [initialRows],
  );

  const filteredRows = useMemo(
    () =>
      initialRows.filter((row) => {
        const date = getThailandDateParts(row.record_date);
        if ((month || year) && !date) return false;
        if (month && (!date || date.month !== Number(month))) return false;
        if (year && (!date || date.year + 543 !== Number(year))) return false;
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
    <StatisticsPage
      title="IOR : SMI-V"
      totalLabel="ยอดผู้ป่วยอุบัติการณ์"
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
          <FilterSelect label="หอผู้ป่วย" value={gender} onChange={setGender}>
            <option value="ชาย">ชาย</option>
            <option value="หญิง">หญิง</option>
          </FilterSelect>
        </>
      }
    >
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
    </StatisticsPage>
  );
}
