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
  last_diagnosis?: string | null;
  admit_date?: string | null;
  admitting_doctor?: string | null;
  residence_type?: string | null;
  residence_district?: string | null;
  residence_subdistrict?: string | null;
  residence_details?: string | null;
  caregiver_name?: string | null;
  caregiver_relation?: string | null;
  caregiver_phone?: string | null;
  patient_phone?: string | null;
  raw_data?: Record<string, unknown> | null;
};

const defaultForm = {
  hn: "",
  prefix: "",
  full_name: "",
  gender: "ชาย",
  age: "",
  smi_type: "SMI-V",
  last_diagnosis: "",
  admit_date: "",
  admitting_doctor: "",
  residence_type: "",
  residence_district: "",
  residence_subdistrict: "",
  residence_details: "",
  caregiver_name: "",
  caregiver_relation: "",
  caregiver_phone: "",
  patient_phone: "",
};

export default function EditPatientPage() {
  const [hn, setHn] = useState("");
  const [form, setForm] = useState(defaultForm);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function updateField<K extends keyof typeof defaultForm>(
    key: K,
    value: (typeof defaultForm)[K],
  ) {
    setForm((current) => ({ ...current, [key]: value }));
  }

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
      return;
    }

    if (!data) {
      setError(`ไม่พบข้อมูลผู้ป่วย HN: ${trimmed}`);
      return;
    }

    const patient = data as PatientRecord;
    const nextForm = {
      hn: patient.hn ?? "",
      prefix: patient.prefix ?? "",
      full_name: patient.full_name ?? "",
      gender: patient.gender ?? "ชาย",
      age: patient.age != null ? String(patient.age) : "",
      smi_type: patient.smi_type ?? "SMI-V",
      last_diagnosis: patient.last_diagnosis ?? "",
      admit_date: patient.admit_date ?? "",
      admitting_doctor: patient.admitting_doctor ?? "",
      residence_type: patient.residence_type ?? "",
      residence_district: patient.residence_district ?? "",
      residence_subdistrict: patient.residence_subdistrict ?? "",
      residence_details: patient.residence_details ?? "",
      caregiver_name: patient.caregiver_name ?? "",
      caregiver_relation: patient.caregiver_relation ?? "",
      caregiver_phone: patient.caregiver_phone ?? "",
      patient_phone: patient.patient_phone ?? "",
    };

    setForm(nextForm);
    setMessage(`พบข้อมูล HN ${trimmed}`);
  }

  async function savePatient() {
    const trimmedHn = form.hn.trim();
    if (!trimmedHn) {
      setError("HN ไม่ถูกต้อง");
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

    const payload = {
      hn: trimmedHn,
      prefix: form.prefix || null,
      full_name: form.full_name || null,
      gender: form.gender || null,
      age: form.age ? Number(form.age) : null,
      smi_type: form.smi_type || null,
      last_diagnosis: form.last_diagnosis || null,
      admit_date: form.admit_date || null,
      admitting_doctor: form.admitting_doctor || null,
      residence_type: form.residence_type || null,
      residence_district: form.residence_district || null,
      residence_subdistrict: form.residence_subdistrict || null,
      residence_details: form.residence_details || null,
      caregiver_name: form.caregiver_name || null,
      caregiver_relation: form.caregiver_relation || null,
      caregiver_phone: form.caregiver_phone || null,
      patient_phone: form.patient_phone || null,
      raw_data: {
        ...form,
        age: form.age ? Number(form.age) : null,
      },
    };

    const { error: saveError } = await supabase
      .from("patients")
      .upsert([payload], { onConflict: "hn" });

    setSaving(false);

    if (saveError) {
      setError(`อัปเดตข้อมูลไม่สำเร็จ: ${saveError.message}`);
      return;
    }

    setMessage("บันทึกข้อมูลผู้ป่วยเรียบร้อยแล้ว");
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 md:px-6">
      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div>
          <p className="text-sm font-medium uppercase tracking-[0.2em] text-indigo-600">
            Edit Patient
          </p>
          <h1 className="mt-1 text-3xl font-bold text-slate-800">
            แก้ไขข้อมูลผู้ป่วย
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

        <div className="mt-8 grid gap-4 md:grid-cols-2">
          <label className="block text-sm font-medium text-slate-700">
            HN
            <input
              value={form.hn}
              onChange={(event) => updateField("hn", event.target.value)}
              className="mt-2 w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2.5 outline-none transition focus:border-indigo-500 focus:bg-white"
            />
          </label>

          <label className="block text-sm font-medium text-slate-700">
            คำนำหน้าชื่อ
            <input
              value={form.prefix}
              onChange={(event) => updateField("prefix", event.target.value)}
              className="mt-2 w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2.5 outline-none transition focus:border-indigo-500 focus:bg-white"
            />
          </label>

          <label className="block text-sm font-medium text-slate-700 md:col-span-2">
            ชื่อ-สกุล
            <input
              value={form.full_name}
              onChange={(event) => updateField("full_name", event.target.value)}
              className="mt-2 w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2.5 outline-none transition focus:border-indigo-500 focus:bg-white"
            />
          </label>

          <label className="block text-sm font-medium text-slate-700">
            เพศ
            <select
              value={form.gender}
              onChange={(event) => updateField("gender", event.target.value)}
              className="mt-2 w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2.5 outline-none transition focus:border-indigo-500 focus:bg-white"
            >
              <option value="ชาย">ชาย</option>
              <option value="หญิง">หญิง</option>
            </select>
          </label>

          <label className="block text-sm font-medium text-slate-700">
            อายุ
            <input
              type="number"
              value={form.age}
              onChange={(event) => updateField("age", event.target.value)}
              className="mt-2 w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2.5 outline-none transition focus:border-indigo-500 focus:bg-white"
            />
          </label>

          <label className="block text-sm font-medium text-slate-700">
            ประเภท SMI-V
            <input
              value={form.smi_type}
              onChange={(event) => updateField("smi_type", event.target.value)}
              className="mt-2 w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2.5 outline-none transition focus:border-indigo-500 focus:bg-white"
            />
          </label>

          <label className="block text-sm font-medium text-slate-700">
            วันที่ admit
            <input
              type="date"
              value={form.admit_date}
              onChange={(event) =>
                updateField("admit_date", event.target.value)
              }
              className="mt-2 w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2.5 outline-none transition focus:border-indigo-500 focus:bg-white"
            />
          </label>

          <label className="block text-sm font-medium text-slate-700 md:col-span-2">
            แพทย์ผู้รับผิดชอบ
            <input
              value={form.admitting_doctor}
              onChange={(event) =>
                updateField("admitting_doctor", event.target.value)
              }
              className="mt-2 w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2.5 outline-none transition focus:border-indigo-500 focus:bg-white"
            />
          </label>

          <label className="block text-sm font-medium text-slate-700 md:col-span-2">
            การวินิจฉัย
            <input
              value={form.last_diagnosis}
              onChange={(event) =>
                updateField("last_diagnosis", event.target.value)
              }
              className="mt-2 w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2.5 outline-none transition focus:border-indigo-500 focus:bg-white"
            />
          </label>

          <label className="block text-sm font-medium text-slate-700">
            ประเภทที่อยู่
            <input
              value={form.residence_type}
              onChange={(event) =>
                updateField("residence_type", event.target.value)
              }
              className="mt-2 w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2.5 outline-none transition focus:border-indigo-500 focus:bg-white"
            />
          </label>

          <label className="block text-sm font-medium text-slate-700">
            อำเภอ
            <input
              value={form.residence_district}
              onChange={(event) =>
                updateField("residence_district", event.target.value)
              }
              className="mt-2 w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2.5 outline-none transition focus:border-indigo-500 focus:bg-white"
            />
          </label>

          <label className="block text-sm font-medium text-slate-700">
            ตำบล
            <input
              value={form.residence_subdistrict}
              onChange={(event) =>
                updateField("residence_subdistrict", event.target.value)
              }
              className="mt-2 w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2.5 outline-none transition focus:border-indigo-500 focus:bg-white"
            />
          </label>

          <label className="block text-sm font-medium text-slate-700">
            เบอร์ผู้ป่วย
            <input
              value={form.patient_phone}
              onChange={(event) =>
                updateField("patient_phone", event.target.value)
              }
              className="mt-2 w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2.5 outline-none transition focus:border-indigo-500 focus:bg-white"
            />
          </label>

          <label className="block text-sm font-medium text-slate-700 md:col-span-2">
            รายละเอียดที่อยู่
            <textarea
              value={form.residence_details}
              onChange={(event) =>
                updateField("residence_details", event.target.value)
              }
              className="mt-2 min-h-24 w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2.5 outline-none transition focus:border-indigo-500 focus:bg-white"
            />
          </label>

          <label className="block text-sm font-medium text-slate-700">
            ชื่อผู้ดูแล
            <input
              value={form.caregiver_name}
              onChange={(event) =>
                updateField("caregiver_name", event.target.value)
              }
              className="mt-2 w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2.5 outline-none transition focus:border-indigo-500 focus:bg-white"
            />
          </label>

          <label className="block text-sm font-medium text-slate-700">
            ความสัมพันธ์
            <input
              value={form.caregiver_relation}
              onChange={(event) =>
                updateField("caregiver_relation", event.target.value)
              }
              className="mt-2 w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2.5 outline-none transition focus:border-indigo-500 focus:bg-white"
            />
          </label>

          <label className="block text-sm font-medium text-slate-700 md:col-span-2">
            เบอร์ผู้ดูแล
            <input
              value={form.caregiver_phone}
              onChange={(event) =>
                updateField("caregiver_phone", event.target.value)
              }
              className="mt-2 w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2.5 outline-none transition focus:border-indigo-500 focus:bg-white"
            />
          </label>
        </div>

        <div className="mt-8 flex justify-end">
          <button
            type="button"
            onClick={savePatient}
            className="rounded-xl bg-gradient-to-r from-emerald-600 to-teal-500 px-5 py-2.5 font-semibold text-white shadow-lg shadow-emerald-500/20 transition hover:brightness-105"
          >
            {saving ? "กำลังบันทึก..." : "บันทึกข้อมูล"}
          </button>
        </div>
      </section>
    </div>
  );
}
