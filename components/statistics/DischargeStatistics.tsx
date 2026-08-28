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
  first_name: string | null;
  last_name: string | null;
  substance_type: string | null;
  residence_type: string | null;
  residence_district: string | null;
  residence_details: string | null;
};

type Props = {
  genderLabel: "ชาย" | "หญิง";
  title: string;
  initialRows: DischargeStatisticRow[];
  total: number;
  years: number[];
  filters: StatisticReportFilters;
  pageSize: number;
  routePath: string;
  error: string | null;
};

function displayName(row: DischargeStatisticRow): string {
  const first = row.first_name ?? "";
  const last = row.last_name ?? "";
  return first || last ? `${first} ${last}`.trim() : row.full_name || "-";
}

function displaySubstance(row: DischargeStatisticRow): string {
  const substance = row.substance_type?.trim() ?? "";
  return substance || "ไม่ใช้";
}

export default function DischargeStatistics({
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

  function destination(changes: Partial<StatisticReportFilters>) {
    const params = filtersToSearchParams(filters, changes);
    const query = params.toString();
    return query ? `${routePath}?${query}` : routePath;
  }

  function prefetch(changes: Partial<StatisticReportFilters>) {
    router.prefetch(destination(changes));
  }

  function navigate(changes: Partial<StatisticReportFilters>) {
    startNavigation(() => router.replace(destination(changes), { scroll: false }));
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
      reportType: "discharge",
      filename: `สถิติผู้ป่วยจำหน่าย${genderLabel}.xlsx`,
      sheetName: `จำหน่าย${genderLabel}`,
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
      totalLabel="ยอดรวมผู้ป่วยจำหน่าย"
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
            {STATISTIC_RESIDENCE_OPTIONS.map((item) => (
              <option key={item} value={item}>
                {item === "เร่ร่อน" ? "เร่ร่อน/อยู่สถานสงเคราะห์" : item}
              </option>
            ))}
          </FilterSelect>
        </>
      }
    >
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
              {initialRows.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-8 text-center text-slate-500">ไม่พบข้อมูลสถิติ</td>
                </tr>
              ) : (
                initialRows.map((row, index) => (
                  <tr key={`${row.id}-${index}`} className="hover:bg-slate-50">
                    <td className="whitespace-nowrap px-3 py-2 text-slate-700">{formatDateBE(row.discharge_date)}</td>
                    <td className="px-3 py-2 font-medium text-slate-800">{row.hn || "-"}</td>
                    <td className="px-3 py-2 text-slate-700">{displayName(row)}</td>
                    <td className="px-3 py-2 text-slate-700">{row.last_diagnosis || "-"}</td>
                    <td className="px-3 py-2 text-slate-700">{row.smi_type || "-"}</td>
                    <td className="px-3 py-2 text-slate-700">{displaySubstance(row)}</td>
                    <td className="px-3 py-2 text-slate-700">{row.admitting_doctor || "-"}</td>
                    <td className="px-3 py-2 text-slate-700">{row.discharge_type || "-"}</td>
                    <td className="px-3 py-2 text-slate-700">{row.residence_details || "-"}</td>
                  </tr>
                ))
              )}
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
              onPointerEnter={() => prefetch({ page: filters.page - 1 })}
              onFocus={() => prefetch({ page: filters.page - 1 })}
              onClick={() => navigate({ page: filters.page - 1 })}
            >
              ก่อนหน้า
            </button>
            <button
              type="button"
              className="rounded-lg border border-slate-300 px-3 py-1.5 disabled:cursor-not-allowed disabled:opacity-50"
              disabled={navigationPending || filters.page >= totalPages}
              onPointerEnter={() => prefetch({ page: filters.page + 1 })}
              onFocus={() => prefetch({ page: filters.page + 1 })}
              onClick={() => navigate({ page: filters.page + 1 })}
            >
              ถัดไป
            </button>
          </div>
        </div>
    </StatisticsPage>
  );
}
