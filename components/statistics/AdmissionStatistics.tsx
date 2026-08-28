"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";

import { FilterSelect, StatisticsPage } from "@/components/statistics/StatisticsPage";
import {
  STATISTIC_MONTHS,
  STATISTIC_RESIDENCE_OPTIONS,
  STATISTIC_SMI_OPTIONS,
} from "@/lib/constants/statistics";
import {
  filtersToSearchParams,
  type StatisticReportFilters,
} from "@/lib/statistics/report-filters";
import { downloadExcelFile } from "@/lib/utils/export";
import { formatDateBE } from "@/lib/utils/date";

export type AdmissionStatisticRow = {
  id: string;
  admission_date: string;
  admitting_doctor: string | null;
  diagnosis: string | null;
  first_name: string | null;
  full_name: string | null;
  hn: string | null;
  last_name: string | null;
  residence_details: string | null;
  residence_district: string | null;
  residence_type: string | null;
  smi_v_result: string | null;
  substance_type: string | null;
};

type Props = {
  genderLabel: "ชาย" | "หญิง";
  title: string;
  initialRows: AdmissionStatisticRow[];
  total: number;
  years: number[];
  filters: StatisticReportFilters;
  pageSize: number;
  routePath: string;
  error: string | null;
};

function admissionDate(row: AdmissionStatisticRow): string {
  return row.admission_date;
}

function displayName(row: AdmissionStatisticRow): string {
  const fullName = `${row.first_name ?? ""} ${row.last_name ?? ""}`.trim();
  return fullName || row.full_name || "-";
}

function displaySubstance(row: AdmissionStatisticRow): string {
  const substance = row.substance_type?.trim() ?? "";
  return substance || "ไม่ใช้";
}

export default function AdmissionStatistics({
  genderLabel,
  title,
  initialRows,
  total,
  years,
  filters,
  pageSize,
  routePath,
  error,
}: Props) {
  const router = useRouter();
  const [navigationPending, startNavigation] = useTransition();
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  function navigate(changes: Partial<StatisticReportFilters>) {
    const params = filtersToSearchParams(filters, changes);
    const query = params.toString();
    startNavigation(() => router.replace(query ? `${routePath}?${query}` : routePath, { scroll: false }));
  }

  function changeFilter(
    key: "month" | "year" | "smiv" | "residence",
    value: string,
  ) {
    navigate({ [key]: value, page: 1 });
  }

  async function exportAsExcel() {
    await downloadExcelFile({
      source: "database",
      reportType: "admission",
      filename: `สถิติผู้ป่วยรับใหม่${genderLabel}.xlsx`,
      sheetName: `รับใหม่${genderLabel}`,
      filters: {
        gender: genderLabel,
        month: filters.month,
        year: filters.year,
        smi_filter: filters.smiv,
        residence_filter: filters.residence,
      },
    });
  }

  return (
    <StatisticsPage
      title={title}
      totalLabel="ยอดรวมผู้ป่วยรับใหม่"
      total={total}
      error={error}
      onExport={exportAsExcel}
      filters={
        <>
          <FilterSelect label="เดือน" value={filters.month} onChange={(value) => changeFilter("month", value)}>
            {STATISTIC_MONTHS.map((item, index) => <option key={item} value={index + 1}>{item}</option>)}
          </FilterSelect>
          <FilterSelect label="ปี (พ.ศ.)" value={filters.year} onChange={(value) => changeFilter("year", value)}>
            {years.map((item) => <option key={item} value={item}>{item}</option>)}
          </FilterSelect>
          <FilterSelect label="ประเภทผู้ป่วย (SMI-V)" value={filters.smiv} onChange={(value) => changeFilter("smiv", value)}>
            {STATISTIC_SMI_OPTIONS.map((item) => <option key={item} value={item}>{item}</option>)}
          </FilterSelect>
          <FilterSelect label="ที่อยู่" value={filters.residence} onChange={(value) => changeFilter("residence", value)}>
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
              {initialRows.length === 0 ? (
                <tr><td colSpan={8} className="px-4 py-8 text-center text-slate-500">ไม่พบข้อมูลสถิติ</td></tr>
              ) : initialRows.map((row, index) => (
                <tr key={`${row.id}-${index}`} className="hover:bg-slate-50">
                  <td className="whitespace-nowrap px-3 py-2 text-slate-700">{formatDateBE(admissionDate(row))}</td>
                  <td className="px-3 py-2 font-medium text-slate-800">{row.hn || "-"}</td>
                  <td className="px-3 py-2 text-slate-700">{displayName(row)}</td>
                  <td className="px-3 py-2 text-slate-700">{row.diagnosis || "-"}</td>
                  <td className="px-3 py-2 text-slate-700">{row.smi_v_result || "-"}</td>
                  <td className="px-3 py-2 text-slate-700">{displaySubstance(row)}</td>
                  <td className="px-3 py-2 text-slate-700">{row.admitting_doctor || "-"}</td>
                  <td className="px-3 py-2 text-slate-700">{row.residence_details || "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-sm text-slate-600">
          <span>{navigationPending ? "กำลังโหลดข้อมูล..." : `หน้า ${filters.page} จาก ${totalPages}`}</span>
          <div className="flex gap-2">
            <button
              type="button"
              className="rounded-lg border border-slate-300 px-3 py-1.5 disabled:cursor-not-allowed disabled:opacity-50"
              disabled={navigationPending || filters.page <= 1}
              onClick={() => navigate({ page: filters.page - 1 })}
            >
              ก่อนหน้า
            </button>
            <button
              type="button"
              className="rounded-lg border border-slate-300 px-3 py-1.5 disabled:cursor-not-allowed disabled:opacity-50"
              disabled={navigationPending || filters.page >= totalPages}
              onClick={() => navigate({ page: filters.page + 1 })}
            >
              ถัดไป
            </button>
          </div>
        </div>
    </StatisticsPage>
  );
}
