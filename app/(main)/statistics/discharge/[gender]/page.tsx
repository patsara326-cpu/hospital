"use client";

import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

type DischargeRow = {
  hn: string;
  full_name: string | null;
  gender: string | null;
  discharge_date: string | null;
  discharge_method: string | null;
  discharge_type: string | null;
  raw_data?: Record<string, unknown> | null;
};

function extractDiagnosis(rawData?: Record<string, unknown> | null) {
  if (!rawData || typeof rawData !== "object") {
    return null;
  }

  const candidate =
    rawData.diagnosis ?? rawData.last_diagnosis ?? rawData.final_diagnosis;

  return typeof candidate === "string" ? candidate : null;
}

function normalizeGenderValues(rawGender?: string) {
  const key = (rawGender ?? "male").toLowerCase();

  if (key === "female" || key === "หญิง") {
    return ["หญิง", "female"];
  }

  return ["ชาย", "male"];
}

export default function DischargeStatisticsPage() {
  const params = useParams<{ gender?: string }>();
  const genderValues = useMemo(
    () => normalizeGenderValues(params?.gender),
    [params?.gender],
  );
  const gender = genderValues[0];
  const [rows, setRows] = useState<DischargeRow[]>([]);
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
        .from("backup")
        .select(
          "hn, full_name, gender, discharge_date, discharge_method, discharge_type, raw_data",
        )
        .in("gender", genderValues)
        .order("discharge_date", { ascending: false });

      if (queryError) {
        setError(queryError.message);
        setRows([]);
      } else {
        setRows((data as DischargeRow[]) ?? []);
      }

      setLoading(false);
    }

    void load();
  }, [genderValues]);

  const filteredRows = rows.filter(
    (row) =>
      (row.full_name || row.hn) &&
      row.gender &&
      genderValues.includes(row.gender),
  );

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 md:px-6">
      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-medium uppercase tracking-[0.2em] text-indigo-600">
              Statistics
            </p>
            <h1 className="mt-1 text-3xl font-bold text-slate-800">
              สถิติผู้ป่วยจำหน่ายหอผู้ป่วยจิตเวช{gender}
            </h1>
          </div>
          <div className="rounded-full bg-slate-100 px-3 py-1 text-sm font-medium text-slate-700">
            {filteredRows.length} ราย
          </div>
        </div>

        {error ? (
          <div className="mt-5 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </div>
        ) : null}

        {loading ? (
          <div className="mt-5 text-slate-600">กำลังโหลดสถิติ...</div>
        ) : (
          <div className="mt-6 overflow-x-auto rounded-2xl border border-slate-200">
            <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
              <thead className="bg-slate-50 text-slate-700">
                <tr>
                  <th className="px-4 py-3 font-semibold">HN</th>
                  <th className="px-4 py-3 font-semibold">ชื่อ-สกุล</th>
                  <th className="px-4 py-3 font-semibold">วันที่จำหน่าย</th>
                  <th className="px-4 py-3 font-semibold">วิธีจำหน่าย</th>
                  <th className="px-4 py-3 font-semibold">ประเภทจำหน่าย</th>
                  <th className="px-4 py-3 font-semibold">วินิจฉัยสุดท้าย</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 bg-white">
                {filteredRows.length === 0 ? (
                  <tr>
                    <td
                      colSpan={6}
                      className="px-4 py-6 text-center text-slate-500"
                    >
                      ไม่มีข้อมูลสถิติ
                    </td>
                  </tr>
                ) : (
                  filteredRows.map((row) => (
                    <tr
                      key={`${row.hn}-${row.discharge_date ?? "unknown"}`}
                      className="hover:bg-slate-50"
                    >
                      <td className="px-4 py-3 font-medium text-slate-800">
                        {row.hn}
                      </td>
                      <td className="px-4 py-3 text-slate-700">
                        {row.full_name || "-"}
                      </td>
                      <td className="px-4 py-3 text-slate-700">
                        {row.discharge_date
                          ? new Date(row.discharge_date).toLocaleDateString(
                              "th-TH",
                            )
                          : "-"}
                      </td>
                      <td className="px-4 py-3 text-slate-700">
                        {row.discharge_method || "-"}
                      </td>
                      <td className="px-4 py-3 text-slate-700">
                        {row.discharge_type || "-"}
                      </td>
                      <td className="px-4 py-3 text-slate-700">
                        {extractDiagnosis(row.raw_data) || "-"}
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
