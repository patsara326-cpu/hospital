import ChartActions from "@/components/dashboard/ChartActions";

type MonthlyPoint = { key: string; label: string; value: number };

export type SmivTrendData = {
  admit: MonthlyPoint[];
  ior: MonthlyPoint[];
};

const WIDTH = 900;
const HEIGHT = 320;
const PADDING = { top: 52, right: 28, bottom: 56, left: 48 };

function getMaxValue(data: MonthlyPoint[]) {
  const max = Math.max(0, ...data.map((item) => item.value));
  return max <= 5 ? 5 : Math.ceil(max / 5) * 5;
}

function getTicks(maxValue: number) {
  const step = maxValue <= 10 ? 2 : Math.max(1, Math.ceil(maxValue / 5));
  const ticks: number[] = [];
  for (let value = 0; value <= maxValue; value += step) ticks.push(value);
  if (ticks.at(-1) !== maxValue) ticks.push(maxValue);
  return ticks;
}

function TrendChart({ data, title, description, ariaLabel }: {
  data: MonthlyPoint[];
  title: string;
  description: string;
  ariaLabel: string;
}) {
  const safeData = data.length > 0 ? data : [{ key: "empty", label: "ยังไม่มีข้อมูล", value: 0 }];
  const maxValue = getMaxValue(safeData);
  const plotWidth = WIDTH - PADDING.left - PADDING.right;
  const plotHeight = HEIGHT - PADDING.top - PADDING.bottom;
  const ticks = getTicks(maxValue);
  const getX = (index: number) => safeData.length === 1
    ? PADDING.left + plotWidth / 2
    : PADDING.left + (index * plotWidth) / (safeData.length - 1);
  const getY = (value: number) => PADDING.top + plotHeight - (value / maxValue) * plotHeight;
  const path = safeData.map((item, index) => `${index === 0 ? "M" : "L"} ${getX(index)} ${getY(item.value)}`).join(" ");
  const slug = title.toLowerCase().replace(/\s+/g, "-");
  const chartId = `${slug}-chart`;

  return (
    <section className="min-w-0 overflow-visible rounded-[28px] border border-slate-200 bg-white/95 p-3 shadow-[0_18px_50px_rgba(15,23,42,0.08)] sm:p-5 md:p-7" aria-labelledby={`${slug}-title`}>
      <div className="flex min-w-0 items-start justify-between gap-2 sm:gap-4">
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-indigo-600 sm:text-xs sm:tracking-[0.22em]">Monthly trend</p>
          <h2 id={`${slug}-title`} className="mt-1 text-xl font-bold tracking-tight text-slate-900 sm:text-2xl md:text-3xl">{title}</h2>
          <p className="mt-1 text-xs leading-5 text-slate-500 sm:text-sm">{description}</p>
        </div>
        <ChartActions chartId={chartId} title={title} slug={slug} data={data} />
      </div>

      <div className="mt-4 w-full min-w-0 sm:mt-6">
        <svg id={chartId} viewBox={`0 0 ${WIDTH} ${HEIGHT}`} preserveAspectRatio="xMidYMid meet" className="block h-auto w-full" role="img" aria-label={ariaLabel}>
          {ticks.map((tick) => {
            const y = getY(tick);
            return (
              <g key={tick}>
                <line x1={PADDING.left} x2={WIDTH - PADDING.right} y1={y} y2={y} stroke="currentColor" strokeOpacity="0.12" strokeDasharray="4 4" />
                <text x={PADDING.left - 10} y={y + 4} textAnchor="end" fontSize="12" fill="currentColor" opacity="0.55">{tick}</text>
              </g>
            );
          })}
          <path d={path} fill="none" stroke="currentColor" strokeWidth="3" className="text-indigo-500" strokeLinecap="round" strokeLinejoin="round" />
          {safeData.map((item, index) => {
            const x = getX(index);
            const y = getY(item.value);
            return (
              <g key={item.key}>
                <text x={x} y={y - 14} textAnchor="middle" fontSize="12" fontWeight="600" fill="currentColor" className="text-slate-700">{item.value}</text>
                <circle cx={x} cy={y} r="5" fill="currentColor" className="text-indigo-500" />
                <circle cx={x} cy={y} r="2.5" fill="white" />
                <text x={x} y={HEIGHT - 18} textAnchor="middle" fontSize="12" fill="currentColor" className="text-slate-500">{item.label}</text>
              </g>
            );
          })}
        </svg>
      </div>

      <details className="mt-5 max-w-full overflow-hidden rounded-2xl border border-slate-100">
        <summary className="cursor-pointer bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-600">แสดงตารางข้อมูล</summary>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[520px] border-collapse text-sm">
            <thead className="bg-slate-50 text-left text-slate-600"><tr><th className="border-b border-slate-100 px-4 py-3 font-semibold">เดือน</th><th className="border-b border-slate-100 px-4 py-3 text-right font-semibold">จำนวน</th></tr></thead>
            <tbody>{data.map((item) => <tr key={item.key} className="border-b border-slate-50 last:border-b-0"><td className="px-4 py-3 text-slate-700">{item.label}</td><td className="px-4 py-3 text-right font-semibold text-slate-900">{item.value}</td></tr>)}</tbody>
          </table>
        </div>
      </details>

    </section>
  );
}

export function SmivTrendCharts({ data }: { data: SmivTrendData }) {
  return (
    <div className="mx-auto mt-4 grid w-full max-w-6xl min-w-0 gap-4 px-3 pb-5 sm:mt-6 sm:gap-6 sm:px-4 sm:pb-6 md:px-6">
      <TrendChart data={data.admit} title="SMI-V Admit" description="จำนวนผู้ป่วย SMI-V ที่ Admit ในแต่ละเดือน" ariaLabel="กราฟเส้นแสดงจำนวนผู้ป่วย SMI-V ที่ Admit ในแต่ละเดือน" />
      <TrendChart data={data.ior} title="SMI-V IOR" description="จำนวนรายการ IOR ของผู้ป่วย SMI-V ในแต่ละเดือน" ariaLabel="กราฟเส้นแสดงจำนวนรายการ IOR ของผู้ป่วย SMI-V ในแต่ละเดือน" />
    </div>
  );
}
