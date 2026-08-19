"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";

import { saveEditedPatientAction, searchPatientForEditAction } from "@/app/actions/patients";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { editPatientSchema, type EditPatientFormValues } from "@/lib/validation/edit-patient";

const inputClass = "mt-2";
const labelClass = "block text-sm font-medium text-slate-700";
const emptyValues: EditPatientFormValues = {
  hn: "", prefix: "", first_name: "", last_name: "", full_name: "", gender: "", age: "",
  is_smi_v: false, diagnosis: "", smi_v_result: "", smi_type: "", substance_use: "",
  substance_type: "", patient_phone: "", admission_date: "", admitting_doctor: "",
  caregiver_name: "", caregiver_relation: "", caregiver_phone: "", admission_source: "",
  residence_type: "", residence_details: "", residence_district: "", residence_subdistrict: "",
  aggressive_behavior: "", oas_score: "", oas_risk_level: "",
};

function Field({ label, error, children, wide = false }: { label: string; error?: string; children: React.ReactNode; wide?: boolean }) {
  return <label className={`${labelClass}${wide ? " md:col-span-2" : ""}`}>{label}{children}{error ? <span className="mt-1 block text-sm text-destructive">{error}</span> : null}</label>;
}

export default function EditPatientForm() {
  const [searchHn, setSearchHn] = useState("");
  const [loaded, setLoaded] = useState(false);
  const [assessmentId, setAssessmentId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const { register, handleSubmit, reset, formState: { errors } } = useForm<EditPatientFormValues>({
    resolver: zodResolver(editPatientSchema),
    defaultValues: emptyValues,
  });

  async function searchPatient() {
    if (!searchHn.trim()) return setError("กรุณากรอก HN");
    const data = new FormData();
    data.set("hn", searchHn);
    setLoading(true); setError(""); setMessage("");
    const result = await searchPatientForEditAction(data);
    setLoading(false);
    setLoaded(Boolean(result.form));
    setAssessmentId(result.assessmentId);
    if (result.form) reset(result.form);
    setMessage(result.message);
    setError(result.error);
  }

  async function savePatient(values: EditPatientFormValues) {
    const data = new FormData();
    for (const [key, value] of Object.entries(values)) data.set(key, String(value));
    if (assessmentId) data.set("assessmentId", assessmentId);
    setSaving(true); setError(""); setMessage("");
    const result = await saveEditedPatientAction(data);
    setSaving(false);
    if (result.status === "error") return setError(result.message);
    setMessage(result.message);
    setLoaded(false); setAssessmentId(null); setSearchHn(""); reset(emptyValues);
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 md:px-6">
      <Card className="rounded-3xl">
        <CardHeader><p className="text-sm font-medium uppercase tracking-[0.2em] text-indigo-600">Edit Patient</p><h1 className="text-2xl font-semibold leading-none tracking-tight md:text-3xl">แก้ไขข้อมูลผู้ป่วย</h1></CardHeader>
        <CardContent>
          <form className="flex flex-col gap-3 md:flex-row" onSubmit={(event) => { event.preventDefault(); void searchPatient(); }}>
            <label htmlFor="edit-patient-hn-search" className="sr-only">ค้นหาผู้ป่วยด้วย HN</label>
            <Input id="edit-patient-hn-search" value={searchHn} onChange={(event) => { setSearchHn(event.target.value); setLoaded(false); }} placeholder="กรอกรหัส HN" />
            <Button type="submit" disabled={loading}>{loading ? "กำลังค้นหา..." : "ค้นหา"}</Button>
          </form>
          {error ? <Alert className="mt-4 border-destructive/40 bg-destructive/10 text-destructive"><AlertDescription>{error}</AlertDescription></Alert> : null}
          {message ? <Alert className="mt-4 border-emerald-200 bg-emerald-50 text-emerald-700"><AlertDescription>{message}</AlertDescription></Alert> : null}

          {loaded ? <form onSubmit={handleSubmit(savePatient)} className="mt-8 grid gap-4 md:grid-cols-2" noValidate>
            <Field label="HN" error={errors.hn?.message}><Input readOnly className={`${inputClass} bg-slate-100`} {...register("hn")} /></Field>
            <Field label="คำนำหน้า"><Input className={inputClass} {...register("prefix")} /></Field>
            <Field label="ชื่อ"><Input className={inputClass} {...register("first_name")} /></Field>
            <Field label="นามสกุล"><Input className={inputClass} {...register("last_name")} /></Field>
            <Field label="ชื่อ-นามสกุล (เต็ม)" wide><Input className={inputClass} {...register("full_name")} /></Field>
            <Field label="เพศ" error={errors.gender?.message}><select {...register("gender")} className="mt-2 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2"><option value="">-- เลือกเพศ --</option><option value="หญิง">เพศหญิง</option><option value="ชาย">เพศชาย</option></select></Field>
            <Field label="อายุ" error={errors.age?.message}><Input type="number" min={0} max={150} className={inputClass} {...register("age")} /></Field>
            <label className={`${labelClass} flex items-center gap-3 pt-7`}><input type="checkbox" {...register("is_smi_v")} className="size-4 accent-indigo-600" />Is SMI-V</label>
            <Field label="Diagnosis"><Input className={inputClass} {...register("diagnosis")} /></Field>
            <Field label="SMI-V Result"><Input className={inputClass} {...register("smi_v_result")} /></Field>
            <Field label="ประเภทผู้ป่วย (smi_type)"><Input className={inputClass} {...register("smi_type")} /></Field>
            <Field label="Substance use"><Input className={inputClass} {...register("substance_use")} /></Field>
            <Field label="Substance type"><Input className={inputClass} {...register("substance_type")} /></Field>
            <Field label="เบอร์โทรผู้ป่วย"><Input type="tel" className={inputClass} {...register("patient_phone")} /></Field>
            <Field label="วันที่รับ (ISO)" error={errors.admission_date?.message}><Input type="date" className={inputClass} {...register("admission_date")} /></Field>
            <Field label="แพทย์เจ้าของไข้"><Input className={inputClass} {...register("admitting_doctor")} /></Field>
            <Field label="ชื่อผู้ดูแล"><Input className={inputClass} {...register("caregiver_name")} /></Field>
            <Field label="ความสัมพันธ์ผู้ดูแล"><Input className={inputClass} {...register("caregiver_relation")} /></Field>
            <Field label="เบอร์โทรผู้ดูแล"><Input type="tel" className={inputClass} {...register("caregiver_phone")} /></Field>
            <Field label="Admission source"><Input className={inputClass} {...register("admission_source")} /></Field>
            <Field label="Residence type"><Input className={inputClass} {...register("residence_type")} /></Field>
            <Field label="Residence details" wide><Textarea className={`${inputClass} min-h-20`} {...register("residence_details")} /></Field>
            <Field label="Residence district"><Input className={inputClass} {...register("residence_district")} /></Field>
            <Field label="Residence subdistrict"><Input className={inputClass} {...register("residence_subdistrict")} /></Field>
            <Field label="Aggressive behaviour" wide><Textarea className={`${inputClass} min-h-20`} {...register("aggressive_behavior")} /></Field>
            <Field label="OAS Score" error={errors.oas_score?.message}><Input type="number" min={0} max={3} className={inputClass} {...register("oas_score")} /></Field>
            <Field label="OAS Risk Level"><Input className={inputClass} {...register("oas_risk_level")} /></Field>
            <div className="flex justify-end md:col-span-2"><Button type="submit" disabled={saving}>{saving ? "กำลังบันทึก..." : "บันทึกข้อมูล"}</Button></div>
          </form> : null}
        </CardContent>
      </Card>
    </div>
  );
}
