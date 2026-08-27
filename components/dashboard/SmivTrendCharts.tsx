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
const PADDING = { top: 36, right: 28, bottom: 56, left: 48 };

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
  const safeData = data.length > 0 ? data : [{ key: "empty", label: "ยังไม่มีข้อมูล", value: 0 }];
  const maxValue = getMaxValue(safeData);
  const plotWidth = WIDTH - PADDING.left - PADDING.right;
  const plotHeight = HEIGHT - PADDING.top - PADDING.bottom;
  const ticks = getTicks(maxValue);

  const getX = (index: number) => {
    if (safeData.length === 1) return PADDING.left + plotWidth / 2;
    return PADDING.left + (index * plotWidth) / (safeData.length - 1);
  };

  const getY = (value: number) =>
    PADDING.top + plotHeight - (value / maxValue) * plotHeight;

  const path = safeData
    .map((item, index) => `${index === 0 ? "M" : "L"} ${getX(index)} ${getY(item.value)}`)
    .join(" ");

  return (
    <section
      className="rounded-[28px] border border-slate-200 bg-white/95 p-5 shadow-[0_18px_50px_rgba(15,23,42,0.08)] md:p-7"
      aria-labelledby={`${title}-title`}
    >
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.22em] text-indigo-600">Monthly trend</p>
        <h2
          id={`${title}-title`}
          className="mt-1 text-2xl font-bold tracking-tight text-slate-900 md:text-3xl"
        >
          {title}
        </h2>
        <p className="mt-1 text-sm text-slate-500">{description}</p>
      </div>

      <div className="mt-6 w-full overflow-x-auto">
        <svg
          viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
          className="h-auto min-w-[680px] w-full"
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
                <circle cx={x} cy={y} r="5" fill="currentColor" className="text-indigo-500" />
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

      <div className="mt-4 border-t border-slate-100 pt-4 text-sm text-slate-500">
        จำนวนผู้ป่วยที่มีประเภท SMI-V ต่อเดือน
      </div>
    </section>
  );
}

export function SmivTrendCharts({ data }: { data: SmivTrendData }) {
  return (
    <div className="mx-auto mt-6 grid w-full max-w-6xl gap-6 px-4 pb-6 md:px-6">
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
