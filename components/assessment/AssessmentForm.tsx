"use client";

import { loadAssessmentPatientsAction, saveShiftAssessmentAction, type AssessmentPatient } from "@/app/actions/assessment";
import { ASSESSMENT_SCORE_VALUES, GHARD_ITEMS, PHUA_ITEMS } from "@/lib/constants/scales";
import { calculateRisk, type RiskCategory } from "@/lib/utils/risk";
import { formatDateBE } from "@/lib/utils/date";
import { useEffect, useMemo, useRef, useState } from "react";
import ScaleTable from "./ScaleTable";

const GENDERS = [
  { value: "ชาย", label: "ผู้ป่วยชาย" },
  { value: "หญิง", label: "ผู้ป่วยหญิง" },
] as const;
const SHIFTS = ["เวรดึก", "เวรเช้า", "เวรบ่าย"] as const;
const OAS_OPTIONS = [0, 1, 2, 3] as const;

function today() {
  return new Date().toISOString().slice(0, 10);
}

function patientName(patient: AssessmentPatient) {
  return [patient.prefix, patient.full_name].filter(Boolean).join(" ") || patient.hn;
}

function riskFor(scores: Array<number | null>, length: number): RiskCategory | null {
  return scores.length === length && scores.every((score): score is number => score !== null)
    ? calculateRisk(scores)
    : null;
}

export default function AssessmentForm() {
  const [gender, setGender] = useState("");
  const [patients, setPatients] = useState<AssessmentPatient[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<AssessmentPatient | null>(null);
  const [assessDate, setAssessDate] = useState(today);
  const [shift, setShift] = useState("");
  const [oasScore, setOasScore] = useState("");
  const [phuaScores, setPhuaScores] = useState<Array<number | null>>(() => PHUA_ITEMS.map(() => null));
  const [ghardScores, setGhardScores] = useState<Array<number | null>>(() => GHARD_ITEMS.map(() => null));
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const assessmentSectionRef = useRef<HTMLDivElement>(null);

  const phuaRisk = useMemo(() => riskFor(phuaScores, PHUA_ITEMS.length), [phuaScores]);
  const ghardRisk = useMemo(() => riskFor(ghardScores, GHARD_ITEMS.length), [ghardScores]);

  async function selectGender(value: string) {
    setGender(value);
    setSelectedPatient(null);
    setError("");
    setMessage("");
    setLoading(true);
    const result = await loadAssessmentPatientsAction(value);
    setLoading(false);
    setPatients(result.patients);
    setError(result.error);
  }

  function selectPatient(patient: AssessmentPatient) {
    setSelectedPatient(patient);
    setError("");
    setMessage("");
    setPhuaScores(PHUA_ITEMS.map(() => null));
    setGhardScores(GHARD_ITEMS.map(() => null));
  }

  useEffect(() => {
    if (!selectedPatient) return;
    assessmentSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [selectedPatient]);

  async function saveAssessment() {
    if (!selectedPatient || !assessDate || !shift || oasScore === "" || !phuaRisk || !ghardRisk) {
      setError("กรุณาเลือกผู้ป่วยและกรอกข้อมูลการประเมินให้ครบถ้วน");
      setMessage("");
      return;
    }
    setSaving(true);
    setError("");
    setMessage("");
    const formData = new FormData();
    formData.set("hn", selectedPatient.hn);
    formData.set("assessDate", assessDate);
    formData.set("shift", shift);
    formData.set("oasScore", oasScore);
    formData.set("phuaScores", JSON.stringify(phuaScores));
    formData.set("ghardScores", JSON.stringify(ghardScores));
    const result = await saveShiftAssessmentAction(formData);
    setSaving(false);
    if (result.status === "error") {
      setError(result.message);
      return;
    }
    setMessage(result.message);
    setSelectedPatient(null);
    setPhuaScores(PHUA_ITEMS.map(() => null));
    setGhardScores(GHARD_ITEMS.map(() => null));
    setShift("");
    setOasScore("");
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 md:px-6">
      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-sm font-medium uppercase tracking-[0.2em] text-indigo-600">Assessment</p>
        <h1 className="mt-1 text-3xl font-bold text-slate-800">ประเมินรายเวร</h1>

        <div className="mt-6 flex flex-wrap gap-3">
          {GENDERS.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => selectGender(option.value)}
              className={`rounded-xl px-5 py-2.5 font-semibold transition ${gender === option.value ? "bg-indigo-600 text-white" : "border border-slate-300 bg-white text-slate-700 hover:border-indigo-400"}`}
            >
              {option.label}
            </button>
          ))}
        </div>

        {loading ? <p className="mt-4 text-sm text-slate-500">กำลังโหลดรายชื่อผู้ป่วย...</p> : null}
        {error ? <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div> : null}
        {message ? <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{message}</div> : null}

        {gender && !loading ? (
          <div className="mt-5 grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {patients.length ? patients.map((patient) => (
              <button
                key={patient.hn}
                type="button"
                onClick={() => selectPatient(patient)}
                className={`rounded-2xl border p-4 text-left transition ${selectedPatient?.hn === patient.hn ? "border-indigo-500 bg-indigo-50" : "border-slate-200 bg-slate-50 hover:border-indigo-300"}`}
              >
                <div className="font-semibold text-slate-900">{patientName(patient)}</div>
                <div className="mt-1 text-sm text-slate-600">HN: {patient.hn} · {patient.smi_type || "ไม่ระบุ SMI"}</div>
                <div className="mt-1 text-xs text-slate-500">วันที่รับไว้: {formatDateBE(patient.assessment_admit_date || patient.admit_date)} · แพทย์: {patient.admitting_doctor || "-"}</div>
              </button>
            )) : <p className="text-sm text-slate-500">ไม่พบรายชื่อผู้ป่วยเพศนี้</p>}
          </div>
        ) : null}

        {selectedPatient ? (
          <div ref={assessmentSectionRef} className="mt-8 scroll-mt-24">
            <div className="rounded-2xl border border-indigo-100 bg-indigo-50 p-4 text-sm text-slate-700">
              <h2 className="mb-3 border-b border-indigo-200 pb-2 text-base font-bold text-indigo-950">ข้อมูลผู้ป่วยที่เลือก</h2>
              <div className="grid gap-3 md:grid-cols-2">
                <div><span className="font-semibold text-slate-900">HN:</span> {selectedPatient.hn}</div>
                <div><span className="font-semibold text-slate-900">ชื่อ:</span> {patientName(selectedPatient)}</div>
                <div><span className="font-semibold text-slate-900">เพศ:</span> {selectedPatient.gender || "ไม่ระบุ"}</div>
                <div><span className="font-semibold text-slate-900">อายุ:</span> {selectedPatient.age == null ? "ไม่ระบุ" : `${selectedPatient.age} ปี`}</div>
                <div><span className="font-semibold text-slate-900">ประเภทผู้ป่วย:</span> {selectedPatient.smi_type || "ไม่ระบุ"}</div>
                <div><span className="font-semibold text-slate-900">วันที่รับมา:</span> {formatDateBE(selectedPatient.assessment_admit_date || selectedPatient.admit_date, "ไม่ระบุ")}</div>
                <div><span className="font-semibold text-slate-900">แพทย์เจ้าของไข้:</span> {selectedPatient.admitting_doctor || "ไม่ระบุ"}</div>
                <div><span className="font-semibold text-slate-900">สารเสพติด/สุรา:</span> {selectedPatient.substance || "ไม่ระบุ"}</div>
              </div>
            </div>

            <div className="mt-6 grid gap-4 md:grid-cols-3">
              <label className="text-sm font-medium text-slate-700">วันที่ประเมิน<input type="date" value={assessDate} onChange={(event) => setAssessDate(event.target.value)} className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2.5" /></label>
              <label className="text-sm font-medium text-slate-700">เวร<select value={shift} onChange={(event) => setShift(event.target.value)} className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2.5"><option value="">เลือกเวร</option>{SHIFTS.map((value) => <option key={value} value={value}>{value}</option>)}</select></label>
              <fieldset className="text-sm font-medium text-slate-700"><legend>OAS</legend><div className="mt-2 flex gap-4">{OAS_OPTIONS.map((value) => <label key={value} className="flex items-center gap-1"><input type="radio" name="oas-score" value={value} checked={oasScore === String(value)} onChange={() => setOasScore(String(value))} className="accent-indigo-600" />{value}</label>)}</div></fieldset>
            </div>

            <ScaleTable title="PHUA" items={PHUA_ITEMS} scores={phuaScores} values={ASSESSMENT_SCORE_VALUES} risk={phuaRisk} onChange={(index, value) => setPhuaScores((current) => current.map((score, itemIndex) => itemIndex === index ? value : score))} />
            <ScaleTable title="G-HARD" items={GHARD_ITEMS} scores={ghardScores} values={ASSESSMENT_SCORE_VALUES} risk={ghardRisk} onChange={(index, value) => setGhardScores((current) => current.map((score, itemIndex) => itemIndex === index ? value : score))} />

            <div className="mt-6 flex justify-end">
              <button type="button" onClick={saveAssessment} disabled={saving} className="rounded-xl bg-gradient-to-r from-indigo-600 to-sky-500 px-5 py-2.5 font-semibold text-white shadow-lg shadow-indigo-500/20 transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-60">
                {saving ? "กำลังบันทึก..." : "บันทึกผลการประเมิน"}
              </button>
            </div>
          </div>
        ) : null}
      </section>
    </div>
  );
}
