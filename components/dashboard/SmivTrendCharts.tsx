"use client";

import {
  Download,
  FileSpreadsheet,
  Maximize2,
  Menu,
  Printer,
  Table2,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";

type MonthlyPoint = {
  key: string;
  label: string;
  value: number;
};

export type SmivTrendData = {
  admit: MonthlyPoint[];
  ior: MonthlyPoint[];
};

const WIDTH = 900;
const HEIGHT = 320;
const PADDING = { top: 52, right: 28, bottom: 56, left: 48 };

type MenuAction = {
  label: string;
  icon: typeof Maximize2;
  action: "fullscreen" | "print" | "png" | "jpeg" | "svg" | "csv" | "xls" | "table";
};

function getMaxValue(data: MonthlyPoint[]) {
  const max = Math.max(0, ...data.map((item) => item.value));
  if (max <= 5) return 5;
  return Math.ceil(max / 5) * 5;
}

function getTicks(maxValue: number) {
  const step = maxValue <= 10 ? 2 : Math.max(1, Math.ceil(maxValue / 5));
  const ticks: number[] = [];
  for (let value = 0; value <= maxValue; value += step) ticks.push(value);
  if (ticks.at(-1) !== maxValue) ticks.push(maxValue);
  return ticks;
}

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

function svgMarkupFromElement(svg: SVGSVGElement) {
  const clone = svg.cloneNode(true) as SVGSVGElement;
  clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
  clone.setAttribute("xmlns:xlink", "http://www.w3.org/1999/xlink");
  clone.setAttribute("width", String(WIDTH));
  clone.setAttribute("height", String(HEIGHT));
  return new XMLSerializer().serializeToString(clone);
}

function downloadRaster(
  svg: SVGSVGElement,
  filename: string,
  type: "image/png" | "image/jpeg",
) {
  const svgMarkup = svgMarkupFromElement(svg);
  const svgBlob = new Blob([svgMarkup], { type: "image/svg+xml;charset=utf-8" });
  const url = URL.createObjectURL(svgBlob);
  const image = new Image();

  image.onload = () => {
    const scale = 2;
    const canvas = document.createElement("canvas");
    canvas.width = WIDTH * scale;
    canvas.height = HEIGHT * scale;
    const context = canvas.getContext("2d");
    if (!context) {
      URL.revokeObjectURL(url);
      return;
    }

    if (type === "image/jpeg") {
      context.fillStyle = "#ffffff";
      context.fillRect(0, 0, canvas.width, canvas.height);
    }

    context.scale(scale, scale);
    context.drawImage(image, 0, 0, WIDTH, HEIGHT);
    canvas.toBlob((blob) => {
      if (blob) downloadBlob(blob, filename);
      URL.revokeObjectURL(url);
    }, type, 0.95);
  };

  image.onerror = () => URL.revokeObjectURL(url);
  image.src = url;
}

function downloadSvg(svg: SVGSVGElement, filename: string) {
  downloadBlob(
    new Blob([svgMarkupFromElement(svg)], { type: "image/svg+xml;charset=utf-8" }),
    filename,
  );
}

function printSvg(svg: SVGSVGElement, title: string) {
  const popup = window.open("", "_blank", "width=1000,height=760");
  if (!popup) return;

  popup.document.write(
    `<!doctype html><html><head><title>${title}</title><style>body{font-family:Arial,sans-serif;margin:32px}h1{font-size:22px;margin:0 0 6px}p{color:#64748b;margin:0 0 24px}svg{display:block;width:100%;height:auto}</style></head><body><h1>${title}</h1><p>ข้อมูลย้อนหลัง 8 เดือน</p>${svgMarkupFromElement(svg)}</body></html>`,
  );
  popup.document.close();
  popup.focus();
  popup.onafterprint = () => popup.close();
  popup.print();
}

async function downloadXls(data: MonthlyPoint[], filename: string) {
  const XLSX = await import("xlsx");
  const worksheet = XLSX.utils.json_to_sheet(
    data.map((item) => ({ เดือน: item.label, จำนวน: item.value })),
  );
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "ข้อมูล");
  XLSX.writeFile(workbook, filename, { bookType: "xls" });
}

function TrendChart({
  data,
  title,
  description,
  ariaLabel,
}: {
  data: MonthlyPoint[];
  title: string;
  description: string;
  ariaLabel: string;
}) {
  const safeData =
    data.length > 0
      ? data
      : [{ key: "empty", label: "ยังไม่มีข้อมูล", value: 0 }];
  const [menuOpen, setMenuOpen] = useState(false);
  const [showTable, setShowTable] = useState(false);
  const cardRef = useRef<HTMLElement | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!menuOpen) return;
    const handlePointerDown = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, [menuOpen]);

  const maxValue = getMaxValue(safeData);
  const plotWidth = WIDTH - PADDING.left - PADDING.right;
  const plotHeight = HEIGHT - PADDING.top - PADDING.bottom;
  const ticks = getTicks(maxValue);

  const getX = (index: number) =>
    safeData.length === 1
      ? PADDING.left + plotWidth / 2
      : PADDING.left + (index * plotWidth) / (safeData.length - 1);

  const getY = (value: number) =>
    PADDING.top + plotHeight - (value / maxValue) * plotHeight;

  const path = safeData
    .map(
      (item, index) =>
        `${index === 0 ? "M" : "L"} ${getX(index)} ${getY(item.value)}`,
    )
    .join(" ");

  const slug = title.toLowerCase().replace(/\s+/g, "-");
  const run = (action: MenuAction["action"]) => {
    setMenuOpen(false);
    if (action === "fullscreen") void cardRef.current?.requestFullscreen?.();
    else if (action === "print" && svgRef.current) printSvg(svgRef.current, title);
    else if (action === "png" && svgRef.current) downloadRaster(svgRef.current, `${slug}.png`, "image/png");
    else if (action === "jpeg" && svgRef.current) downloadRaster(svgRef.current, `${slug}.jpeg`, "image/jpeg");
    else if (action === "svg" && svgRef.current) downloadSvg(svgRef.current, `${slug}.svg`);
    else if (action === "csv") {
      const csv = ["เดือน,จำนวน", ...data.map((item) => `${escapeCsv(item.label)},${item.value}`)].join("\n");
      downloadBlob(new Blob(["\uFEFF", csv], { type: "text/csv;charset=utf-8" }), `${slug}.csv`);
    } else if (action === "xls") void downloadXls(data, `${slug}.xls`);
    else if (action === "table") setShowTable((visible) => !visible);
  };

  const menuActions: MenuAction[] = [
    { label: "View in full screen", icon: Maximize2, action: "fullscreen" },
    { label: "Print chart", icon: Printer, action: "print" },
    { label: "Download PNG image", icon: Download, action: "png" },
    { label: "Download JPEG image", icon: Download, action: "jpeg" },
    { label: "Download SVG vector image", icon: Download, action: "svg" },
    { label: "Download CSV", icon: Download, action: "csv" },
    { label: "Download XLS", icon: FileSpreadsheet, action: "xls" },
    { label: showTable ? "Hide data table" : "Show data table", icon: Table2, action: "table" },
  ];

  return (
    <section
      ref={cardRef}
      className="min-w-0 overflow-visible rounded-[28px] border border-slate-200 bg-white/95 p-3 shadow-[0_18px_50px_rgba(15,23,42,0.08)] sm:p-5 md:p-7"
      aria-labelledby={`${slug}-title`}
    >
      <div className="flex min-w-0 items-start justify-between gap-2 sm:gap-4">
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-indigo-600 sm:text-xs sm:tracking-[0.22em]">
            Monthly trend
          </p>
          <h2
            id={`${slug}-title`}
            className="mt-1 text-xl font-bold tracking-tight text-slate-900 sm:text-2xl md:text-3xl"
          >
            {title}
          </h2>
          <p className="mt-1 text-xs leading-5 text-slate-500 sm:text-sm">{description}</p>
        </div>

        <div ref={menuRef} className="relative shrink-0">
          <button
            type="button"
            onClick={() => setMenuOpen((open) => !open)}
            aria-label={`Chart options for ${title}`}
            aria-expanded={menuOpen}
            className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 shadow-sm transition hover:bg-slate-50 hover:text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-300 sm:h-10 sm:w-10"
          >
            <Menu className="h-4 w-4 sm:h-5 sm:w-5" />
          </button>

          {menuOpen && (
            <div className="absolute right-0 z-30 mt-2 w-[min(16rem,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-slate-200 bg-white p-1.5 shadow-xl">
              {menuActions.map(({ label, icon: Icon, action }) => (
                <button
                  key={label}
                  type="button"
                  onClick={() => run(action)}
                  className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm text-slate-700 transition hover:bg-slate-50 hover:text-slate-900"
                >
                  <Icon className="h-4 w-4 shrink-0 text-slate-500" />
                  <span>{label}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="mt-4 w-full min-w-0 sm:mt-6">
        <svg
          ref={svgRef}
          viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
          preserveAspectRatio="xMidYMid meet"
          className="block h-auto w-full"
          role="img"
          aria-label={ariaLabel}
        >
          {ticks.map((tick) => {
            const y = getY(tick);
            return (
              <g key={tick}>
                <line
                  x1={PADDING.left}
                  x2={WIDTH - PADDING.right}
                  y1={y}
                  y2={y}
                  stroke="currentColor"
                  strokeOpacity="0.12"
                  strokeDasharray="4 4"
                />
                <text
                  x={PADDING.left - 10}
                  y={y + 4}
                  textAnchor="end"
                  fontSize="12"
                  fill="currentColor"
                  opacity="0.55"
                >
                  {tick}
                </text>
              </g>
            );
          })}

          <path
            d={path}
            fill="none"
            stroke="currentColor"
            strokeWidth="3"
            className="text-indigo-500"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {safeData.map((item, index) => {
            const x = getX(index);
            const y = getY(item.value);
            return (
              <g key={item.key}>
                <text
                  x={x}
                  y={y - 14}
                  textAnchor="middle"
                  fontSize="12"
                  fontWeight="600"
                  fill="currentColor"
                  className="text-slate-700"
                >
                  {item.value}
                </text>
                <circle
                  cx={x}
                  cy={y}
                  r="5"
                  fill="currentColor"
                  className="text-indigo-500"
                />
                <circle cx={x} cy={y} r="2.5" fill="white" />
                <text
                  x={x}
                  y={HEIGHT - 18}
                  textAnchor="middle"
                  fontSize="12"
                  fill="currentColor"
                  className="text-slate-500"
                >
                  {item.label}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      {showTable && (
        <div className="mt-5 max-w-full overflow-x-auto rounded-2xl border border-slate-100">
          <table className="w-full min-w-[520px] border-collapse text-sm">
            <thead className="bg-slate-50 text-left text-slate-600">
              <tr>
                <th className="border-b border-slate-100 px-4 py-3 font-semibold">เดือน</th>
                <th className="border-b border-slate-100 px-4 py-3 text-right font-semibold">จำนวน</th>
              </tr>
            </thead>
            <tbody>
              {data.map((item) => (
                <tr key={item.key} className="border-b border-slate-50 last:border-b-0">
                  <td className="px-4 py-3 text-slate-700">{item.label}</td>
                  <td className="px-4 py-3 text-right font-semibold text-slate-900">{item.value}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="mt-3 border-t border-slate-100 pt-3 text-xs leading-5 text-slate-500 sm:mt-4 sm:pt-4 sm:text-sm">
        ข้อมูลย้อนหลัง 8 เดือน · จำนวนผู้ป่วยที่มีประเภท SMI-V ต่อเดือน
      </div>
    </section>
  );
}

export function SmivTrendCharts({ data }: { data: SmivTrendData }) {
  return (
    <div className="mx-auto mt-4 grid w-full max-w-6xl min-w-0 gap-4 px-3 pb-5 sm:mt-6 sm:gap-6 sm:px-4 sm:pb-6 md:px-6">
      <TrendChart
        data={data.admit}
        title="SMI-V Admit"
        description="จำนวนผู้ป่วย SMI-V ที่ Admit ในแต่ละเดือน"
        ariaLabel="กราฟเส้นแสดงจำนวนผู้ป่วย SMI-V ที่ Admit ในแต่ละเดือน"
      />
      <TrendChart
        data={data.ior}
        title="SMI-V IOR"
        description="จำนวนรายการ IOR ของผู้ป่วย SMI-V ในแต่ละเดือน"
        ariaLabel="กราฟเส้นแสดงจำนวนรายการ IOR ของผู้ป่วย SMI-V ในแต่ละเดือน"
      />
    </div>
  );
}
