"use client";

import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { useMemo, useState } from "react";

type PatientFormState = {
  hn: string;
  full_name: string;
  gender: string;
  age: string;
  smi_type: string;
  admit_date: string;
  admitting_doctor: string;
  diagnosis: string;
  residence_type: string;
  district: string;
  location: string;
  details: string;
  caregiver_status: string;
  caregiver_name: string;
  caregiver_relation: string;
  caregiver_phone: string;
  patient_phone: string;
};

const today = new Date().toISOString().slice(0, 10);

const defaultForm: PatientFormState = {
  hn: "",
  full_name: "",
  gender: "ชาย",
  age: "",
  smi_type: "SMI-V",
  admit_date: today,
  admitting_doctor: "",
  diagnosis: "",
  residence_type: "ที่พักตนเอง",
  district: "",
  location: "",
  details: "",
  caregiver_status: "มีผู้ดูแล",
  caregiver_name: "",
  caregiver_relation: "",
  caregiver_phone: "",
  patient_phone: "",
};

const steps = [
  { title: "ข้อมูลพื้นฐาน", description: "HN, ชื่อ, เพศ, อายุ" },
  {
    title: "การรับเข้า",
    description: "ประเภท SMI-V, วัน admit, แพทย์รับผิดชอบ",
  },
  { title: "การวินิจฉัย", description: "การวินิจฉัยและที่อยู่" },
  { title: "ผู้ดูแล", description: "ข้อมูลผู้ดูแลและทางติดต่อ" },
  { title: "ยืนยัน", description: "ตรวจสอบข้อมูลก่อนบันทึก" },
];

const residenceOptions = [
  "ที่พักตนเอง",
  "บ้านเฝ้าดูแล",
  "บ้านญาติ",
  "หอพัก",
  "อื่น ๆ",
];

const smiOptions = ["SMI-V", "SMI-IV", "SMI-III", "อื่น ๆ"];

export default function NewPatientPage() {
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<PatientFormState>(defaultForm);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const isLastStep = step === steps.length - 1;

  const stepProgress = useMemo(() => ((step + 1) / steps.length) * 100, [step]);

  function updateField<K extends keyof PatientFormState>(
    key: K,
    value: PatientFormState[K],
  ) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function nextStep() {
    if (step < steps.length - 1) {
      setStep((current) => current + 1);
    }
  }

  function previousStep() {
    if (step > 0) {
      setStep((current) => current - 1);
    }
  }

  async function handleSubmit() {
    const supabase = createSupabaseBrowserClient();

    if (!supabase) {
      setMessage("ยังไม่ได้ตั้งค่า Supabase environment variables");
      return;
    }

    setSubmitting(true);
    setMessage(null);

    const payload = {
      hn: form.hn.trim(),
      full_name: form.full_name.trim(),
      gender: form.gender,
      age: Number(form.age) || null,
      smi_type: form.smi_type,
      admit_date: form.admit_date || today,
      last_diagnosis: form.diagnosis.trim(),
      admitting_doctor: form.admitting_doctor.trim(),
      residence_type: form.residence_type,
      residence_district: form.district.trim(),
      residence_subdistrict: form.location.trim(),
      residence_details: form.details.trim(),
      caregiver_status: form.caregiver_status,
      caregiver_name: form.caregiver_name.trim(),
      caregiver_relation: form.caregiver_relation.trim(),
      caregiver_phone: form.caregiver_phone.trim(),
      patient_phone: form.patient_phone.trim(),
      raw_data: form,
    };

    const { error } = await supabase.from("patients").insert(payload);

    setSubmitting(false);

    if (error) {
      setMessage(`บันทึกข้อมูลไม่สำเร็จ: ${error.message}`);
      return;
    }

    setMessage("บันทึกข้อมูลผู้ป่วยใหม่เรียบร้อยแล้ว");
    setForm(defaultForm);
    setStep(0);
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 md:px-6">
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-6 flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-medium uppercase tracking-[0.2em] text-indigo-600">
              New Patient
            </p>
            <h1 className="mt-1 text-3xl font-bold text-slate-800">
              ลงทะเบียนผู้ป่วยแรกรับ
            </h1>
          </div>
          <div className="rounded-full bg-slate-100 px-3 py-1 text-sm font-medium text-slate-700">
            ขั้นตอน {step + 1}/{steps.length}
          </div>
        </div>

        <div className="mb-8 h-2 overflow-hidden rounded-full bg-slate-200">
          <div
            className="h-full rounded-full bg-gradient-to-r from-indigo-600 to-sky-500 transition-all"
            style={{ width: `${stepProgress}%` }}
          />
        </div>

        <div className="mb-6 flex flex-wrap gap-2">
          {steps.map((item, index) => (
            <button
              key={item.title}
              type="button"
              className={`rounded-full border px-3 py-1.5 text-sm font-medium transition ${
                index === step
                  ? "border-indigo-600 bg-indigo-50 text-indigo-700"
                  : index < step
                    ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                    : "border-slate-200 bg-white text-slate-600"
              }`}
              onClick={() => setStep(index)}
            >
              {index + 1}. {item.title}
            </button>
          ))}
        </div>

        <div className="mb-6 rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <p className="text-sm font-medium uppercase tracking-[0.18em] text-slate-500">
            {steps[step].title}
          </p>
          <p className="mt-1 text-slate-700">{steps[step].description}</p>
        </div>

        {step === 0 && (
          <div className="grid gap-4 md:grid-cols-2">
            <label className="block text-sm font-medium text-slate-700">
              HN
              <input
                value={form.hn}
                onChange={(event) => updateField("hn", event.target.value)}
                className="mt-2 w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2.5 outline-none transition focus:border-indigo-500 focus:bg-white"
                placeholder="HN"
              />
            </label>

            <label className="block text-sm font-medium text-slate-700">
              เพศ
              <select
                value={form.gender}
                onChange={(event) => updateField("gender", event.target.value)}
                className="mt-2 w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2.5 outline-none transition focus:border-indigo-500 focus:bg-white"
              >
                <option>ชาย</option>
                <option>หญิง</option>
              </select>
            </label>

            <label className="block text-sm font-medium text-slate-700 md:col-span-2">
              ชื่อ-นามสกุล
              <input
                value={form.full_name}
                onChange={(event) =>
                  updateField("full_name", event.target.value)
                }
                className="mt-2 w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2.5 outline-none transition focus:border-indigo-500 focus:bg-white"
                placeholder="ชื่อ-นามสกุล"
              />
            </label>

            <label className="block text-sm font-medium text-slate-700">
              อายุ
              <input
                type="number"
                min={0}
                value={form.age}
                onChange={(event) => updateField("age", event.target.value)}
                className="mt-2 w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2.5 outline-none transition focus:border-indigo-500 focus:bg-white"
                placeholder="อายุ"
              />
            </label>
          </div>
        )}

        {step === 1 && (
          <div className="grid gap-4 md:grid-cols-2">
            <label className="block text-sm font-medium text-slate-700">
              ประเภท SMI-V
              <select
                value={form.smi_type}
                onChange={(event) =>
                  updateField("smi_type", event.target.value)
                }
                className="mt-2 w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2.5 outline-none transition focus:border-indigo-500 focus:bg-white"
              >
                {smiOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </label>

            <label className="block text-sm font-medium text-slate-700">
              วันที่รับ
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
              แพทย์ที่รับผิดชอบ
              <input
                value={form.admitting_doctor}
                onChange={(event) =>
                  updateField("admitting_doctor", event.target.value)
                }
                className="mt-2 w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2.5 outline-none transition focus:border-indigo-500 focus:bg-white"
                placeholder="ชื่อแพทย์"
              />
            </label>
          </div>
        )}

        {step === 2 && (
          <div className="grid gap-4 md:grid-cols-2">
            <label className="block text-sm font-medium text-slate-700 md:col-span-2">
              การวินิจฉัย
              <textarea
                value={form.diagnosis}
                onChange={(event) =>
                  updateField("diagnosis", event.target.value)
                }
                className="mt-2 min-h-28 w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2.5 outline-none transition focus:border-indigo-500 focus:bg-white"
                placeholder="การวินิจฉัย"
              />
            </label>

            <label className="block text-sm font-medium text-slate-700">
              ประเภทที่อยู่
              <select
                value={form.residence_type}
                onChange={(event) =>
                  updateField("residence_type", event.target.value)
                }
                className="mt-2 w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2.5 outline-none transition focus:border-indigo-500 focus:bg-white"
              >
                {residenceOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </label>

            <label className="block text-sm font-medium text-slate-700">
              อำเภอ/เขต
              <input
                value={form.district}
                onChange={(event) =>
                  updateField("district", event.target.value)
                }
                className="mt-2 w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2.5 outline-none transition focus:border-indigo-500 focus:bg-white"
                placeholder="อำเภอ/เขต"
              />
            </label>

            <label className="block text-sm font-medium text-slate-700 md:col-span-2">
              ตำบล/สถานที่
              <input
                value={form.location}
                onChange={(event) =>
                  updateField("location", event.target.value)
                }
                className="mt-2 w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2.5 outline-none transition focus:border-indigo-500 focus:bg-white"
                placeholder="ตำบล/สถานที่"
              />
            </label>

            <label className="block text-sm font-medium text-slate-700 md:col-span-2">
              รายละเอียดที่อยู่
              <textarea
                value={form.details}
                onChange={(event) => updateField("details", event.target.value)}
                className="mt-2 min-h-24 w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2.5 outline-none transition focus:border-indigo-500 focus:bg-white"
                placeholder="รายละเอียดที่อยู่"
              />
            </label>
          </div>
        )}

        {step === 3 && (
          <div className="grid gap-4 md:grid-cols-2">
            <label className="block text-sm font-medium text-slate-700">
              สถานะผู้ดูแล
              <select
                value={form.caregiver_status}
                onChange={(event) =>
                  updateField("caregiver_status", event.target.value)
                }
                className="mt-2 w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2.5 outline-none transition focus:border-indigo-500 focus:bg-white"
              >
                <option>มีผู้ดูแล</option>
                <option>ไม่มีผู้ดูแล</option>
                <option>ผู้ดูแลเป็นญาติ</option>
              </select>
            </label>

            <label className="block text-sm font-medium text-slate-700">
              เบอร์โทรผู้ป่วย
              <input
                value={form.patient_phone}
                onChange={(event) =>
                  updateField("patient_phone", event.target.value)
                }
                className="mt-2 w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2.5 outline-none transition focus:border-indigo-500 focus:bg-white"
                placeholder="เบอร์โทรผู้ป่วย"
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
                placeholder="ชื่อผู้ดูแล"
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
                placeholder="ความสัมพันธ์"
              />
            </label>

            <label className="block text-sm font-medium text-slate-700 md:col-span-2">
              เบอร์โทรผู้ดูแล
              <input
                value={form.caregiver_phone}
                onChange={(event) =>
                  updateField("caregiver_phone", event.target.value)
                }
                className="mt-2 w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2.5 outline-none transition focus:border-indigo-500 focus:bg-white"
                placeholder="เบอร์โทรผู้ดูแล"
              />
            </label>
          </div>
        )}

        {step === 4 && (
          <div className="space-y-4">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <h2 className="text-lg font-semibold text-slate-800">
                ตรวจสอบข้อมูล
              </h2>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-xl border border-slate-200 bg-white p-4">
                <p className="text-sm text-slate-500">HN</p>
                <p className="mt-1 font-semibold text-slate-800">
                  {form.hn || "-"}
                </p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-white p-4">
                <p className="text-sm text-slate-500">ชื่อ-นามสกุล</p>
                <p className="mt-1 font-semibold text-slate-800">
                  {form.full_name || "-"}
                </p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-white p-4">
                <p className="text-sm text-slate-500">เพศ</p>
                <p className="mt-1 font-semibold text-slate-800">
                  {form.gender}
                </p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-white p-4">
                <p className="text-sm text-slate-500">ประเภท SMI-V</p>
                <p className="mt-1 font-semibold text-slate-800">
                  {form.smi_type}
                </p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-white p-4 md:col-span-2">
                <p className="text-sm text-slate-500">การวินิจฉัย</p>
                <p className="mt-1 font-semibold text-slate-800">
                  {form.diagnosis || "-"}
                </p>
              </div>
            </div>
          </div>
        )}

        {message && (
          <div
            className={`mt-6 rounded-xl border px-3 py-2 text-sm ${
              message.includes("ไม่สำเร็จ")
                ? "border-red-200 bg-red-50 text-red-700"
                : "border-emerald-200 bg-emerald-50 text-emerald-700"
            }`}
          >
            {message}
          </div>
        )}

        <div className="mt-8 flex items-center justify-between gap-3 border-t border-slate-200 pt-6">
          <button
            type="button"
            onClick={previousStep}
            disabled={step === 0}
            className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
          >
            ย้อนกลับ
          </button>

          {isLastStep ? (
            <button
              type="button"
              onClick={handleSubmit}
              disabled={submitting}
              className="rounded-xl bg-gradient-to-r from-indigo-600 to-sky-500 px-5 py-2.5 font-semibold text-white shadow-lg shadow-indigo-500/20 transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {submitting ? "กำลังบันทึก..." : "บันทึกข้อมูล"}
            </button>
          ) : (
            <button
              type="button"
              onClick={nextStep}
              className="rounded-xl bg-gradient-to-r from-indigo-600 to-sky-500 px-5 py-2.5 font-semibold text-white shadow-lg shadow-indigo-500/20 transition hover:brightness-105"
            >
              ถัดไป
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
