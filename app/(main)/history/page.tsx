"use client";

import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { useState } from "react";

type BackupRecord = {
  hn: string;
  full_name: string | null;
  gender: string | null;
  age: number | null;
  admit_date: string | null;
  discharge_date: string | null;
  raw_data?: Record<string, unknown> | null;
  discharge_method: string | null;
  discharge_type: string | null;
};

function extractDiagnosis(rawData?: Record<string, unknown> | null) {
  if (!rawData || typeof rawData !== "object") {
    return null;
  }

  const candidate =
    rawData.diagnosis ?? rawData.last_diagnosis ?? rawData.final_diagnosis;

  return typeof candidate === "string" ? candidate : null;
}

export default function HistoryPage() {
  const [hn, setHn] = useState("");
  const [records, setRecords] = useState<BackupRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function searchHistory() {
    const trimmedHn = hn.trim();
    if (!trimmedHn) {
      setError("กรุณากรอก HN");
      return;
    }

    const supabase = createSupabaseBrowserClient();
    if (!supabase) {
      setError("ยังไม่ได้ตั้งค่า Supabase environment variables");
      return;
    }

    setLoading(true);
    setError(null);

    const { data, error: queryError } = await supabase
      .from("backup")
      .select(
        "hn, full_name, gender, age, admit_date, discharge_date, raw_data, discharge_method, discharge_type",
      )
      .eq("hn", trimmedHn)
      .order("discharge_date", { ascending: false });

    setLoading(false);

    if (queryError) {
      setError(queryError.message);
      setRecords([]);
      return;
    }

    setRecords((data as BackupRecord[]) ?? []);
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 md:px-6">
      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div>
          <p className="text-sm font-medium uppercase tracking-[0.2em] text-indigo-600">
            History
          </p>
          <h1 className="mt-1 text-3xl font-bold text-slate-800">
            ประวัติการจำหน่าย
          </h1>
        </div>

        <div className="mt-6 flex flex-col gap-3 md:flex-row">
          <input
            value={hn}
            onChange={(event) => setHn(event.target.value)}
            placeholder="ค้นหา HN"
            className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2.5 outline-none transition focus:border-indigo-500 focus:bg-white"
          />
          <button
            type="button"
            onClick={searchHistory}
            className="rounded-xl bg-gradient-to-r from-indigo-600 to-sky-500 px-5 py-2.5 font-semibold text-white shadow-lg shadow-indigo-500/20 transition hover:brightness-105"
          >
            {loading ? "กำลังค้นหา..." : "ค้นหา"}
          </button>
        </div>

        {error ? (
          <div className="mt-5 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </div>
        ) : null}

        <div className="mt-6 overflow-x-auto rounded-2xl border border-slate-200">
          <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
            <thead className="bg-slate-50 text-slate-700">
              <tr>
                <th className="px-4 py-3 font-semibold">HN</th>
                <th className="px-4 py-3 font-semibold">ชื่อ-สกุล</th>
                <th className="px-4 py-3 font-semibold">วันที่ admit</th>
                <th className="px-4 py-3 font-semibold">วันที่ discharge</th>
                <th className="px-4 py-3 font-semibold">การวินิจฉัย</th>
                <th className="px-4 py-3 font-semibold">วิธีจำหน่าย</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 bg-white">
              {records.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-4 py-6 text-center text-slate-500"
                  >
                    ยังไม่มีประวัติการจำหน่าย
                  </td>
                </tr>
              ) : (
                records.map((record) => (
                  <tr
                    key={`${record.hn}-${record.discharge_date ?? "unknown"}`}
                    className="hover:bg-slate-50"
                  >
                    <td className="px-4 py-3 font-medium text-slate-800">
                      {record.hn}
                    </td>
                    <td className="px-4 py-3 text-slate-700">
                      {record.full_name || "-"}
                    </td>
                    <td className="px-4 py-3 text-slate-700">
                      {record.admit_date
                        ? new Date(record.admit_date).toLocaleDateString(
                            "th-TH",
                          )
                        : "-"}
                    </td>
                    <td className="px-4 py-3 text-slate-700">
                      {record.discharge_date
                        ? new Date(record.discharge_date).toLocaleDateString(
                            "th-TH",
                          )
                        : "-"}
                    </td>
                    <td className="px-4 py-3 text-slate-700">
                      {extractDiagnosis(record.raw_data) || "-"}
                    </td>
                    <td className="px-4 py-3 text-slate-700">
                      {record.discharge_method || record.discharge_type || "-"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
