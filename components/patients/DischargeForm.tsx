"use client";

import { useState } from "react";

import {
  saveDischargeAction,
  searchPatientForDischargeAction,
  type DischargePatient,
} from "@/app/actions/patients";
import { formatDateBE } from "@/lib/utils/date";

const inputClass =
  "mt-2 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200";
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
    setLoading(true);
    setMessage("");
    setError("");
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
    setSaving(true);
    setError("");
    setMessage("");
    const result = await saveDischargeAction(data);
    setSaving(false);
    if (result.status === "error") return setError(result.message);
    setPatient(null);
    setSearchHn("");
    setMethod("");
    setTransferOther("");
    setDischargeDate("");
    setLastDiagnosis("");
    setDischargeType("");
    setMessage(result.message);
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 md:px-6">
      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-sm font-medium uppercase tracking-[0.2em] text-indigo-600">
          Discharge
        </p>
        <h1 className="mt-1 text-2xl font-bold text-slate-800 md:text-3xl">
          ทะเบียนจำหน่ายผู้ป่วย
        </h1>

        <form
          className="mt-6 flex flex-col gap-3 md:flex-row"
          onSubmit={(event) => {
            event.preventDefault();
            void searchPatient();
          }}
        >
          <input
            value={searchHn}
            onChange={(event) => setSearchHn(event.target.value)}
            placeholder="กรอกรหัส HN"
            className={`${inputClass} mt-0`}
          />
          <button
            type="submit"
            disabled={loading}
            className="rounded-xl bg-indigo-600 px-5 py-2.5 font-semibold text-white transition hover:bg-indigo-700 disabled:opacity-50"
          >
            {loading ? "กำลังค้นหา..." : "ค้นหา"}
          </button>
        </form>

        {error ? (
          <p className="mt-4 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </p>
        ) : null}
        {message ? (
          <p className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
            {message}
          </p>
        ) : null}

        {patient ? (
          <div className="mt-8 rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <div className="grid gap-2 text-sm text-slate-700 md:grid-cols-3">
              <p>
                <strong>ชื่อ-นามสกุล:</strong>{" "}
                {`${patient.prefix ?? ""} ${patient.full_name ?? ""}`.trim() ||
                  "-"}
              </p>
              <p>
                <strong>วันที่รับ:</strong>{" "}
                {formatDateBE(patient.admit_date, "ไม่ระบุ")}
              </p>
              <p>
                <strong>อายุ:</strong> {patient.age ?? "ไม่ระบุ"}
              </p>
              <p>
                <strong>SMI-V:</strong> {patient.smi_type ?? "ไม่ระบุ"}
              </p>
              <p>
                <strong>แพทย์เจ้าของไข้:</strong>{" "}
                {patient.admitting_doctor ?? "ไม่ระบุ"}
              </p>
              <p>
                <strong>เพศ:</strong> {patient.gender ?? "ไม่ระบุ"}
              </p>
            </div>

            <div className="mt-8 grid gap-4 md:grid-cols-2">
              <label className={labelClass}>
                วิธีการจำหน่าย
                <select
                  value={method}
                  onChange={(event) => setMethod(event.target.value)}
                  className={inputClass}
                >
                  <option value="">-- เลือกวิธีการจำหน่าย --</option>
                  <option value="แพทย์อนุญาต">แพทย์อนุญาต</option>
                  <option value="ปฏิเสธการรักษา">ปฏิเสธการรักษา</option>
                  <option value="refer back">refer back</option>
                  <option value="transfer">transfer</option>
                </select>
                {method === "transfer" ? (
                  <input
                    value={transferOther}
                    onChange={(event) => setTransferOther(event.target.value)}
                    className={inputClass}
                    placeholder="รายละเอียดการ transfer (ถ้ามี)"
                  />
                ) : null}
              </label>
              <label className={labelClass}>
                จำหน่ายวันที่
                <input
                  type="date"
                  value={dischargeDate}
                  onChange={(event) => setDischargeDate(event.target.value)}
                  className={inputClass}
                />
                {dischargeDate ? (
                  <span className="mt-1 block text-xs text-slate-500">
                    พ.ศ. {formatDateBE(dischargeDate)}
                  </span>
                ) : null}
              </label>
              <label className={`${labelClass} md:col-span-2`}>
                Last diagnosis
                <input
                  value={lastDiagnosis}
                  onChange={(event) => setLastDiagnosis(event.target.value)}
                  className={inputClass}
                  list="diagnosis-list"
                  placeholder="ระบุ diagnosis สุดท้าย"
                />
                <datalist id="diagnosis-list">
                  <option value="F01.9 Vascular dementia, unspecified" />
                  <option value="F03 Unspecified dementia" />
                  <option value="F05.9 Delirium, unspecified" />
                  <option value="F09 Unspecified organic or symptomatic mental disorder" />

                  <option value="F10.0 Mental and behavioural disorders due to use of alcohol, acute intoxication" />
                  <option value="F10.2 Mental and behavioural disorders due to use of alcohol, dependence syndrome Chronic alcoholism Dipsomania" />
                  <option value="F10.3 Mental and behavioural disorders due to use of alcohol, withdrawal state" />
                  <option value="F10.9 Mental and behavioural disorders due to use of alcohol, unspecified" />

                  <option value="F11.0 Mental and behavioural disorders due to use of opioids, acute intoxication" />
                  <option value="F11.2 Mental and behavioural disorders due to use of opioids, dependence syndrome" />
                  <option value="F11.3 Mental and behavioural disorders due to use of opioids, withdrawal state" />
                  <option value="F11.9 Mental and behavioural disorders due to use of opioids, unspecified" />

                  <option value="F12.0 Mental and behavioural disorders due to use of cannabinioids, acute intoxication" />
                  <option value="F12.2 Mental and behavioural disorders due to use of cannabinioids, dependence syndrome" />
                  <option value="F12.3 Mental and behavioural disorders due to use of cannabinioids, withdrawal state" />
                  <option value="F12.9 Mental and behavioural disorders due to use of cannabinioids, unspecified" />

                  <option value="F13.0 Mental and behavioural disorders due to use of sedatives or hypnotics, acute intoxication" />
                  <option value="F13.2 Mental and behavioural disorders due to use of sedatives or hypnotics, dependence syndrome" />
                  <option value="F13.3 Mental and behavioural disorders due to use of sedatives or hypnotics, withdrawal state" />
                  <option value="F13.9 Mental and behavioural disorders due to use of sedatives or hypnotics, unspecified" />

                  <option value="F14.0 Mental and behavioural disorders due to use of cocaine, acute intoxication" />
                  <option value="F14.2 Mental and behavioural disorders due to use of cocaine, dependence syndrome" />
                  <option value="F14.3 Mental and behavioural disorders due to use of cocaine, withdrawal state" />
                  <option value="F14.9 Mental and behavioural disorders due to use of cocaine, unspecified" />

                  <option value="F15.0 Mental and behavioural disorders due to use of other stimulants, including caffeine, acute intoxication" />
                  <option value="F15.2 Mental and behavioural disorders due to use of other stimulants, including caffeine, dependence syndrome" />
                  <option value="F15.3 Mental and behavioural disorders due to use of other stimulants, including caffeine, withdrawal state" />
                  <option value="F15.9 Mental and behavioural disorders due to use of other stimulants, including caffeine, unspecified" />

                  <option value="F16.0 Mental and behavioural disorders due to use of hallucinogens, acute intoxication" />
                  <option value="F16.2 Mental and behavioural disorders due to use of hallucinogens, dependence syndrome" />
                  <option value="F16.3 Mental and behavioural disorders due to use of hallucinogens, withdrawal state" />
                  <option value="F16.9 Mental and behavioural disorders due to use of hallucinogens, unspecified" />

                  <option value="F17.0 Mental and behavioural disorders due to use of tobacco, acute intoxication" />
                  <option value="F17.2 Mental and behavioural disorders due to use of tobacco, dependence syndrome" />
                  <option value="F17.3 Mental and behavioural disorders due to use of tobacco, withdrawal state" />
                  <option value="F17.9 Mental and behavioural disorders due to use of tobacco, unspecified" />

                  <option value="F18.0 Mental and behavioural disorders due to use of volatile solvents, acute intoxication" />
                  <option value="F18.2 Mental and behavioural disorders due to use of volatile solvents, dependence syndrome" />
                  <option value="F18.3 Mental and behavioural disorders due to use of volatile solvents, withdrawal state" />
                  <option value="F18.9 Mental and behavioural disorders due to use of volatile solvents, unspecified" />

                  <option value="F19.0 Mental and behavioural disorders due to use of multiple drug use and use of other psychoactive substances, acute intoxication" />
                  <option value="F19.2 Mental and behavioural disorders due to use of multiple drug use and use of other psychoactive substances, dependence syndrome" />
                  <option value="F19.3 Mental and behavioural disorders due to use of multiple drug use and use of other psychoactive substances, withdrawal state" />
                  <option value="F19.9 Mental and behavioural disorders due to use of multiple drug use and use of other psychoactive substances, unspecified" />

                  <option value="F20.99 Schizophrenia, unspecified, course uncertain, period of observation is too short" />
                  <option value="F29 Unspecified nonorganic psychosis Psychosis" />
                  <option value="F32.9 Depressive episode, unspecified" />
                  <option value="F39 Unspecified mood [affective] disorder" />
                  <option value="F40.9 Phobic anxiety disorder, unspecified" />
                  <option value="F41.9 Anxiety disorder, unspecified" />
                  <option value="F42.9 Obsessive-compulsive disorder, unspecified" />
                  <option value="F43.0 Acute stress reaction" />
                  <option value="F43.1 Post-traumatic stress disorder" />
                  <option value="F43.2 Adjustment disorders" />
                  <option value="F43.9 Reaction to severe stress, unspecified" />
                  <option value="F45.2 Hypochondriacal disorder" />
                  <option value="F45.9 Somatoform disorder, unspecified" />
                  <option value="F48.9 Neurotic disorder, unspecified" />

                  <option value="F50.0 Anorexia nervosa" />
                  <option value="F50.2 Bulimia nervosa" />
                  <option value="F50.9 Eating disorder, unspecified" />
                  <option value="F51.0 Nonorganic insomnia" />
                  <option value="F51.3 Sleepwalking [somnambulism]" />
                  <option value="F51.4 Sleep terrors [night terrors]" />
                  <option value="F51.5 Nightmares Dream" />
                  <option value="F51.9 Nonorganic sleep disorder, unspecified" />
                  <option value="F52.0 Lack or loss of sexual desire" />
                  <option value="F52.1 Sexual aversion and lack of sexual enjoyment" />
                  <option value="F52.2 Failure of genital response" />
                  <option value="F52.3 Orgasmic dysfunction" />
                  <option value="F52.4 Premature ejaculation" />
                  <option value="F52.5 Nonorganic vaginismus" />
                  <option value="F52.6 Nonorganic dyspareunia" />
                  <option value="F52.7 Excessive sexual drive" />
                  <option value="F52.9 Unspecified sexual dysfunction, not caused by organic disorder or disease" />
                  <option value="F53.0 Mild mental and behavioural disorders associated with the puerperium, not elsewhere classified" />
                  <option value="F53.1 Severe mental and behavioural disorders associated with the puerperium, not elsewhere classified" />
                  <option value="F53.9 Puerperal mental disorder, unspecified" />

                  <option value="F55.0 Antidepressants abuse" />
                  <option value="F55.1 Laxatives abuse" />
                  <option value="F55.2 Analgesics abuse" />
                  <option value="F55.3 Antacids abuse" />
                  <option value="F55.4 Vitamins abuse" />
                  <option value="F55.5 Steroids or hormones abuse" />
                  <option value="F55.6 Specific herbal or folk remedies abuse" />
                  <option value="F55.7 Multiple substances abuse" />
                  <option value="F55.8 Other non-dependence-producing substances abuse" />
                  <option value="F55.9 Unspecified non-dependence-producing substance abuse" />

                  <option value="F60.9 Personality disorder, unspecified" />
                  <option value="F64.9 Gender identity disorder, unspecified" />
                  <option value="F65.2 Exhibitionism" />
                  <option value="F68.8 Other specified disorders of adult personality and behaviour" />
                  <option value="F69 Unspecified disorder of adult personality and behaviour" />
                  <option value="F70.9 Mild mental retardation without mention of impairment of behavior" />
                  <option value="F71.9 Moderate mental retardation without mention of impairment of behavior" />
                  <option value="F72.9 Severe mental retardation without mention of impairment of behavior" />
                  <option value="F73.9 Profound mental retardation without mention of impairment of behavior" />
                  <option value="F79.9 Unspecified mental retardation without mention of impairment of behavior" />
                  <option value="F84.0 Childhood autism" />
                  <option value="F90.9 Hyperkinetic disorder, unspecified" />
                  <option value="F99 Mental disorder, not otherwise specified" />
                </datalist>
              </label>
              <fieldset className="md:col-span-2">
                <legend className={labelClass}>การเยี่ยมบ้าน</legend>
                <div className="mt-2 flex flex-wrap gap-3">
                  {[
                    ["อนุญาตเยี่ยมบ้าน", "อนุญาตเยี่ยมบ้าน"],
                    ["ไม่อนุญาตเยี่ยมบ้าน", "ไม่อนุญาตเยี่ยมบ้าน"],
                  ].map(([value, label]) => (
                    <label
                      key={value}
                      className="flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700"
                    >
                      <input
                        type="radio"
                        name="discharge-type"
                        value={value}
                        checked={dischargeType === value}
                        onChange={(event) =>
                          setDischargeType(event.target.value)
                        }
                      />
                      {label}
                    </label>
                  ))}
                </div>
              </fieldset>
            </div>
            <div className="mt-8 flex justify-end">
              <button
                type="button"
                onClick={() => void saveDischarge()}
                disabled={saving}
                className="rounded-xl bg-gradient-to-r from-rose-600 to-red-500 px-5 py-2.5 font-semibold text-white shadow-lg shadow-rose-500/20 transition hover:brightness-105 disabled:opacity-50"
              >
                {saving ? "กำลังบันทึก..." : "บันทึกการจำหน่าย"}
              </button>
            </div>
          </div>
        ) : null}
      </section>
    </div>
  );
}
