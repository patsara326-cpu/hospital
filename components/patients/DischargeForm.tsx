"use client";

import { useState } from "react";

import {
  saveDischargeAction,
  searchPatientForDischargeAction,
  type DischargePatient,
} from "@/app/actions/patients";
import { formatDateBE } from "@/lib/utils/date";

const inputClass = "mt-2 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200";
const labelClass = "block text-sm font-medium text-slate-700";

export default function DischargeForm() {
  const [searchHn, setSearchHn] = useState("");
  const [patient, setPatient] = useState<DischargePatient | null>(null);
  const [method, setMethod] = useState("");
  const [transferOther, setTransferOther] = useState("");
  const [dischargeDate, setDischargeDate] = useState("");
  const [lastDiagnosis, setLastDiagnosis] = useState("");
  const [dischargeType, setDischargeType] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function searchPatient() {
    const data = new FormData();
    data.set("hn", searchHn);
    setLoading(true); setMessage(""); setError("");
    const result = await searchPatientForDischargeAction(data);
    setLoading(false);
    setPatient(result.patient);
    setMessage(result.message);
    setError(result.error);
    if (result.patient) setLastDiagnosis("");
  }

  async function saveDischarge() {
    if (!patient) return setError("กรุณาค้นหาและเลือกผู้ป่วยก่อนบันทึก");
    const data = new FormData();
    data.set("hn", patient.hn);
    data.set("dischargeMethod", method);
    data.set("transferOther", transferOther);
    data.set("dischargeDate", dischargeDate);
    data.set("lastDiagnosis", lastDiagnosis);
    data.set("dischargeType", dischargeType);
    setSaving(true); setError(""); setMessage("");
    const result = await saveDischargeAction(data);
    setSaving(false);
    if (result.status === "error") return setError(result.message);
    setPatient(null); setSearchHn(""); setMethod(""); setTransferOther(""); setDischargeDate(""); setLastDiagnosis(""); setDischargeType(""); setMessage(result.message);
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 md:px-6">
      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-sm font-medium uppercase tracking-[0.2em] text-indigo-600">Discharge</p>
        <h1 className="mt-1 text-2xl font-bold text-slate-800 md:text-3xl">ทะเบียนจำหน่ายผู้ป่วย</h1>

        <form className="mt-6 flex flex-col gap-3 md:flex-row" onSubmit={(event) => { event.preventDefault(); void searchPatient(); }}>
          <input value={searchHn} onChange={(event) => setSearchHn(event.target.value)} placeholder="กรอกรหัส HN" className={`${inputClass} mt-0`} />
          <button type="submit" disabled={loading} className="rounded-xl bg-indigo-600 px-5 py-2.5 font-semibold text-white transition hover:bg-indigo-700 disabled:opacity-50">{loading ? "กำลังค้นหา..." : "ค้นหา"}</button>
        </form>

        {error ? <p className="mt-4 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p> : null}
        {message ? <p className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{message}</p> : null}

        {patient ? <div className="mt-8 rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <div className="grid gap-2 text-sm text-slate-700 md:grid-cols-3">
            <p><strong>ชื่อ-นามสกุล:</strong> {`${patient.prefix ?? ""} ${patient.full_name ?? ""}`.trim() || "-"}</p>
            <p><strong>วันที่รับ:</strong> {formatDateBE(patient.admit_date, "ไม่ระบุ")}</p>
            <p><strong>อายุ:</strong> {patient.age ?? "ไม่ระบุ"}</p>
            <p><strong>SMI-V:</strong> {patient.smi_type ?? "ไม่ระบุ"}</p>
            <p><strong>แพทย์เจ้าของไข้:</strong> {patient.admitting_doctor ?? "ไม่ระบุ"}</p>
            <p><strong>เพศ:</strong> {patient.gender ?? "ไม่ระบุ"}</p>
          </div>

          <div className="mt-8 grid gap-4 md:grid-cols-2">
            <label className={labelClass}>วิธีการจำหน่าย<select value={method} onChange={(event) => setMethod(event.target.value)} className={inputClass}><option value="">-- เลือกวิธีการจำหน่าย --</option><option value="แพทย์อนุญาต">แพทย์อนุญาต</option><option value="ปฏิเสธการรักษา">ปฏิเสธการรักษา</option><option value="refer back">refer back</option><option value="transfer">transfer</option></select>{method === "transfer" ? <input value={transferOther} onChange={(event) => setTransferOther(event.target.value)} className={inputClass} placeholder="รายละเอียดการ transfer (ถ้ามี)" /> : null}</label>
            <label className={labelClass}>จำหน่ายวันที่<input type="date" value={dischargeDate} onChange={(event) => setDischargeDate(event.target.value)} className={inputClass} />{dischargeDate ? <span className="mt-1 block text-xs text-slate-500">พ.ศ. {formatDateBE(dischargeDate)}</span> : null}</label>
            <label className={`${labelClass} md:col-span-2`}>Last diagnosis<input value={lastDiagnosis} onChange={(event) => setLastDiagnosis(event.target.value)} className={inputClass} placeholder="ระบุ diagnosis สุดท้าย" /></label>
            <fieldset className="md:col-span-2"><legend className={labelClass}>การเยี่ยมบ้าน</legend><div className="mt-2 flex flex-wrap gap-3">{[["อนุญาตเยี่ยมบ้าน", "อนุญาตเยี่ยมบ้าน"], ["ไม่อนุญาตเยี่ยมบ้าน", "ไม่อนุญาตเยี่ยมบ้าน"]].map(([value, label]) => <label key={value} className="flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700"><input type="radio" name="discharge-type" value={value} checked={dischargeType === value} onChange={(event) => setDischargeType(event.target.value)} />{label}</label>)}</div></fieldset>
          </div>
          <div className="mt-8 flex justify-end"><button type="button" onClick={() => void saveDischarge()} disabled={saving} className="rounded-xl bg-gradient-to-r from-rose-600 to-red-500 px-5 py-2.5 font-semibold text-white shadow-lg shadow-rose-500/20 transition hover:brightness-105 disabled:opacity-50">{saving ? "กำลังบันทึก..." : "บันทึกการจำหน่าย"}</button></div>
        </div> : null}
      </section>
    </div>
  );
}
