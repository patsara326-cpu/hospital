"use client";

const chartData = [
  { month: "January", value: 186 },
  { month: "February", value: 305 },
  { month: "March", value: 237 },
  { month: "April", value: 73 },
  { month: "May", value: 209 },
  { month: "June", value: 214 },
];

const width = 900;
const height = 300;
const padding = { top: 36, right: 24, bottom: 44, left: 42 };
const maxValue = 340;
const plotWidth = width - padding.left - padding.right;
const plotHeight = height - padding.top - padding.bottom;

function getX(index: number) {
  if (chartData.length === 1) return padding.left + plotWidth / 2;
  return padding.left + (index * plotWidth) / (chartData.length - 1);
}

function getY(value: number) {
  return padding.top + plotHeight - (value / maxValue) * plotHeight;
}

function buildPath() {
  return chartData
    .map((item, index) => `${index === 0 ? "M" : "L"} ${getX(index)} ${getY(item.value)}`)
    .join(" ");
}

export function ChartLineLabel() {
  return (
    <section className="mx-auto mt-6 w-full max-w-6xl px-4 pb-6 md:px-6" aria-labelledby="line-chart-title">
      <div className="rounded-[28px] border border-slate-200 bg-white/95 p-5 shadow-[0_18px_50px_rgba(15,23,42,0.08)] md:p-7">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.22em] text-indigo-600">
            Line chart
          </p>
          <h2 id="line-chart-title" className="mt-1 text-2xl font-bold tracking-tight text-slate-900 md:text-3xl">
            Line Chart - Label
          </h2>
          <p className="mt-1 text-sm text-slate-500">January - June 2024</p>
        </div>

        <div className="mt-6 w-full overflow-x-auto">
          <svg
            viewBox={`0 0 ${width} ${height}`}
            className="h-auto min-w-[680px] w-full"
            role="img"
            aria-label="Line chart showing monthly values from January to June"
          >
            {[0, 100, 200, 300].map((tick) => {
              const y = getY(tick);
              return (
                <g key={tick}>
                  <line
                    x1={padding.left}
                    x2={width - padding.right}
                    y1={y}
                    y2={y}
                    stroke="currentColor"
                    strokeOpacity="0.12"
                    strokeDasharray="4 4"
                  />
                  <text
                    x={padding.left - 10}
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
              d={buildPath()}
              fill="none"
              stroke="currentColor"
              strokeWidth="3"
              className="text-indigo-500"
              strokeLinecap="round"
              strokeLinejoin="round"
            />

            {chartData.map((item, index) => {
              const x = getX(index);
              const y = getY(item.value);
              return (
                <g key={item.month}>
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
                    y={height - 14}
                    textAnchor="middle"
                    fontSize="12"
                    fill="currentColor"
                    className="text-slate-500"
                  >
                    {item.month.slice(0, 3)}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>

        <div className="mt-4 border-t border-slate-100 pt-4 text-sm text-slate-500">
          Showing total visitors for the last 6 months
        </div>
      </div>
    </section>
  );
}
