"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMemo } from "react";
import { useForm, useWatch } from "react-hook-form";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatDateTimeBE } from "@/lib/utils/date";
import { logFilterSchema, type LogFilterValues } from "@/lib/validation/log-filter";

export type LogEntry = {
  id: string;
  source: "activity" | "audit";
  timestamp: string;
  actor: string;
  actorRole: string;
  eventType: string;
  target: string;
  details: string[];
};

const EVENT_LABELS: Record<string, string> = {
  "auth.login": "เข้าสู่ระบบ",
  "auth.logout": "ออกจากระบบ",
  "patient.registered": "ลงทะเบียนผู้ป่วย",
  "patient.updated": "แก้ไขข้อมูลผู้ป่วย",
  "patient.discharged": "จำหน่ายผู้ป่วย",
  "assessment.saved": "บันทึกประเมินรายเวร",
  "ior.saved": "บันทึก IOR",
  "report.exported": "ส่งออก Excel",
};

const defaultFilters: LogFilterValues = {
  query: "",
  source: "",
  actorRole: "",
  eventType: "",
};

export default function LogViewer({ entries, error }: { entries: LogEntry[]; error: string }) {
  const { control, register, reset } = useForm<LogFilterValues>({
    resolver: zodResolver(logFilterSchema),
    defaultValues: defaultFilters,
  });
  const filters = useWatch({ control });

  const eventTypes = useMemo(
    () => Array.from(new Set(entries.map((entry) => entry.eventType))).sort(),
    [entries],
  );
  const filteredEntries = useMemo(() => {
    const query = filters.query?.trim().toLocaleLowerCase("th") ?? "";
    return entries.filter((entry) => {
      if (filters.source && entry.source !== filters.source) return false;
      if (filters.actorRole && entry.actorRole !== filters.actorRole) return false;
      if (filters.eventType && entry.eventType !== filters.eventType) return false;
      if (!query) return true;
      return [entry.actor, entry.target, entry.eventType, EVENT_LABELS[entry.eventType], ...entry.details]
        .filter(Boolean)
        .join(" ")
        .toLocaleLowerCase("th")
        .includes(query);
    });
  }, [entries, filters.actorRole, filters.eventType, filters.query, filters.source]);

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 md:px-6">
      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm md:p-6" aria-labelledby="log-title">
        <p className="text-sm font-medium uppercase tracking-[0.2em] text-indigo-600">Audit &amp; Activity</p>
        <div className="mt-1 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 id="log-title" className="text-2xl font-bold text-slate-800 md:text-3xl">ประวัติการใช้งานระบบ</h1>
            <p className="mt-1 text-sm text-slate-500">แสดงรายการล่าสุดสูงสุด 500 รายการ เวลาไทย (พ.ศ.)</p>
          </div>
          <span className="rounded-full bg-slate-100 px-3 py-1 text-sm text-slate-700">{filteredEntries.length} รายการ</span>
        </div>

        {error ? <Alert className="mt-5 border-destructive/40 bg-destructive/10 text-destructive"><AlertDescription>{error}</AlertDescription></Alert> : null}

        <form className="mt-6 grid gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 md:grid-cols-2 lg:grid-cols-5" onSubmit={(event) => event.preventDefault()}>
          <div className="lg:col-span-2">
            <Label htmlFor="log-query">ค้นหาผู้ใช้ / HN / กิจกรรม</Label>
            <Input id="log-query" className="mt-1 bg-white" {...register("query")} />
          </div>
          <label className="text-sm font-medium text-slate-700">
            แหล่งข้อมูล
            <select className="mt-1 flex h-10 w-full rounded-md border border-input bg-white px-3 py-2" {...register("source")}>
              <option value="">ทั้งหมด</option><option value="activity">กิจกรรม</option><option value="audit">การเปลี่ยนข้อมูล</option>
            </select>
          </label>
          <label className="text-sm font-medium text-slate-700">
            สิทธิ์ผู้ใช้
            <select className="mt-1 flex h-10 w-full rounded-md border border-input bg-white px-3 py-2" {...register("actorRole")}>
              <option value="">ทั้งหมด</option><option value="clinician">Clinician</option><option value="auditor">Auditor</option><option value="admin">Admin</option><option value="pending">Pending</option>
            </select>
          </label>
          <label className="text-sm font-medium text-slate-700">
            กิจกรรม
            <select className="mt-1 flex h-10 w-full rounded-md border border-input bg-white px-3 py-2" {...register("eventType")}>
              <option value="">ทั้งหมด</option>
              {eventTypes.map((eventType) => <option key={eventType} value={eventType}>{EVENT_LABELS[eventType] ?? eventType}</option>)}
            </select>
          </label>
          <div className="lg:col-span-5"><Button type="button" variant="outline" onClick={() => reset(defaultFilters)}>ล้างตัวกรอง</Button></div>
        </form>

        <div className="mt-5 space-y-3" aria-live="polite">
          {filteredEntries.length === 0 ? (
            <p className="rounded-2xl bg-slate-50 px-4 py-8 text-center text-slate-500">ไม่พบประวัติที่ตรงกับตัวกรอง</p>
          ) : filteredEntries.map((entry) => (
            <article key={`${entry.source}-${entry.id}`} className="rounded-2xl border border-slate-200 p-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${entry.source === "activity" ? "bg-indigo-100 text-indigo-700" : "bg-amber-100 text-amber-800"}`}>{entry.source === "activity" ? "กิจกรรม" : "Audit"}</span>
                    <h2 className="font-semibold text-slate-900">{EVENT_LABELS[entry.eventType] ?? entry.eventType}</h2>
                  </div>
                  <p className="mt-2 text-sm text-slate-700">โดย <strong>{entry.actor || "ระบบ"}</strong> ({entry.actorRole || "ไม่ระบุสิทธิ์"})</p>
                </div>
                <time className="text-sm text-slate-500" dateTime={entry.timestamp}>{formatDateTimeBE(entry.timestamp)}</time>
              </div>
              {entry.target ? <p className="mt-2 text-sm text-slate-700"><strong>รายการ:</strong> {entry.target}</p> : null}
              {entry.details.length ? <p className="mt-1 break-words text-sm text-slate-500">{entry.details.join(" · ")}</p> : null}
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
