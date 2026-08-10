"use client";

import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

type PatientRow = {
  hn: string;
  full_name: string;
  gender: string;
  age: number | null;
  smi_type: string | null;
  admit_date: string | null;
  admitting_doctor: string | null;
  residence_type: string | null;
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

export default function IpdPage() {
  const params = useParams<{ gender?: string }>();
  const rawGender = params?.gender ?? "male";
  const genderValues = useMemo(
    () => normalizeGenderValues(rawGender),
    [rawGender],
  );
  const displayGender = genderValues[0];
  const [patients, setPatients] = useState<PatientRow[]>([]);
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

      try {
        const { data, error: queryError } = await supabase
          .from("patients")
          .select(
            "hn, full_name, gender, age, smi_type, admit_date, admitting_doctor, residence_type, raw_data",
          )
          .in("gender", genderValues)
          .order("admit_date", { ascending: false });

        if (queryError) {
          setError(queryError.message);
          setPatients([]);
        } else {
          setPatients((data as PatientRow[]) ?? []);
        }
      } catch (loadError) {
        setError(
          loadError instanceof Error ? loadError.message : "Load failed",
        );
      } finally {
        setLoading(false);
      }
    }

    void load();
  }, [genderValues]);

  const summary = useMemo(
    () => ({
      count: patients.length,
      newest: patients[0]?.admit_date ?? null,
      active: patients.filter((patient) => patient.admit_date).length,
    }),
    [patients],
  );

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 md:px-6">
      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm font-medium uppercase tracking-[0.2em] text-indigo-600">
              IPD
            </p>
            <h1 className="mt-1 text-3xl font-bold text-slate-800">
              รายชื่อผู้ป่วยใน ward {displayGender}
            </h1>
          </div>
          <div className="rounded-full bg-slate-100 px-3 py-1 text-sm font-medium text-slate-700">
            {summary.count} ราย
          </div>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-sm text-slate-500">ผู้ป่วยทั้งหมด</p>
            <p className="mt-2 text-3xl font-bold text-slate-800">
              {summary.count}
            </p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-indigo-50 p-4">
            <p className="text-sm text-indigo-700">วันที่รับล่าสุด</p>
            <p className="mt-2 text-lg font-bold text-indigo-800">
              {summary.newest
                ? new Date(summary.newest).toLocaleDateString("th-TH")
                : "-"}
            </p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-emerald-50 p-4">
            <p className="text-sm text-emerald-700">มีข้อมูลวันที่รับ</p>
            <p className="mt-2 text-3xl font-bold text-emerald-800">
              {summary.active}
            </p>
          </div>
        </div>

        {error ? (
          <div className="mt-6 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </div>
        ) : null}

        {loading ? (
          <div className="mt-6 text-slate-600">กำลังโหลดข้อมูลผู้ป่วย...</div>
        ) : (
          <div className="mt-6 overflow-x-auto rounded-2xl border border-slate-200">
            <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
              <thead className="bg-slate-50 text-slate-700">
                <tr>
                  <th className="px-4 py-3 font-semibold">HN</th>
                  <th className="px-4 py-3 font-semibold">ชื่อ-สกุล</th>
                  <th className="px-4 py-3 font-semibold">อายุ</th>
                  <th className="px-4 py-3 font-semibold">SMI-V</th>
                  <th className="px-4 py-3 font-semibold">วันที่รับ</th>
                  <th className="px-4 py-3 font-semibold">แพทย์</th>
                  <th className="px-4 py-3 font-semibold">วินิจฉัย</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 bg-white">
                {patients.length === 0 ? (
                  <tr>
                    <td
                      colSpan={7}
                      className="px-4 py-6 text-center text-slate-500"
                    >
                      ไม่พบข้อมูลผู้ป่วยใน ward {displayGender}
                    </td>
                  </tr>
                ) : (
                  patients.map((patient) => (
                    <tr key={patient.hn} className="hover:bg-slate-50">
                      <td className="px-4 py-3 font-medium text-slate-800">
                        {patient.hn}
                      </td>
                      <td className="px-4 py-3 text-slate-700">
                        {patient.full_name || "-"}
                      </td>
                      <td className="px-4 py-3 text-slate-700">
                        {patient.age ?? "-"}
                      </td>
                      <td className="px-4 py-3 text-slate-700">
                        {patient.smi_type || "-"}
                      </td>
                      <td className="px-4 py-3 text-slate-700">
                        {patient.admit_date
                          ? new Date(patient.admit_date).toLocaleDateString(
                              "th-TH",
                            )
                          : "-"}
                      </td>
                      <td className="px-4 py-3 text-slate-700">
                        {patient.admitting_doctor || "-"}
                      </td>
                      <td className="px-4 py-3 text-slate-700">
                        {extractDiagnosis(patient.raw_data) || "-"}
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
