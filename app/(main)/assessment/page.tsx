"use client";

import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { useState } from "react";

const PHUA_ITEMS = [
  "รู้สึกหวาดระแวงว่ามีคนมุ่งร้าย",
  "ความรู้สึกไม่เป็นมิตร",
  "ไม่ร่วมมือในการรักษา",
  "อาการตื่นเต้นกระวนกระวาย",
];

const GHARD_ITEMS = [
  "ความรู้สึกผิด",
  "ประสาทหลอน",
  "อาการตื่นเต้นกระวนกระวาย",
  "การเคลื่อนไหวเชื่องช้า",
  "อารมณ์ซึมเศร้า",
];

const scoreLabels = [
  { value: 0, label: "0" },
  { value: 1, label: "1" },
  { value: 2, label: "2" },
  { value: 3, label: "3" },
  { value: 4, label: "4" },
];

type PatientRecord = {
  hn: string;
  full_name?: string | null;
  gender?: string | null;
  age?: number | null;
  smi_type?: string | null;
  admit_date?: string | null;
  admitting_doctor?: string | null;
};

export default function AssessmentPage() {
  const [hn, setHn] = useState("");
  const [patient, setPatient] = useState<PatientRecord | null>(null);
  const [scores, setScores] = useState<Record<string, number>>({});
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const allItems = [...PHUA_ITEMS, ...GHARD_ITEMS];
  const total = allItems.reduce((sum, item) => sum + (scores[item] ?? 0), 0);
  const riskLevel = total >= 12 ? "เสี่ยงสูง" : total >= 7 ? "เสี่ยงปานกลาง" : "เสี่ยงน้อย";

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

    setPatient(data as PatientRecord);
    setScores({});
    setMessage(`พบข้อมูลผู้ป่วย ${data.full_name ?? data.hn}`);
  }

  function handleScore(item: string, value: number) {
    setScores((current) => ({ ...current, [item]: value }));
  }

  async function saveAssessment() {
    if (!patient) {
      setError("กรุณาค้นหาผู้ป่วยก่อนบันทึก");
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

    const rawData = {
      hn: patient.hn,
      full_name: patient.full_name,
      gender: patient.gender,
      age: patient.age,
      smi_type: patient.smi_type,
      assess_date: new Date().toISOString().slice(0, 10),
      scores,
      total,
      risk_level: riskLevel,
    };

    const { error: insertError } = await supabase.from("assessments").insert([
      {
        hn: patient.hn,
        record_type: "daily",
        assess_date: new Date().toISOString().slice(0, 10),
        oas_score: total,
        raw_data: rawData,
      },
    ]);

    setSaving(false);

    if (insertError) {
      setError(`บันทึกผลประเมินล้มเหลว: ${insertError.message}`);
      return;
    }

    setMessage(`บันทึกผลประเมินสำเร็จ: ${riskLevel}`);
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 md:px-6">
      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div>
          <p className="text-sm font-medium uppercase tracking-[0.2em] text-indigo-600">
            Assessment
          </p>
          <h1 className="mt-1 text-3xl font-bold text-slate-800">
            ประเมินรายเวร
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
          <>
            <div className="mt-8 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
              <div className="grid gap-3 md:grid-cols-3">
                <div><span className="font-semibold text-slate-900">HN:</span> {patient.hn}</div>
                <div><span className="font-semibold text-slate-900">ชื่อ:</span> {patient.full_name ?? "-"}</div>
                <div><span className="font-semibold text-slate-900">อายุ:</span> {patient.age ?? "-"}</div>
              </div>
            </div>

            <div className="mt-8 overflow-x-auto rounded-2xl border border-slate-200">
              <table className="min-w-full border-collapse text-left text-sm">
                <thead className="bg-slate-50 text-slate-700">
                  <tr>
                    <th className="px-4 py-3 font-semibold">รายการประเมิน</th>
                    {scoreLabels.map((item) => (
                      <th key={item.value} className="px-2 py-3 text-center font-semibold">
                        {item.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 bg-white">
                  {allItems.map((item) => (
                    <tr key={item}>
                      <td className="px-4 py-3 text-slate-700">{item}</td>
                      {scoreLabels.map((score) => (
                        <td key={`${item}-${score.value}`} className="px-2 py-3 text-center">
                          <input
                            type="radio"
                            name={item}
                            value={score.value}
                            checked={(scores[item] ?? 0) === score.value}
                            onChange={() => handleScore(item, score.value)}
                            className="h-4 w-4 accent-indigo-600"
                          />
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mt-8 flex flex-col gap-4 rounded-2xl border border-indigo-100 bg-indigo-50 p-4 md:flex-row md:items-center md:justify-between">
              <div>
                <div className="text-sm text-indigo-700">คะแนนรวม</div>
                <div className="text-3xl font-bold text-indigo-900">{total}</div>
              </div>
              <div>
                <div className="text-sm text-indigo-700">ระดับความเสี่ยง</div>
                <div className="text-lg font-bold text-indigo-900">{riskLevel}</div>
              </div>
              <button
                type="button"
                onClick={saveAssessment}
                className="rounded-xl bg-gradient-to-r from-indigo-600 to-sky-500 px-5 py-2.5 font-semibold text-white shadow-lg shadow-indigo-500/20 transition hover:brightness-105"
              >
                {saving ? "กำลังบันทึก..." : "บันทึกผลประเมิน"}
              </button>
            </div>
          </>
        ) : null}
      </section>
    </div>
  );
}
