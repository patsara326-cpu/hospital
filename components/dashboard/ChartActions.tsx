"use client";

import { Download, FileSpreadsheet, Maximize2, Menu, Printer } from "lucide-react";

type MonthlyPoint = { key: string; label: string; value: number };
type ChartAction = "fullscreen" | "print" | "png" | "jpeg" | "svg" | "csv" | "xls";

function escapeCsv(value: string | number) {
  const text = String(value);
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function svgMarkup(svg: SVGSVGElement) {
  const clone = svg.cloneNode(true) as SVGSVGElement;
  clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
  clone.setAttribute("xmlns:xlink", "http://www.w3.org/1999/xlink");
  clone.setAttribute("width", "900");
  clone.setAttribute("height", "320");
  return new XMLSerializer().serializeToString(clone);
}

function downloadRaster(svg: SVGSVGElement, filename: string, type: "image/png" | "image/jpeg") {
  const blob = new Blob([svgMarkup(svg)], { type: "image/svg+xml;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const image = new Image();
  image.onload = () => {
    const canvas = document.createElement("canvas");
    canvas.width = 1800;
    canvas.height = 640;
    const context = canvas.getContext("2d");
    if (!context) { URL.revokeObjectURL(url); return; }
    if (type === "image/jpeg") {
      context.fillStyle = "#ffffff";
      context.fillRect(0, 0, canvas.width, canvas.height);
    }
    context.scale(2, 2);
    context.drawImage(image, 0, 0, 900, 320);
    canvas.toBlob((result) => {
      if (result) downloadBlob(result, filename);
      URL.revokeObjectURL(url);
    }, type, 0.95);
  };
  image.onerror = () => URL.revokeObjectURL(url);
  image.src = url;
}

function printSvg(svg: SVGSVGElement, title: string) {
  const popup = window.open("", "_blank", "width=1000,height=760");
  if (!popup) return;
  popup.document.write(`<!doctype html><html><head><title>${title}</title><style>body{font-family:Arial,sans-serif;margin:32px}h1{font-size:22px;margin:0 0 6px}p{color:#64748b;margin:0 0 24px}svg{display:block;width:100%;height:auto}</style></head><body><h1>${title}</h1><p>ข้อมูลย้อนหลัง 8 เดือน</p>${svgMarkup(svg)}</body></html>`);
  popup.document.close();
  popup.focus();
  popup.onafterprint = () => popup.close();
  popup.print();
}

async function downloadXls(data: MonthlyPoint[], filename: string) {
  const XLSX = await import("xlsx");
  const worksheet = XLSX.utils.json_to_sheet(data.map((item) => ({ เดือน: item.label, จำนวน: item.value })));
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "ข้อมูล");
  XLSX.writeFile(workbook, filename, { bookType: "xls" });
}

export default function ChartActions({ chartId, title, slug, data }: {
  chartId: string;
  title: string;
  slug: string;
  data: MonthlyPoint[];
}) {
  function run(action: ChartAction) {
    const element = document.getElementById(chartId);
    if (!(element instanceof SVGSVGElement)) return;
    if (action === "fullscreen") void element.closest("section")?.requestFullscreen?.();
    else if (action === "print") printSvg(element, title);
    else if (action === "png") downloadRaster(element, `${slug}.png`, "image/png");
    else if (action === "jpeg") downloadRaster(element, `${slug}.jpeg`, "image/jpeg");
    else if (action === "svg") downloadBlob(new Blob([svgMarkup(element)], { type: "image/svg+xml;charset=utf-8" }), `${slug}.svg`);
    else if (action === "csv") {
      const csv = ["เดือน,จำนวน", ...data.map((item) => `${escapeCsv(item.label)},${item.value}`)].join("\n");
      downloadBlob(new Blob(["\uFEFF", csv], { type: "text/csv;charset=utf-8" }), `${slug}.csv`);
    } else if (action === "xls") void downloadXls(data, `${slug}.xls`);
  }

  const actions = [
    ["View in full screen", Maximize2, "fullscreen"],
    ["Print chart", Printer, "print"],
    ["Download PNG image", Download, "png"],
    ["Download JPEG image", Download, "jpeg"],
    ["Download SVG vector image", Download, "svg"],
    ["Download CSV", Download, "csv"],
    ["Download XLS", FileSpreadsheet, "xls"],
  ] as const;

  return (
    <details className="relative shrink-0">
      <summary className="flex h-9 w-9 cursor-pointer list-none items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 shadow-sm transition hover:bg-slate-50 hover:text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-300 sm:h-10 sm:w-10" aria-label={`Chart options for ${title}`}>
        <Menu className="h-4 w-4 sm:h-5 sm:w-5" />
      </summary>
      <div className="absolute right-0 z-30 mt-2 w-[min(16rem,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-slate-200 bg-white p-1.5 shadow-xl">
        {actions.map(([label, Icon, action]) => (
          <button
            key={action}
            type="button"
            onClick={(event) => {
              run(action);
              event.currentTarget.closest("details")?.removeAttribute("open");
            }}
            className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm text-slate-700 transition hover:bg-slate-50 hover:text-slate-900"
          >
            <Icon className="h-4 w-4 shrink-0 text-slate-500" />
            <span>{label}</span>
          </button>
        ))}
      </div>
    </details>
  );
}
