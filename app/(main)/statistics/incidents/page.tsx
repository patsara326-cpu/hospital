"use client";

import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { useEffect, useState } from "react";

type IncidentRow = {
  id?: number;
  hn: string;
  full_name: string | null;
  level: string | null;
  incident_type: string | null;
  incident_date: string | null;
  detail: string | null;
};

export default function IncidentStatisticsPage() {
  const [rows, setRows] = useState<IncidentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      const supabase = createSupabaseBrowserClient();
      if (!supabase) {
        setError("ยังไม่ได้ตั้งค่า Supabase environment variables");
        setLoading(false);
        return;
      }

      const { data, error: queryError } = await supabase
        .from("ior_records")
        .select("hn, full_name, level, incident_type, incident_date, detail")
        .order("incident_date", { ascending: false });

      if (queryError) {
        setError(queryError.message);
        setRows([]);
      } else {
        setRows((data as IncidentRow[]) ?? []);
      }

      setLoading(false);
    }

    void load();
  }, []);

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 md:px-6">
      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-medium uppercase tracking-[0.2em] text-indigo-600">
              Statistics
            </p>
            <h1 className="mt-1 text-3xl font-bold text-slate-800">
              สถิติอุบัติการณ์ IOR
            </h1>
          </div>
          <div className="rounded-full bg-slate-100 px-3 py-1 text-sm font-medium text-slate-700">
            {rows.length} รายการ
          </div>
        </div>

        {error ? (
          <div className="mt-5 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </div>
        ) : null}

        {loading ? (
          <div className="mt-5 text-slate-600">กำลังโหลดข้อมูล...</div>
        ) : (
          <div className="mt-6 overflow-x-auto rounded-2xl border border-slate-200">
            <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
              <thead className="bg-slate-50 text-slate-700">
                <tr>
                  <th className="px-4 py-3 font-semibold">HN</th>
                  <th className="px-4 py-3 font-semibold">ชื่อ-สกุล</th>
                  <th className="px-4 py-3 font-semibold">ระดับ</th>
                  <th className="px-4 py-3 font-semibold">ประเภท</th>
                  <th className="px-4 py-3 font-semibold">วันที่</th>
                  <th className="px-4 py-3 font-semibold">รายละเอียด</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 bg-white">
                {rows.length === 0 ? (
                  <tr>
                    <td
                      colSpan={6}
                      className="px-4 py-6 text-center text-slate-500"
                    >
                      ยังไม่มีข้อมูล IOR
                    </td>
                  </tr>
                ) : (
                  rows.map((row, index) => (
                    <tr
                      key={`${row.hn}-${row.incident_date ?? index}`}
                      className="hover:bg-slate-50"
                    >
                      <td className="px-4 py-3 font-medium text-slate-800">
                        {row.hn}
                      </td>
                      <td className="px-4 py-3 text-slate-700">
                        {row.full_name || "-"}
                      </td>
                      <td className="px-4 py-3 text-slate-700">
                        {row.level || "-"}
                      </td>
                      <td className="px-4 py-3 text-slate-700">
                        {row.incident_type || "-"}
                      </td>
                      <td className="px-4 py-3 text-slate-700">
                        {row.incident_date
                          ? new Date(row.incident_date).toLocaleDateString(
                              "th-TH",
                            )
                          : "-"}
                      </td>
                      <td className="px-4 py-3 text-slate-700">
                        {row.detail || "-"}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
