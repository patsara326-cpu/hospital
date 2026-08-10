"use client";

import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { useState } from "react";

type PatientRecord = {
  hn: string;
  prefix?: string | null;
  full_name?: string | null;
  gender?: string | null;
  age?: number | null;
  smi_type?: string | null;
  admit_date?: string | null;
  admitting_doctor?: string | null;
  residence_type?: string | null;
  last_diagnosis?: string | null;
};

export default function DischargePage() {
  const [hn, setHn] = useState("");
  const [patient, setPatient] = useState<PatientRecord | null>(null);
  const [form, setForm] = useState({
    discharge_method: "",
    discharge_date: "",
    discharge_type: "",
    last_diagnosis: "",
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

    const patientRow = data as PatientRecord;
    setPatient(patientRow);
    setForm((current) => ({
      ...current,
      last_diagnosis: patientRow.last_diagnosis ?? current.last_diagnosis,
    }));
    setMessage(`พบข้อมูลผู้ป่วย ${patientRow.full_name ?? patientRow.hn}`);
  }

  async function saveDischarge() {
    if (!patient) {
      setError("กรุณาค้นหาผู้ป่วยก่อนบันทึก");
      return;
    }

    if (
      !form.discharge_method ||
      !form.discharge_date ||
      !form.last_diagnosis ||
      !form.discharge_type
    ) {
      setError("กรุณากรอกข้อมูลการจำหน่ายให้ครบ");
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

    const backupRecord = {
      hn: patient.hn,
      prefix: patient.prefix ?? null,
      full_name: patient.full_name ?? null,
      gender: patient.gender ?? null,
      age: patient.age ?? null,
      smi_type: patient.smi_type ?? null,
      admit_date: patient.admit_date ?? null,
      admitting_doctor: patient.admitting_doctor ?? null,
      last_diagnosis: form.last_diagnosis,
      discharge_method: form.discharge_method,
      discharge_date: form.discharge_date,
      discharge_type: form.discharge_type,
      discharged_at: new Date().toISOString(),
      raw_data: { ...patient, ...form },
    };

    const { error: insertError } = await supabase
      .from("backup")
      .insert([backupRecord]);
    if (insertError) {
      setSaving(false);
      setError(`บันทึกสำรองล้มเหลว: ${insertError.message}`);
      return;
    }

    const { error: deleteError } = await supabase
      .from("patients")
      .delete()
      .eq("hn", patient.hn);

    setSaving(false);

    if (deleteError) {
      setError(`ลบผู้ป่วยจาก patients ไม่สำเร็จ: ${deleteError.message}`);
      return;
    }

    setPatient(null);
    setHn("");
    setForm({
      discharge_method: "",
      discharge_date: "",
      discharge_type: "",
      last_diagnosis: "",
    });
    setMessage("จำหน่ายผู้ป่วยเรียบร้อยแล้ว");
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 md:px-6">
      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div>
          <p className="text-sm font-medium uppercase tracking-[0.2em] text-indigo-600">
            Discharge
          </p>
          <h1 className="mt-1 text-3xl font-bold text-slate-800">
            ทะเบียนจำหน่ายผู้ป่วย
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
            <div className="grid gap-2 text-sm text-slate-700 md:grid-cols-3">
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
              <div>
                <span className="font-semibold text-slate-900">SMI-V:</span>{" "}
                {patient.smi_type ?? "-"}
              </div>
              <div>
                <span className="font-semibold text-slate-900">อายุ:</span>{" "}
                {patient.age ?? "-"}
              </div>
              <div>
                <span className="font-semibold text-slate-900">
                  วันที่ admit:
                </span>{" "}
                {patient.admit_date ?? "-"}
              </div>
            </div>

            <div className="mt-8 grid gap-4 md:grid-cols-2">
              <label className="block text-sm font-medium text-slate-700">
                วิธีจำหน่าย
                <select
                  value={form.discharge_method}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      discharge_method: event.target.value,
                    }))
                  }
                  className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 outline-none transition focus:border-indigo-500"
                >
                  <option value="">เลือก</option>
                  <option value="home">กลับบ้าน</option>
                  <option value="transfer">ส่งต่อ</option>
                  <option value="refer">ส่งต่อไปรักษา</option>
                  <option value="other">อื่น ๆ</option>
                </select>
              </label>

              <label className="block text-sm font-medium text-slate-700">
                วันที่จำหน่าย
                <input
                  type="date"
                  value={form.discharge_date}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      discharge_date: event.target.value,
                    }))
                  }
                  className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 outline-none transition focus:border-indigo-500"
                />
              </label>

              <label className="block text-sm font-medium text-slate-700 md:col-span-2">
                การวินิจฉัยสุดท้าย
                <input
                  value={form.last_diagnosis}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      last_diagnosis: event.target.value,
                    }))
                  }
                  className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 outline-none transition focus:border-indigo-500"
                />
              </label>

              <label className="block text-sm font-medium text-slate-700 md:col-span-2">
                ประเภทการจำหน่าย
                <div className="mt-2 flex flex-wrap gap-3">
                  {[
                    "complete",
                    "improved",
                    "partial",
                    "refused",
                    "transfer",
                  ].map((value) => (
                    <label
                      key={value}
                      className="flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700"
                    >
                      <input
                        type="radio"
                        name="discharge-type"
                        value={value}
                        checked={form.discharge_type === value}
                        onChange={(event) =>
                          setForm((current) => ({
                            ...current,
                            discharge_type: event.target.value,
                          }))
                        }
                      />
                      {value}
                    </label>
                  ))}
                </div>
              </label>
            </div>

            <div className="mt-8 flex justify-end">
              <button
                type="button"
                onClick={saveDischarge}
                className="rounded-xl bg-gradient-to-r from-rose-600 to-red-500 px-5 py-2.5 font-semibold text-white shadow-lg shadow-rose-500/20 transition hover:brightness-105"
              >
                {saving ? "กำลังบันทึก..." : "บันทึกจำหน่าย"}
              </button>
            </div>
          </div>
        ) : null}
      </section>
    </div>
  );
}
