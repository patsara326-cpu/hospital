"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm, useWatch } from "react-hook-form";

import { searchIorPatientAction, saveIorRecordAction, type IorPatient } from "@/app/actions/ior";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { IOR_BEHAVIORS, IOR_LEVELS } from "@/lib/constants/ior";
import { formatDateBE, todayISOInThailand } from "@/lib/utils/date";
import { iorSchema, type IorFormValues } from "@/lib/validation/ior";

function patientDisplayName(patient: IorPatient) {
  return `${patient.prefix || ""}${patient.full_name || ""}`.trim() || patient.hn;
}

const defaults = (): IorFormValues => ({ hn: "", recordDate: todayISOInThailand(), behaviors: [], level: "" as IorFormValues["level"] });

export default function IorForm() {
  const [patient, setPatient] = useState<IorPatient | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [serverError, setServerError] = useState("");
  const [message, setMessage] = useState("");
  const { control, register, handleSubmit, getValues, setError, reset, formState: { errors } } = useForm<IorFormValues>({
    resolver: zodResolver(iorSchema),
    defaultValues: defaults(),
  });
  const recordDate = useWatch({ control, name: "recordDate" });

  async function searchPatient() {
    const hn = getValues("hn").trim();
    if (!hn) return setError("hn", { message: "กรุณากรอกรหัส HN" });
    setLoading(true);
    setServerError("");
    setMessage("");
    const formData = new FormData();
    formData.set("hn", hn);
    const result = await searchIorPatientAction(formData);
    setLoading(false);
    setPatient(result.patient);
    setServerError(result.error);
    if (result.patient) setMessage(`พบข้อมูลผู้ป่วย ${patientDisplayName(result.patient)}`);
  }

  async function saveRecord(values: IorFormValues) {
    if (!patient || patient.hn !== values.hn.trim()) {
      setError("hn", { message: "กรุณาค้นหาและยืนยันผู้ป่วยก่อนบันทึก" });
      return;
    }
    setSaving(true);
    setServerError("");
    setMessage("");
    const formData = new FormData();
    formData.set("hn", patient.hn);
    formData.set("recordDate", values.recordDate);
    formData.set("behaviors", JSON.stringify(values.behaviors));
    formData.set("level", values.level);
    const result = await saveIorRecordAction(formData);
    setSaving(false);
    if (result.status === "error") return setServerError(result.message);
    setMessage(result.message);
    setPatient(null);
    reset(defaults());
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 md:px-6">
      <Card className="rounded-3xl">
        <CardHeader><p className="text-sm font-medium uppercase tracking-[0.2em] text-indigo-600">IOR</p><h1 className="text-3xl font-semibold leading-none tracking-tight">บันทึก IOR</h1></CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(saveRecord)} noValidate>
            <div className="flex gap-3">
              <div className="w-full"><Label htmlFor="ior-patient-hn-search" className="sr-only">ค้นหาผู้ป่วยด้วย HN</Label><Input id="ior-patient-hn-search" placeholder="กรอกรหัส HN" aria-invalid={Boolean(errors.hn)} {...register("hn", { onChange: () => setPatient(null) })} /><p className="mt-1 text-sm text-destructive">{errors.hn?.message}</p></div>
              <Button type="button" onClick={searchPatient} disabled={loading}>{loading ? "กำลังค้นหา..." : "ค้นหา"}</Button>
            </div>
            {serverError ? <Alert className="mt-4 border-destructive/40 bg-destructive/10 text-destructive"><AlertDescription>{serverError}</AlertDescription></Alert> : null}
            {message ? <Alert className="mt-4 border-emerald-200 bg-emerald-50 text-emerald-700"><AlertDescription>{message}</AlertDescription></Alert> : null}
            {patient ? <div className="mt-5 rounded-2xl border border-indigo-100 border-l-4 bg-slate-50 p-4 text-sm"><strong>HN: {patient.hn}</strong> <span className="mx-2">|</span> {patientDisplayName(patient)}</div> : null}

            {patient ? (
              <div className="mt-6 space-y-4">
                <div className="rounded-2xl border p-4"><Label htmlFor="ior-record-date">วันที่บันทึก</Label><Input id="ior-record-date" type="date" className="mt-2" {...register("recordDate")} /><p className="mt-2 text-sm text-muted-foreground">แสดงผล พ.ศ.: {formatDateBE(recordDate, "-")}</p><p className="text-sm text-destructive">{errors.recordDate?.message}</p></div>
                <fieldset className="rounded-2xl border p-4"><legend className="px-1 text-sm font-semibold">พฤติกรรมรุนแรง</legend><div className="mt-2 space-y-3">{IOR_BEHAVIORS.map((behavior) => <label key={behavior} className="flex cursor-pointer items-start gap-3 text-sm"><input type="checkbox" value={behavior} {...register("behaviors")} className="mt-0.5 size-4 accent-indigo-600" /><span>{behavior}</span></label>)}</div><p className="mt-2 text-sm text-destructive">{errors.behaviors?.message}</p></fieldset>
                <fieldset className="rounded-2xl border p-4"><legend className="px-1 text-sm font-semibold">Level</legend><div className="mt-2 flex flex-wrap gap-4">{IOR_LEVELS.map((level) => <label key={level} className="flex cursor-pointer items-center gap-1.5 text-sm"><input type="radio" value={level} {...register("level")} className="accent-indigo-600" />{level}</label>)}</div><p className="mt-2 text-sm text-destructive">{errors.level?.message}</p></fieldset>
                <div className="flex justify-end"><Button type="submit" disabled={saving}>{saving ? "กำลังบันทึก..." : "บันทึกข้อมูล"}</Button></div>
              </div>
            ) : null}
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
