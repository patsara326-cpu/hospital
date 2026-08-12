import * as XLSX from "xlsx";

type ExcelExportOptions = {
  filename: string;
  sheetName: string;
  headers: string[];
  rows: string[][];
};

/** Create a real XLSX workbook from the source data array (without reading rendered DOM). */
export function downloadExcelFile({ filename, sheetName, headers, rows }: ExcelExportOptions) {
  const workbook = XLSX.utils.book_new();
  const worksheet = XLSX.utils.aoa_to_sheet([headers, ...rows]);
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName.slice(0, 31) || "Sheet1");
  const output = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
  const blob = new Blob([output], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename.replace(/\.xls$/i, ".xlsx");
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
}
