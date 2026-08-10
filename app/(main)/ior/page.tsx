"use client";

import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { useState } from "react";

type IorRecord = {
  hn: string;
  full_name?: string | null;
  gender?: string | null;
  age?: number | null;
  level?: string | null;
  incident_type?: string | null;
  incident_date?: string | null;
  detail?: string | null;
};

const incidentOptions = [
  "แรงกดดันทางจิตใจ",
  "ก้าวร้าว/ทำร้ายผู้อื่น",
  "หนีออกจากห้อง/หนีออกจากโรงพยาบาล",
  "เล่นสารเคมี/ยาบ้า",
  "อื่น ๆ",
];

export default function IorPage() {
  const [hn, setHn] = useState("");
  const [patient, setPatient] = useState<IorRecord | null>(null);
  const [form, setForm] = useState({
    level: "",
    incident_type: "",
    incident_date: "",
    detail: "",
  });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function searchPatient() {
    const trimmed = hn.trim();
    if (!trimmed) {
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
    setMessage(null);

    const { data, error: queryError } = await supabase
      .from("patients")
      .select("*")
      .eq("hn", trimmed)
      .maybeSingle();

    setLoading(false);

    if (queryError) {
      setError(queryError.message);
      setPatient(null);
      return;
    }

    if (!data) {
      setError(`ไม่พบผู้ป่วย HN: ${trimmed}`);
      setPatient(null);
      return;
    }

    setPatient(data as IorRecord);
    setMessage(`พบข้อมูลผู้ป่วย ${data.full_name ?? data.hn}`);
  }

  async function saveIorRecord() {
    if (!patient) {
      setError("กรุณาค้นหาผู้ป่วยก่อนบันทึก IOR");
      return;
    }

    if (
      !form.level ||
      !form.incident_type ||
      !form.incident_date ||
      !form.detail
    ) {
      setError("กรุณากรอกข้อมูล IOR ให้ครบถ้วน");
      return;
    }

    const supabase = createSupabaseBrowserClient();
    if (!supabase) {
      setError("ยังไม่ได้ตั้งค่า Supabase environment variables");
      return;
    }

    setSaving(true);
    setError(null);
    setMessage(null);

    const { error: insertError } = await supabase.from("ior_records").insert([
      {
        hn: patient.hn,
        full_name: patient.full_name ?? null,
        gender: patient.gender ?? null,
        age: patient.age ?? null,
        level: form.level,
        incident_type: form.incident_type,
        incident_date: form.incident_date,
        detail: form.detail,
      },
    ]);

    setSaving(false);

    if (insertError) {
      setError(`บันทึก IOR ล้มเหลว: ${insertError.message}`);
      return;
    }

    setForm({
      level: "",
      incident_type: "",
      incident_date: "",
      detail: "",
    });
    setMessage("บันทึก IOR เรียบร้อยแล้ว");
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 md:px-6">
      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div>
          <p className="text-sm font-medium uppercase tracking-[0.2em] text-indigo-600">
            IOR
          </p>
          <h1 className="mt-1 text-3xl font-bold text-slate-800">
            บันทึกอุบัติการณ์ IOR
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
            onClick={searchPatient}
            className="rounded-xl bg-indigo-600 px-5 py-2.5 font-semibold text-white transition hover:bg-indigo-700"
          >
            {loading ? "กำลังค้นหา..." : "ค้นหา"}
          </button>
        </div>

        {error ? (
          <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </div>
        ) : null}

        {message ? (
          <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
            {message}
          </div>
        ) : null}

        {patient ? (
          <div className="mt-8 rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <div className="grid gap-3 text-sm text-slate-700 md:grid-cols-3">
              <div>
                <span className="font-semibold text-slate-900">HN:</span>{" "}
                {patient.hn}
              </div>
              <div>
                <span className="font-semibold text-slate-900">ชื่อ:</span>{" "}
                {patient.full_name ?? "-"}
              </div>
              <div>
                <span className="font-semibold text-slate-900">เพศ:</span>{" "}
                {patient.gender ?? "-"}
              </div>
            </div>

            <div className="mt-8 grid gap-4 md:grid-cols-2">
              <label className="block text-sm font-medium text-slate-700">
                ระดับความรุนแรง
                <select
                  value={form.level}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      level: event.target.value,
                    }))
                  }
                  className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 outline-none transition focus:border-indigo-500"
                >
                  <option value="">เลือก</option>
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>
              </label>

              <label className="block text-sm font-medium text-slate-700">
                ประเภทอุบัติการณ์
                <select
                  value={form.incident_type}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      incident_type: event.target.value,
                    }))
                  }
                  className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 outline-none transition focus:border-indigo-500"
                >
                  <option value="">เลือก</option>
                  {incidentOptions.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block text-sm font-medium text-slate-700">
                วันที่เกิดเหตุ
                <input
                  type="date"
                  value={form.incident_date}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      incident_date: event.target.value,
                    }))
                  }
                  className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 outline-none transition focus:border-indigo-500"
                />
              </label>
            </div>

            <label className="mt-4 block text-sm font-medium text-slate-700">
              รายละเอียด
              <textarea
                value={form.detail}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    detail: event.target.value,
                  }))
                }
                className="mt-2 min-h-28 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 outline-none transition focus:border-indigo-500"
                placeholder="อธิบายเหตุการณ์"
              />
            </label>

            <div className="mt-8 flex justify-end">
              <button
                type="button"
                onClick={saveIorRecord}
                className="rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-500 px-5 py-2.5 font-semibold text-white shadow-lg shadow-violet-500/20 transition hover:brightness-105"
              >
                {saving ? "กำลังบันทึก..." : "บันทึก IOR"}
              </button>
            </div>
          </div>
        ) : null}
      </section>
    </div>
  );
}
