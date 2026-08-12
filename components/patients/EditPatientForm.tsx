"use client";

import { useState } from "react";

import {
  saveEditedPatientAction,
  searchPatientForEditAction,
  type EditPatientForm as EditPatientValues,
} from "@/app/actions/patients";

const inputClass = "mt-2 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200";
const labelClass = "block text-sm font-medium text-slate-700";

function Field({ label, children, wide = false }: { label: string; children: React.ReactNode; wide?: boolean }) {
  return <label className={`${labelClass}${wide ? " md:col-span-2" : ""}`}>{label}{children}</label>;
}

export default function EditPatientForm() {
  const [searchHn, setSearchHn] = useState("");
  const [form, setForm] = useState<EditPatientValues | null>(null);
  const [assessmentId, setAssessmentId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  function updateField<K extends keyof EditPatientValues>(key: K, value: EditPatientValues[K]) {
    setForm((current) => current ? { ...current, [key]: value } : current);
    setError("");
    setMessage("");
  }

  async function searchPatient() {
    const data = new FormData();
    data.set("hn", searchHn);
    setLoading(true); setError(""); setMessage("");
    const result = await searchPatientForEditAction(data);
    setLoading(false);
    setForm(result.form);
    setAssessmentId(result.assessmentId);
    setMessage(result.message);
    setError(result.error);
  }

  async function savePatient() {
    if (!form) return;
    if (!form.hn.trim()) return setError("HN ไม่ถูกต้อง");
    const data = new FormData();
    (Object.keys(form) as Array<keyof EditPatientValues>).forEach((key) => data.set(key, String(form[key])));
    if (assessmentId) data.set("assessmentId", assessmentId);
    setSaving(true); setError(""); setMessage("");
    const result = await saveEditedPatientAction(data);
    setSaving(false);
    if (result.status === "error") return setError(result.message);
    setMessage(result.message);
    setForm(null); setAssessmentId(null); setSearchHn("");
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 md:px-6">
      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-sm font-medium uppercase tracking-[0.2em] text-indigo-600">Edit Patient</p>
        <h1 className="mt-1 text-2xl font-bold text-slate-800 md:text-3xl">แก้ไขข้อมูลผู้ป่วย</h1>

        <form className="mt-6 flex flex-col gap-3 md:flex-row" onSubmit={(event) => { event.preventDefault(); void searchPatient(); }}>
          <input value={searchHn} onChange={(event) => setSearchHn(event.target.value)} placeholder="กรอกรหัส HN" className={`${inputClass} mt-0`} />
          <button type="submit" disabled={loading} className="rounded-xl bg-indigo-600 px-5 py-2.5 font-semibold text-white transition hover:bg-indigo-700 disabled:opacity-50">{loading ? "กำลังค้นหา..." : "ค้นหา"}</button>
        </form>

        {error ? <p className="mt-4 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p> : null}
        {message ? <p className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{message}</p> : null}

        {form ? <div className="mt-8 grid gap-4 md:grid-cols-2">
          <Field label="HN"><input readOnly value={form.hn} className={`${inputClass} bg-slate-100`} /></Field>
          <Field label="คำนำหน้า"><input value={form.prefix} onChange={(event) => updateField("prefix", event.target.value)} className={inputClass} /></Field>
          <Field label="ชื่อ"><input value={form.first_name} onChange={(event) => updateField("first_name", event.target.value)} className={inputClass} /></Field>
          <Field label="นามสกุล"><input value={form.last_name} onChange={(event) => updateField("last_name", event.target.value)} className={inputClass} /></Field>
          <Field label="ชื่อ-นามสกุล (เต็ม)" wide><input value={form.full_name} onChange={(event) => updateField("full_name", event.target.value)} className={inputClass} /></Field>
          <Field label="เพศ"><select value={form.gender} onChange={(event) => updateField("gender", event.target.value)} className={inputClass}><option value="">-- เลือกเพศ --</option><option value="หญิง">เพศหญิง</option><option value="ชาย">เพศชาย</option></select></Field>
          <Field label="อายุ"><input type="number" min={0} value={form.age} onChange={(event) => updateField("age", event.target.value)} className={inputClass} /></Field>
          <label className={`${labelClass} flex items-center gap-3 pt-7`}><input type="checkbox" checked={form.is_smi_v} onChange={(event) => updateField("is_smi_v", event.target.checked)} className="h-4 w-4 rounded border-slate-300 text-indigo-600" />Is SMI-V</label>
          <Field label="Diagnosis"><input value={form.diagnosis} onChange={(event) => updateField("diagnosis", event.target.value)} className={inputClass} /></Field>
          <Field label="SMI-V Result"><input value={form.smi_v_result} onChange={(event) => updateField("smi_v_result", event.target.value)} className={inputClass} /></Field>
          <Field label="ประเภทผู้ป่วย (smi_type)"><input value={form.smi_type} onChange={(event) => updateField("smi_type", event.target.value)} className={inputClass} /></Field>
          <Field label="Substance use"><input value={form.substance_use} onChange={(event) => updateField("substance_use", event.target.value)} className={inputClass} /></Field>
          <Field label="Substance type"><input value={form.substance_type} onChange={(event) => updateField("substance_type", event.target.value)} className={inputClass} /></Field>
          <Field label="เบอร์โทรผู้ป่วย"><input type="tel" value={form.patient_phone} onChange={(event) => updateField("patient_phone", event.target.value)} className={inputClass} /></Field>
          <Field label="วันที่รับ (ISO)"><input type="date" value={form.admission_date} onChange={(event) => updateField("admission_date", event.target.value)} className={inputClass} /></Field>
          <Field label="แพทย์เจ้าของไข้"><input value={form.admitting_doctor} onChange={(event) => updateField("admitting_doctor", event.target.value)} className={inputClass} /></Field>
          <Field label="ชื่อผู้ดูแล"><input value={form.caregiver_name} onChange={(event) => updateField("caregiver_name", event.target.value)} className={inputClass} /></Field>
          <Field label="ความสัมพันธ์ผู้ดูแล"><input value={form.caregiver_relation} onChange={(event) => updateField("caregiver_relation", event.target.value)} className={inputClass} /></Field>
          <Field label="เบอร์โทรผู้ดูแล"><input type="tel" value={form.caregiver_phone} onChange={(event) => updateField("caregiver_phone", event.target.value)} className={inputClass} /></Field>
          <Field label="Admission source"><input value={form.admission_source} onChange={(event) => updateField("admission_source", event.target.value)} className={inputClass} /></Field>
          <Field label="Residence type"><input value={form.residence_type} onChange={(event) => updateField("residence_type", event.target.value)} className={inputClass} /></Field>
          <Field label="Residence details" wide><textarea value={form.residence_details} onChange={(event) => updateField("residence_details", event.target.value)} className={`${inputClass} min-h-20`} /></Field>
          <Field label="Residence district"><input value={form.residence_district} onChange={(event) => updateField("residence_district", event.target.value)} className={inputClass} /></Field>
          <Field label="Residence subdistrict"><input value={form.residence_subdistrict} onChange={(event) => updateField("residence_subdistrict", event.target.value)} className={inputClass} /></Field>
          <Field label="Aggressive behaviour" wide><textarea value={form.aggressive_behavior} onChange={(event) => updateField("aggressive_behavior", event.target.value)} className={`${inputClass} min-h-20`} /></Field>
          <Field label="OAS Score"><input type="number" min={0} value={form.oas_score} onChange={(event) => updateField("oas_score", event.target.value)} className={inputClass} /></Field>
          <Field label="OAS Risk Level"><input value={form.oas_risk_level} onChange={(event) => updateField("oas_risk_level", event.target.value)} className={inputClass} /></Field>
          <div className="md:col-span-2 flex justify-end"><button type="button" onClick={() => void savePatient()} disabled={saving} className="rounded-xl bg-emerald-600 px-5 py-2.5 font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-50">{saving ? "กำลังบันทึก..." : "บันทึกข้อมูล"}</button></div>
        </div> : null}
      </section>
    </div>
  );
}
