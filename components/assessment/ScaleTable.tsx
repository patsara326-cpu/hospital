"use client";

import type { RiskCategory } from "@/lib/utils/risk";
import RiskBadge from "./RiskBadge";

type ScaleTableProps = {
  title: string;
  items: readonly string[];
  scores: Array<number | null>;
  values: readonly number[];
  risk: RiskCategory | null;
  onChange: (index: number, value: number) => void;
};

export default function ScaleTable({ title, items, scores, values, risk, onChange }: ScaleTableProps) {
  return (
    <section className="mt-6 overflow-x-auto rounded-2xl border border-slate-200">
      <div className="flex items-center justify-between gap-3 bg-slate-50 px-4 py-3">
        <h2 className="font-semibold text-slate-800">{title}</h2>
        {risk ? <RiskBadge risk={risk} /> : null}
      </div>
      <table className="min-w-full border-collapse text-left text-sm">
        <thead className="bg-white text-slate-700">
          <tr>
            <th className="px-4 py-3 font-semibold">รายการประเมิน</th>
            {values.map((value) => (
              <th key={value} className="px-3 py-3 text-center font-semibold">{value}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-200 bg-white">
          {items.map((item, index) => (
            <tr key={item}>
              <td className="px-4 py-3 text-slate-700">{item}</td>
              {values.map((value) => (
                <td key={`${item}-${value}`} className="px-3 py-3 text-center">
                  <input
                    type="radio"
                    name={`${title}-${index}`}
                    value={value}
                    checked={scores[index] === value}
                    onChange={() => onChange(index, value)}
                    className="h-4 w-4 accent-indigo-600"
                    aria-label={`${item}: ${value}`}
                  />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
