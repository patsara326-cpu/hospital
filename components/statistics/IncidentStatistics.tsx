"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";

import { FilterSelect, StatisticsPage } from "@/components/statistics/StatisticsPage";
import { STATISTIC_MONTHS, STATISTIC_SMI_OPTIONS } from "@/lib/constants/statistics";
import { incidentFiltersToSearchParams, type IncidentReportFilters } from "@/lib/statistics/report-filters";
import { downloadExcelFile } from "@/lib/utils/export";

export type IncidentStatisticRow = {
  id: string; hn: string; record_date: string | null; level: string | null;
  full_name: string; gender: string; smi_type: string;
};

export default function IncidentStatistics({ initialRows, total, years, filters, pageSize, routePath, error }: {
  initialRows: IncidentStatisticRow[];
  total: number;
  years: number[];
  filters: IncidentReportFilters;
  pageSize: number;
  routePath: string;
  error: string | null;
}) {
  const router = useRouter();
  const [navigationPending, startNavigation] = useTransition();
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  function navigate(changes: Partial<IncidentReportFilters>) {
    const params = incidentFiltersToSearchParams(filters, changes);
    const query = params.toString();
    startNavigation(() => router.replace(query ? `${routePath}?${query}` : routePath, { scroll: false }));
  }
  function changeFilter(key: "month" | "year" | "gender" | "smiv", value: string) {
    navigate({ [key]: value, page: 1 });
  }
  async function exportAsExcel() {
    await downloadExcelFile({
      source: "database", reportType: "incidents", filename: "สถิติผู้ป่วยอุบัติการณ์_IOR.xlsx",
      sheetName: "สถิติอุบัติการณ์ IOR",
      filters: { gender: filters.gender, month: filters.month, year: filters.year, smi_filter: filters.smiv },
    });
  }

  return <StatisticsPage title="IOR : SMI-V" totalLabel="ยอดผู้ป่วยอุบัติการณ์" total={total} error={error} onExport={exportAsExcel}
    filters={<>
      <FilterSelect label="เดือน" value={filters.month} onChange={(value) => changeFilter("month", value)}>{STATISTIC_MONTHS.map((item, index) => <option key={item} value={index + 1}>{item}</option>)}</FilterSelect>
      <FilterSelect label="ปี (พ.ศ.)" value={filters.year} onChange={(value) => changeFilter("year", value)}>{years.map((item) => <option key={item} value={item}>{item}</option>)}</FilterSelect>
      <FilterSelect label="หอผู้ป่วย" value={filters.gender} onChange={(value) => changeFilter("gender", value)}><option value="ชาย">ชาย</option><option value="หญิง">หญิง</option></FilterSelect>
      <FilterSelect label="ประเภทผู้ป่วย (SMI-V)" value={filters.smiv} onChange={(value) => changeFilter("smiv", value)}>{STATISTIC_SMI_OPTIONS.map((item) => <option key={item} value={item}>{item}</option>)}</FilterSelect>
    </>}>
    <div className={`mt-6 overflow-x-auto rounded-2xl border border-slate-200 ${navigationPending ? "opacity-60" : ""}`} aria-busy={navigationPending}>
      <table className="min-w-full divide-y divide-slate-200 text-left text-sm"><thead className="bg-amber-600 text-white"><tr>{["HN", "ชื่อ-สกุล", "SMIV type", "Level"].map((heading) => <th key={heading} className="whitespace-nowrap px-3 py-3 font-semibold">{heading}</th>)}</tr></thead>
        <tbody className="divide-y divide-slate-200 bg-white">{initialRows.length === 0 ? <tr><td colSpan={4} className="px-4 py-8 text-center text-slate-500">ยังไม่มีข้อมูล IOR</td></tr> : initialRows.map((row) => <tr key={row.id} className="hover:bg-slate-50"><td className="px-3 py-2 font-medium text-slate-800">{row.hn || "-"}</td><td className="px-3 py-2 text-slate-700">{row.full_name || "-"}</td><td className="px-3 py-2 text-slate-700">{row.smi_type || "-"}</td><td className="px-3 py-2 text-slate-700">{row.level || "-"}</td></tr>)}</tbody>
      </table>
    </div>
    <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-sm text-slate-600"><span>{navigationPending ? "กำลังโหลดข้อมูล..." : `หน้า ${filters.page} จาก ${totalPages}`}</span><div className="flex gap-2"><button type="button" className="rounded-lg border border-slate-300 px-3 py-1.5 disabled:opacity-50" disabled={navigationPending || filters.page <= 1} onClick={() => navigate({ page: filters.page - 1 })}>ก่อนหน้า</button><button type="button" className="rounded-lg border border-slate-300 px-3 py-1.5 disabled:opacity-50" disabled={navigationPending || filters.page >= totalPages} onClick={() => navigate({ page: filters.page + 1 })}>ถัดไป</button></div></div>
  </StatisticsPage>;
}
