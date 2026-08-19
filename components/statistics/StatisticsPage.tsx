"use client";

import type { ReactNode } from "react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function FilterSelect({
  label,
  value,
  onChange,
  children,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  children: ReactNode;
}) {
  return (
    <label className="flex min-w-40 flex-col gap-1 text-sm font-medium text-slate-700">
      {label}
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="flex h-10 rounded-md border border-input bg-background px-3 py-2 font-normal shadow-xs outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <option value="">ทั้งหมด</option>
        {children}
      </select>
    </label>
  );
}

export function StatisticsPage({
  title,
  totalLabel,
  total,
  error,
  filters,
  onExport,
  children,
}: {
  title: string;
  totalLabel: string;
  total: number;
  error: string | null;
  filters: ReactNode;
  onExport: () => void;
  children: ReactNode;
}) {
  return (
    <div className="mx-auto max-w-7xl px-4 py-8 md:px-6">
      <Card className="rounded-3xl">
        <CardHeader className="flex-row flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-sm font-medium uppercase tracking-[0.2em] text-indigo-600">Statistics</p>
            <CardTitle className="mt-1 text-2xl md:text-3xl">{title}</CardTitle>
          </div>
          <div className="rounded-full bg-slate-100 px-3 py-1 text-sm font-medium text-slate-700">
            {totalLabel}: {total} ราย
          </div>
        </CardHeader>
        <CardContent>
          {error ? <Alert className="border-destructive/40 bg-destructive/10 text-destructive"><AlertDescription>{error}</AlertDescription></Alert> : null}
          <div className="mt-2 flex flex-wrap items-end gap-3">
            {filters}
            <Button type="button" onClick={onExport} className="bg-emerald-700 hover:bg-emerald-800">
              ⬇ ดาวน์โหลด Excel
            </Button>
          </div>
          {children}
        </CardContent>
      </Card>
    </div>
  );
}
