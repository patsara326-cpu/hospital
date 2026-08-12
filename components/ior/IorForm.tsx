"use client";

import { searchIorPatientAction, saveIorRecordAction, type IorPatient } from "@/app/actions/ior";
import { IOR_BEHAVIORS, IOR_LEVELS } from "@/lib/constants/ior";
import { formatDateBE } from "@/lib/utils/date";
import { useState } from "react";

function patientDisplayName(patient: IorPatient) {
  return `${patient.prefix || ""}${patient.full_name || ""}`.trim() || patient.hn;
}

export default function IorForm() {
  const [hn, setHn] = useState("");
  const [patient, setPatient] = useState<IorPatient | null>(null);
  const [recordDate, setRecordDate] = useState("");
  const [behaviors, setBehaviors] = useState<string[]>([]);
  const [level, setLevel] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  async function searchPatient() {
    setLoading(true);
    setError("");
    setMessage("");
    const formData = new FormData();
    formData.set("hn", hn.trim());
    const result = await searchIorPatientAction(formData);
    setLoading(false);
    setPatient(result.patient);
    setError(result.error);
    if (result.patient) setMessage(`พบข้อมูลผู้ป่วย ${patientDisplayName(result.patient)}`);
  }

  function toggleBehavior(behavior: string) {
    setBehaviors((current) => current.includes(behavior) ? current.filter((item) => item !== behavior) : [...current, behavior]);
  }

  async function saveRecord() {
    setSaving(true);
    setError("");
    setMessage("");
    const formData = new FormData();
    formData.set("hn", patient?.hn || hn.trim());
    formData.set("recordDate", recordDate);
    formData.set("behaviors", JSON.stringify(behaviors));
    formData.set("level", level);
    const result = await saveIorRecordAction(formData);
    setSaving(false);
    if (result.status === "error") {
      setError(result.message);
      return;
    }
    setMessage(result.message);
    window.setTimeout(() => {
      setHn("");
      setPatient(null);
      setRecordDate("");
      setBehaviors([]);
      setLevel("");
      setMessage("");
    }, 2000);
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 md:px-6">
      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-sm font-medium uppercase tracking-[0.2em] text-indigo-600">IOR</p>
        <h1 className="mt-1 text-3xl font-bold text-slate-800">บันทึก IOR</h1>

        <div className="mt-6 flex gap-3">
          <input value={hn} onChange={(event) => setHn(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") void searchPatient(); }} placeholder="กรอกรหัส HN" className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2.5 outline-none transition focus:border-indigo-500 focus:bg-white" />
          <button type="button" onClick={() => void searchPatient()} disabled={loading} className="rounded-xl bg-indigo-600 px-5 py-2.5 font-semibold text-white transition hover:bg-indigo-700 disabled:opacity-60">{loading ? "กำลังค้นหา..." : "ค้นหา"}</button>
        </div>

        {error ? <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div> : null}
        {message ? <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{message}</div> : null}

        {patient ? (
          <div className="mt-5 rounded-2xl border border-indigo-100 border-l-4 bg-slate-50 p-4 text-sm text-slate-700">
            <span className="font-semibold text-slate-900">HN: {patient.hn}</span> <span className="mx-2">|</span> {patientDisplayName(patient)}
          </div>
        ) : null}

        {patient ? (
          <div className="mt-6">
            <label className="block rounded-2xl border border-slate-200 p-4 text-sm font-semibold text-slate-700">
              วันที่บันทึก
              <input type="date" value={recordDate} onChange={(event) => setRecordDate(event.target.value)} className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 font-normal outline-none focus:border-indigo-500" />
              {recordDate ? <span className="mt-2 block font-normal text-slate-500">แสดงผล พ.ศ.: {formatDateBE(recordDate, "")}</span> : null}
            </label>

            <fieldset className="mt-4 rounded-2xl border border-slate-200 p-4">
              <legend className="px-1 text-sm font-semibold text-slate-700">พฤติกรรมรุนแรง</legend>
              <div className="mt-2 space-y-3">
                {IOR_BEHAVIORS.map((behavior) => (
                  <label key={behavior} className="flex cursor-pointer items-start gap-3 text-sm text-slate-700">
                    <input type="checkbox" checked={behaviors.includes(behavior)} onChange={() => toggleBehavior(behavior)} className="mt-0.5 h-4 w-4 shrink-0 accent-indigo-600" />
                    <span>{behavior}</span>
                  </label>
                ))}
              </div>
            </fieldset>

            <fieldset className="mt-4 rounded-2xl border border-slate-200 p-4">
              <legend className="px-1 text-sm font-semibold text-slate-700">Level</legend>
              <div className="mt-2 flex flex-wrap gap-4">
                {IOR_LEVELS.map((value) => (
                  <label key={value} className="flex cursor-pointer items-center gap-1.5 text-sm text-slate-700"><input type="radio" name="ior-level" value={value} checked={level === value} onChange={() => setLevel(value)} className="accent-indigo-600" />{value}</label>
                ))}
              </div>
            </fieldset>

            <div className="mt-6 flex justify-end">
              <button type="button" onClick={() => void saveRecord()} disabled={saving} className="rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-500 px-5 py-2.5 font-semibold text-white shadow-lg shadow-violet-500/20 transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-60">{saving ? "กำลังบันทึก..." : "บันทึกข้อมูล"}</button>
            </div>
          </div>
        ) : null}
      </section>
    </div>
  );
}
