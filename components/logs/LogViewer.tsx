"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { ChevronLeft, ChevronRight, Filter, RotateCcw, Search } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useTransition } from "react";
import { useForm, useWatch } from "react-hook-form";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LOG_EVENT_OPTIONS, type LogSource } from "@/lib/logs/event-labels";
import { cn } from "@/lib/utils";
import { formatDateTimeBE } from "@/lib/utils/date";
import {
  defaultLogFilters,
  LOG_PRESET_OPTIONS,
  logFilterSchema,
  type LogFilterValues,
} from "@/lib/validation/log-filter";

export type LogEntry = {
  id: string;
  source: LogSource;
  timestamp: string;
  actor: string;
  actorRole: string;
  eventLabel: string;
  target: string;
  details: string[];
};

type LogViewerProps = {
  entries: LogEntry[];
  error: string;
  filters: LogFilterValues;
  total: number;
  page: number;
  pageSize: number;
};

function buildLogUrl(pathname: string, values: LogFilterValues, page = 1): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(values)) {
    if (value) params.set(key, value);
  }
  if (page > 1) params.set("page", String(page));
  const query = params.toString();
  return query ? `${pathname}?${query}` : pathname;
}

export default function LogViewer({
  entries,
  error,
  filters,
  total,
  page,
  pageSize,
}: LogViewerProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [isNavigating, startTransition] = useTransition();
  const {
    control,
    formState: { errors },
    getValues,
    handleSubmit,
    register,
    reset,
  } = useForm<LogFilterValues>({
    resolver: zodResolver(logFilterSchema),
    defaultValues: filters,
  });
  const preset = useWatch({ control, name: "preset" });
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const firstResult = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const lastResult = Math.min(page * pageSize, total);

  function navigate(values: LogFilterValues, targetPage = 1) {
    const normalizedValues = values.preset === "custom"
      ? values
      : { ...values, from: "", to: "" };
    startTransition(() => router.push(buildLogUrl(pathname, normalizedValues, targetPage)));
  }

  function applyQuickPreset(value: "1h" | "3h" | "12h") {
    const values = { ...getValues(), preset: value, from: "", to: "" };
    reset(values);
    navigate(values);
  }

  function clearFilters() {
    reset(defaultLogFilters);
    navigate(defaultLogFilters);
  }

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-8 md:px-6">
      <Card className="overflow-hidden border-slate-200 shadow-sm">
        <CardHeader className="border-b border-slate-200 bg-slate-50/70">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-indigo-600">Audit &amp; Activity</p>
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h1 id="log-title" className="text-2xl font-semibold tracking-tight text-slate-900 md:text-3xl">
                ประวัติการใช้งานระบบ
              </h1>
              <CardDescription className="mt-2">
                ค้นหาจากฐานข้อมูลตามช่วงเวลาประเทศไทย แสดงครั้งละ {pageSize} รายการ
              </CardDescription>
            </div>
            <span className="rounded-full bg-indigo-100 px-3 py-1 text-sm font-semibold text-indigo-700">
              {total.toLocaleString("th-TH")} รายการ
            </span>
          </div>
        </CardHeader>

        <CardContent className="p-4 md:p-6">
          {error ? (
            <Alert className="mb-5 border-destructive/40 bg-destructive/10 text-destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : null}

          <form
            className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
            onSubmit={handleSubmit((values) => navigate(values))}
          >
            <div className="flex flex-wrap items-center gap-2">
              <span className="mr-1 inline-flex items-center gap-1.5 text-sm font-semibold text-slate-700">
                <Filter aria-hidden="true" className="size-4" /> ช่วงด่วน
              </span>
              {(["1h", "3h", "12h"] as const).map((value) => (
                <Button
                  key={value}
                  type="button"
                  size="sm"
                  variant={preset === value ? "default" : "outline"}
                  aria-pressed={preset === value}
                  onClick={() => applyQuickPreset(value)}
                >
                  {LOG_PRESET_OPTIONS.find((option) => option.value === value)?.label}
                </Button>
              ))}
            </div>

            <div className="mt-4 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <div className="md:col-span-2">
                <Label htmlFor="log-query">ค้นหาชื่อ / Username / HN / กิจกรรม</Label>
                <div className="relative mt-1">
                  <Search aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
                  <Input id="log-query" className="bg-white pl-9" {...register("query")} />
                </div>
                {errors.query ? <p className="mt-1 text-sm text-destructive">{errors.query.message}</p> : null}
              </div>

              <label className="text-sm font-medium text-slate-700">
                ช่วงเวลา
                <select className="mt-1 flex h-10 w-full rounded-md border border-input bg-white px-3 py-2" {...register("preset")}>
                  {LOG_PRESET_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                </select>
              </label>

              <label className="text-sm font-medium text-slate-700">
                แหล่งข้อมูล
                <select className="mt-1 flex h-10 w-full rounded-md border border-input bg-white px-3 py-2" {...register("source")}>
                  <option value="">ทั้งหมด</option>
                  <option value="activity">กิจกรรมสำคัญ</option>
                  <option value="audit">การเปลี่ยนแปลงข้อมูล</option>
                </select>
              </label>

              <label className="text-sm font-medium text-slate-700">
                สิทธิ์ผู้ใช้งาน
                <select className="mt-1 flex h-10 w-full rounded-md border border-input bg-white px-3 py-2" {...register("actorRole")}>
                  <option value="">ทั้งหมด</option>
                  <option value="clinician">บุคลากรทางคลินิก</option>
                  <option value="auditor">ผู้ตรวจสอบ</option>
                  <option value="admin">ผู้ดูแลระบบ</option>
                </select>
              </label>

              <label className="text-sm font-medium text-slate-700 lg:col-span-2">
                กิจกรรม
                <select className="mt-1 flex h-10 w-full rounded-md border border-input bg-white px-3 py-2" {...register("eventType")}>
                  <option value="">ทั้งหมด</option>
                  <optgroup label="กิจกรรมสำคัญ">
                    {LOG_EVENT_OPTIONS.filter((option) => option.source === "activity").map((option) => (
                      <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                  </optgroup>
                  <optgroup label="การเปลี่ยนแปลงข้อมูล">
                    {LOG_EVENT_OPTIONS.filter((option) => option.source === "audit").map((option) => (
                      <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                  </optgroup>
                </select>
              </label>

              {preset === "custom" ? (
                <>
                  <div>
                    <Label htmlFor="log-from">ตั้งแต่วันและเวลา</Label>
                    <Input id="log-from" type="datetime-local" className="mt-1 bg-white" {...register("from")} />
                    {errors.from ? <p className="mt-1 text-sm text-destructive">{errors.from.message}</p> : null}
                  </div>
                  <div>
                    <Label htmlFor="log-to">ถึงวันและเวลา</Label>
                    <Input id="log-to" type="datetime-local" className="mt-1 bg-white" {...register("to")} />
                    {errors.to ? <p className="mt-1 text-sm text-destructive">{errors.to.message}</p> : null}
                  </div>
                </>
              ) : null}
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              <Button type="submit" disabled={isNavigating}>
                <Filter aria-hidden="true" className="size-4" />
                {isNavigating ? "กำลังค้นหา..." : "ใช้ตัวกรอง"}
              </Button>
              <Button type="button" variant="outline" onClick={clearFilters} disabled={isNavigating}>
                <RotateCcw aria-hidden="true" className="size-4" /> ล้างตัวกรอง
              </Button>
            </div>
          </form>

          <div className="mt-5 space-y-3" aria-live="polite" aria-busy={isNavigating}>
            {entries.length === 0 ? (
              <p className="rounded-2xl bg-slate-50 px-4 py-10 text-center text-slate-500">
                ไม่พบประวัติที่ตรงกับตัวกรอง
              </p>
            ) : entries.map((entry) => (
              <article key={entry.id} className="rounded-2xl border border-slate-200 p-4 transition-colors hover:bg-slate-50/60">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={cn(
                        "rounded-full px-2.5 py-1 text-xs font-semibold",
                        entry.source === "activity" ? "bg-indigo-100 text-indigo-700" : "bg-amber-100 text-amber-800",
                      )}>
                        {entry.source === "activity" ? "กิจกรรม" : "Audit"}
                      </span>
                      <h2 className="font-semibold text-slate-900">{entry.eventLabel}</h2>
                    </div>
                    <p className="mt-2 text-sm text-slate-700">
                      โดย <strong>{entry.actor}</strong> <span className="text-slate-500">({entry.actorRole})</span>
                    </p>
                  </div>
                  <time className="whitespace-nowrap text-sm text-slate-500" dateTime={entry.timestamp}>
                    {formatDateTimeBE(entry.timestamp)}
                  </time>
                </div>
                {entry.target ? <p className="mt-2 break-words text-sm text-slate-700"><strong>รายการ:</strong> {entry.target}</p> : null}
                {entry.details.length ? <p className="mt-1 break-words text-sm text-slate-500">{entry.details.join(" · ")}</p> : null}
              </article>
            ))}
          </div>

          <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 pt-4">
            <p className="text-sm text-slate-500">
              แสดง {firstResult.toLocaleString("th-TH")}–{lastResult.toLocaleString("th-TH")} จาก {total.toLocaleString("th-TH")} รายการ
            </p>
            <div className="flex items-center gap-2">
              <Link
                href={buildLogUrl(pathname, filters, page - 1)}
                aria-disabled={page <= 1}
                tabIndex={page <= 1 ? -1 : undefined}
                className={cn(buttonVariants({ variant: "outline", size: "sm" }), page <= 1 && "pointer-events-none opacity-50")}
              >
                <ChevronLeft aria-hidden="true" className="size-4" /> ก่อนหน้า
              </Link>
              <span className="text-sm font-medium text-slate-700">หน้า {page.toLocaleString("th-TH")} / {totalPages.toLocaleString("th-TH")}</span>
              <Link
                href={buildLogUrl(pathname, filters, page + 1)}
                aria-disabled={page >= totalPages}
                tabIndex={page >= totalPages ? -1 : undefined}
                className={cn(buttonVariants({ variant: "outline", size: "sm" }), page >= totalPages && "pointer-events-none opacity-50")}
              >
                ถัดไป <ChevronRight aria-hidden="true" className="size-4" />
              </Link>
            </div>
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
