import type { ReportExportRequest } from "@/lib/validation/report-export";

type ExcelExportOptions = ReportExportRequest;

/** Request an authenticated, audited XLSX export and download the response. */
export async function downloadExcelFile(options: ExcelExportOptions) {
  const response = await fetch("/api/reports/export", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(options),
  });
  if (!response.ok) {
    const result = await response.json().catch(() => null) as { error?: string } | null;
    throw new Error(result?.error ?? "ไม่สามารถสร้างไฟล์ Excel ได้");
  }

  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = options.filename;
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
}
