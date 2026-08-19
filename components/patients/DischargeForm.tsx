"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm, useWatch } from "react-hook-form";

import {
  saveDischargeAction,
  searchPatientForDischargeAction,
  type DischargePatient,
} from "@/app/actions/patients";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatDateBE, todayISOInThailand } from "@/lib/utils/date";
import {
  dischargeSchema,
  type DischargeFormValues,
} from "@/lib/validation/discharge";

const inputClass =
  "mt-2 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200";
const labelClass = "block text-sm font-medium text-slate-700";

export default function DischargeForm() {
  const [patient, setPatient] = useState<DischargePatient | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const {
    control,
    register,
    handleSubmit,
    getValues,
    reset,
    setError: setFieldError,
    formState: { errors },
  } = useForm<DischargeFormValues>({
    resolver: zodResolver(dischargeSchema),
    defaultValues: {
      hn: "",
      dischargeMethod: "",
      transferOther: "",
      dischargeDate: todayISOInThailand(),
      lastDiagnosis: "",
      dischargeType: "",
    },
  });
  const method = useWatch({ control, name: "dischargeMethod" });
  const dischargeDate = useWatch({ control, name: "dischargeDate" });

  async function searchPatient() {
    const searchHn = getValues("hn").trim();
    if (!searchHn) return setFieldError("hn", { message: "กรุณากรอกรหัส HN" });
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
    if (result.patient)
      reset({ ...getValues(), hn: result.patient.hn, lastDiagnosis: "" });
  }

  async function saveDischarge(values: DischargeFormValues) {
    if (!patient) return setError("กรุณาค้นหาและเลือกผู้ป่วยก่อนบันทึก");
    const data = new FormData();
    data.set("hn", patient.hn);
    data.set("dischargeMethod", values.dischargeMethod);
    data.set("transferOther", values.transferOther);
    data.set("dischargeDate", values.dischargeDate);
    data.set("lastDiagnosis", values.lastDiagnosis);
    data.set("dischargeType", values.dischargeType);
    setSaving(true);
    setError("");
    setMessage("");
    const result = await saveDischargeAction(data);
    setSaving(false);
    if (result.status === "error") return setError(result.message);
    setPatient(null);
    reset({
      hn: "",
      dischargeMethod: "",
      transferOther: "",
      dischargeDate: todayISOInThailand(),
      lastDiagnosis: "",
      dischargeType: "",
    });
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
          <Input
            {...register("hn", { onChange: () => setPatient(null) })}
            placeholder="กรอกรหัส HN"
            className={`${inputClass} mt-0`}
          />
          <Button type="submit" disabled={loading}>
            {loading ? "กำลังค้นหา..." : "ค้นหา"}
          </Button>
        </form>
        {errors.hn ? (
          <p className="mt-1 text-sm text-destructive">{errors.hn.message}</p>
        ) : null}

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
          <form
            onSubmit={handleSubmit(saveDischarge)}
            className="mt-8 rounded-2xl border border-slate-200 bg-slate-50 p-4"
            noValidate
          >
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
                <select {...register("dischargeMethod")} className={inputClass}>
                  <option value="">-- เลือกวิธีการจำหน่าย --</option>
                  <option value="แพทย์อนุญาต">แพทย์อนุญาต</option>
                  <option value="ปฏิเสธการรักษา">ปฏิเสธการรักษา</option>
                  <option value="refer back">refer back</option>
                  <option value="transfer">transfer</option>
                </select>
                {method === "transfer" ? (
                  <input
                    {...register("transferOther")}
                    className={inputClass}
                    placeholder="รายละเอียดการ transfer (ถ้ามี)"
                  />
                ) : null}
                <span className="text-sm text-destructive">
                  {errors.dischargeMethod?.message}
                </span>
              </label>
              <label className={labelClass}>
                จำหน่ายวันที่
                <Input
                  type="date"
                  {...register("dischargeDate")}
                  className={inputClass}
                />
                {dischargeDate ? (
                  <span className="mt-1 block text-xs text-slate-500">
                    พ.ศ. {formatDateBE(dischargeDate)}
                  </span>
                ) : null}
                <span className="text-sm text-destructive">
                  {errors.dischargeDate?.message}
                </span>
              </label>
              <label className={`${labelClass} md:col-span-2`}>
                Last diagnosis
                <Input
                  {...register("lastDiagnosis")}
                  className={inputClass}
                  list="diagnosis-list"
                  placeholder="ระบุ diagnosis สุดท้าย"
                />
                <datalist id="diagnosis-list">
                  <option value="F00.0 Dementia in Alzheimer's disease with early onset" />
                  <option value="F00.1 Dementia in Alzheimer's disease with late onset" />
                  <option value="F00.2 Dementia in Alzheimer's disease, atypical or mixed type" />
                  <option value="F00.9 Dementia in Alzheimer's disease, unspecified" />
                  <option value="F01.0 Vascular dementia of acute onset" />
                  <option value="F01.1 Multi-infarct dementia" />
                  <option value="F01.2 Subcortical vascular dementia" />
                  <option value="F01.3 Mixed cortical and subcortical vascular dementia" />
                  <option value="F01.8 Other vascular dementia" />
                  <option value="F01.9 Vascular dementia, unspecified" />
                  <option value="F02.0 Dementia in Pick's disease" />
                  <option value="F02.1 Dementia in Creutzfeldt-Jakob disease" />
                  <option value="F02.2 Dementia in Huntington's disease" />
                  <option value="F02.3 Dementia in Parkinson's disease" />
                  <option value="F02.4 Dementia in human immunodeficiency virus disease" />
                  <option value="F02.8 Dementia in other specified diseases classified elsewhere" />
                  <option value="F03 Unspecified dementia" />
                  <option value="F04 Organic amnesic syndrome" />
                  <option value="F05.0 Delirium not superimposed on dementia" />
                  <option value="F05.1 Delirium superimposed on dementia" />
                  <option value="F05.8 Other delirium" />
                  <option value="F05.9 Delirium, unspecified" />
                  <option value="F06.0 Organic hallucinosis" />
                  <option value="F06.1 Organic catatonic disorder" />
                  <option value="F06.2 Organic delusional disorder" />
                  <option value="F06.3 Organic mood disorder" />
                  <option value="F06.30 Organic mood disorder, unspecified" />
                  <option value="F06.31 Organic mood disorder with depressive features" />
                  <option value="F06.32 Organic mood disorder with major depressive-like episode" />
                  <option value="F06.33 Organic mood disorder with manic features" />
                  <option value="F06.34 Organic mood disorder with mixed features" />
                  <option value="F06.4 Organic anxiety disorder" />
                  <option value="F06.5 Organic dissociative disorder" />
                  <option value="F06.6 Organic emotionally labile disorder" />
                  <option value="F06.7 Mild cognitive disorder" />
                  <option value="F06.8 Other specified organic mental disorders" />
                  <option value="F06.9 Organic mental disorder, unspecified" />
                  <option value="F07.0 Organic personality disorder" />
                  <option value="F07.1 Postencephalitic syndrome" />
                  <option value="F07.2 Postconcussional syndrome" />
                  <option value="F07.8 Other organic personality and behavioural disorders" />
                  <option value="F07.9 Organic personality and behavioural disorder, unspecified" />
                  <option value="F09 Unspecified organic or symptomatic mental disorder" />
                  <option value="F10.0 Mental and behavioural disorders due to use of alcohol — Acute intoxication" />
                  <option value="F10.1 Mental and behavioural disorders due to use of alcohol — Harmful use" />
                  <option value="F10.2 Mental and behavioural disorders due to use of alcohol — Dependence syndrome" />
                  <option value="F10.3 Mental and behavioural disorders due to use of alcohol — Withdrawal state" />
                  <option value="F10.4 Mental and behavioural disorders due to use of alcohol — Withdrawal state with delirium" />
                  <option value="F10.5 Mental and behavioural disorders due to use of alcohol — Psychotic disorder" />
                  <option value="F10.6 Mental and behavioural disorders due to use of alcohol — Amnesic syndrome" />
                  <option value="F10.7 Mental and behavioural disorders due to use of alcohol — Residual and late-onset psychotic disorder" />
                  <option value="F10.8 Mental and behavioural disorders due to use of alcohol — Other mental and behavioural disorders" />
                  <option value="F10.9 Mental and behavioural disorders due to use of alcohol — Unspecified mental and behavioural disorder" />
                  <option value="F11.0 Mental and behavioural disorders due to use of opioids — Acute intoxication" />
                  <option value="F11.1 Mental and behavioural disorders due to use of opioids — Harmful use" />
                  <option value="F11.2 Mental and behavioural disorders due to use of opioids — Dependence syndrome" />
                  <option value="F11.3 Mental and behavioural disorders due to use of opioids — Withdrawal state" />
                  <option value="F11.4 Mental and behavioural disorders due to use of opioids — Withdrawal state with delirium" />
                  <option value="F11.5 Mental and behavioural disorders due to use of opioids — Psychotic disorder" />
                  <option value="F11.6 Mental and behavioural disorders due to use of opioids — Amnesic syndrome" />
                  <option value="F11.7 Mental and behavioural disorders due to use of opioids — Residual and late-onset psychotic disorder" />
                  <option value="F11.8 Mental and behavioural disorders due to use of opioids — Other mental and behavioural disorders" />
                  <option value="F11.9 Mental and behavioural disorders due to use of opioids — Unspecified mental and behavioural disorder" />
                  <option value="F12.0 Mental and behavioural disorders due to use of cannabinoids — Acute intoxication" />
                  <option value="F12.1 Mental and behavioural disorders due to use of cannabinoids — Harmful use" />
                  <option value="F12.2 Mental and behavioural disorders due to use of cannabinoids — Dependence syndrome" />
                  <option value="F12.3 Mental and behavioural disorders due to use of cannabinoids — Withdrawal state" />
                  <option value="F12.4 Mental and behavioural disorders due to use of cannabinoids — Withdrawal state with delirium" />
                  <option value="F12.5 Mental and behavioural disorders due to use of cannabinoids — Psychotic disorder" />
                  <option value="F12.6 Mental and behavioural disorders due to use of cannabinoids — Amnesic syndrome" />
                  <option value="F12.7 Mental and behavioural disorders due to use of cannabinoids — Residual and late-onset psychotic disorder" />
                  <option value="F12.8 Mental and behavioural disorders due to use of cannabinoids — Other mental and behavioural disorders" />
                  <option value="F12.9 Mental and behavioural disorders due to use of cannabinoids — Unspecified mental and behavioural disorder" />
                  <option value="F13.0 Mental and behavioural disorders due to use of sedatives or hypnotics — Acute intoxication" />
                  <option value="F13.1 Mental and behavioural disorders due to use of sedatives or hypnotics — Harmful use" />
                  <option value="F13.2 Mental and behavioural disorders due to use of sedatives or hypnotics — Dependence syndrome" />
                  <option value="F13.3 Mental and behavioural disorders due to use of sedatives or hypnotics — Withdrawal state" />
                  <option value="F13.4 Mental and behavioural disorders due to use of sedatives or hypnotics — Withdrawal state with delirium" />
                  <option value="F13.5 Mental and behavioural disorders due to use of sedatives or hypnotics — Psychotic disorder" />
                  <option value="F13.6 Mental and behavioural disorders due to use of sedatives or hypnotics — Amnesic syndrome" />
                  <option value="F13.7 Mental and behavioural disorders due to use of sedatives or hypnotics — Residual and late-onset psychotic disorder" />
                  <option value="F13.8 Mental and behavioural disorders due to use of sedatives or hypnotics — Other mental and behavioural disorders" />
                  <option value="F13.9 Mental and behavioural disorders due to use of sedatives or hypnotics — Unspecified mental and behavioural disorder" />
                  <option value="F14.0 Mental and behavioural disorders due to use of cocaine — Acute intoxication" />
                  <option value="F14.1 Mental and behavioural disorders due to use of cocaine — Harmful use" />
                  <option value="F14.2 Mental and behavioural disorders due to use of cocaine — Dependence syndrome" />
                  <option value="F14.3 Mental and behavioural disorders due to use of cocaine — Withdrawal state" />
                  <option value="F14.4 Mental and behavioural disorders due to use of cocaine — Withdrawal state with delirium" />
                  <option value="F14.5 Mental and behavioural disorders due to use of cocaine — Psychotic disorder" />
                  <option value="F14.6 Mental and behavioural disorders due to use of cocaine — Amnesic syndrome" />
                  <option value="F14.7 Mental and behavioural disorders due to use of cocaine — Residual and late-onset psychotic disorder" />
                  <option value="F14.8 Mental and behavioural disorders due to use of cocaine — Other mental and behavioural disorders" />
                  <option value="F14.9 Mental and behavioural disorders due to use of cocaine — Unspecified mental and behavioural disorder" />
                  <option value="F15.0 Mental and behavioural disorders due to use of other stimulants, including caffeine — Acute intoxication" />
                  <option value="F15.1 Mental and behavioural disorders due to use of other stimulants, including caffeine — Harmful use" />
                  <option value="F15.2 Mental and behavioural disorders due to use of other stimulants, including caffeine — Dependence syndrome" />
                  <option value="F15.3 Mental and behavioural disorders due to use of other stimulants, including caffeine — Withdrawal state" />
                  <option value="F15.4 Mental and behavioural disorders due to use of other stimulants, including caffeine — Withdrawal state with delirium" />
                  <option value="F15.5 Mental and behavioural disorders due to use of other stimulants, including caffeine — Psychotic disorder" />
                  <option value="F15.6 Mental and behavioural disorders due to use of other stimulants, including caffeine — Amnesic syndrome" />
                  <option value="F15.7 Mental and behavioural disorders due to use of other stimulants, including caffeine — Residual and late-onset psychotic disorder" />
                  <option value="F15.8 Mental and behavioural disorders due to use of other stimulants, including caffeine — Other mental and behavioural disorders" />
                  <option value="F15.9 Mental and behavioural disorders due to use of other stimulants, including caffeine — Unspecified mental and behavioural disorder" />
                  <option value="F16.0 Mental and behavioural disorders due to use of hallucinogens — Acute intoxication" />
                  <option value="F16.1 Mental and behavioural disorders due to use of hallucinogens — Harmful use" />
                  <option value="F16.2 Mental and behavioural disorders due to use of hallucinogens — Dependence syndrome" />
                  <option value="F16.3 Mental and behavioural disorders due to use of hallucinogens — Withdrawal state" />
                  <option value="F16.4 Mental and behavioural disorders due to use of hallucinogens — Withdrawal state with delirium" />
                  <option value="F16.5 Mental and behavioural disorders due to use of hallucinogens — Psychotic disorder" />
                  <option value="F16.6 Mental and behavioural disorders due to use of hallucinogens — Amnesic syndrome" />
                  <option value="F16.7 Mental and behavioural disorders due to use of hallucinogens — Residual and late-onset psychotic disorder" />
                  <option value="F16.8 Mental and behavioural disorders due to use of hallucinogens — Other mental and behavioural disorders" />
                  <option value="F16.9 Mental and behavioural disorders due to use of hallucinogens — Unspecified mental and behavioural disorder" />
                  <option value="F17.0 Mental and behavioural disorders due to use of tobacco — Acute intoxication" />
                  <option value="F17.1 Mental and behavioural disorders due to use of tobacco — Harmful use" />
                  <option value="F17.2 Mental and behavioural disorders due to use of tobacco — Dependence syndrome" />
                  <option value="F17.3 Mental and behavioural disorders due to use of tobacco — Withdrawal state" />
                  <option value="F17.4 Mental and behavioural disorders due to use of tobacco — Withdrawal state with delirium" />
                  <option value="F17.5 Mental and behavioural disorders due to use of tobacco — Psychotic disorder" />
                  <option value="F17.6 Mental and behavioural disorders due to use of tobacco — Amnesic syndrome" />
                  <option value="F17.7 Mental and behavioural disorders due to use of tobacco — Residual and late-onset psychotic disorder" />
                  <option value="F17.8 Mental and behavioural disorders due to use of tobacco — Other mental and behavioural disorders" />
                  <option value="F17.9 Mental and behavioural disorders due to use of tobacco — Unspecified mental and behavioural disorder" />
                  <option value="F18.0 Mental and behavioural disorders due to use of volatile solvents — Acute intoxication" />
                  <option value="F18.1 Mental and behavioural disorders due to use of volatile solvents — Harmful use" />
                  <option value="F18.2 Mental and behavioural disorders due to use of volatile solvents — Dependence syndrome" />
                  <option value="F18.3 Mental and behavioural disorders due to use of volatile solvents — Withdrawal state" />
                  <option value="F18.4 Mental and behavioural disorders due to use of volatile solvents — Withdrawal state with delirium" />
                  <option value="F18.5 Mental and behavioural disorders due to use of volatile solvents — Psychotic disorder" />
                  <option value="F18.6 Mental and behavioural disorders due to use of volatile solvents — Amnesic syndrome" />
                  <option value="F18.7 Mental and behavioural disorders due to use of volatile solvents — Residual and late-onset psychotic disorder" />
                  <option value="F18.8 Mental and behavioural disorders due to use of volatile solvents — Other mental and behavioural disorders" />
                  <option value="F18.9 Mental and behavioural disorders due to use of volatile solvents — Unspecified mental and behavioural disorder" />
                  <option value="F19.0 Mental and behavioural disorders due to multiple drug use and use of other psychoactive substances — Acute intoxication" />
                  <option value="F19.1 Mental and behavioural disorders due to multiple drug use and use of other psychoactive substances — Harmful use" />
                  <option value="F19.2 Mental and behavioural disorders due to multiple drug use and use of other psychoactive substances — Dependence syndrome" />
                  <option value="F19.3 Mental and behavioural disorders due to multiple drug use and use of other psychoactive substances — Withdrawal state" />
                  <option value="F19.4 Mental and behavioural disorders due to multiple drug use and use of other psychoactive substances — Withdrawal state with delirium" />
                  <option value="F19.5 Mental and behavioural disorders due to multiple drug use and use of other psychoactive substances — Psychotic disorder" />
                  <option value="F19.6 Mental and behavioural disorders due to multiple drug use and use of other psychoactive substances — Amnesic syndrome" />
                  <option value="F19.7 Mental and behavioural disorders due to multiple drug use and use of other psychoactive substances — Residual and late-onset psychotic disorder" />
                  <option value="F19.8 Mental and behavioural disorders due to multiple drug use and use of other psychoactive substances — Other mental and behavioural disorders" />
                  <option value="F19.9 Mental and behavioural disorders due to multiple drug use and use of other psychoactive substances — Unspecified mental and behavioural disorder" />
                  <option value="F20.0 Paranoid schizophrenia" />
                  <option value="F20.1 Hebephrenic schizophrenia" />
                  <option value="F20.2 Catatonic schizophrenia" />
                  <option value="F20.3 Undifferentiated schizophrenia" />
                  <option value="F20.4 Post-schizophrenic depression" />
                  <option value="F20.5 Residual schizophrenia" />
                  <option value="F20.6 Simple schizophrenia" />
                  <option value="F20.8 Other schizophrenia" />
                  <option value="F20.9 Schizophrenia, unspecified" />
                  <option value="F21 Schizotypal disorder" />
                  <option value="F22.0 Delusional disorder" />
                  <option value="F22.8 Other persistent delusional disorders" />
                  <option value="F22.9 Persistent delusional disorder, unspecified" />
                  <option value="F23.0 Acute polymorphic psychotic disorder without symptoms of schizophrenia" />
                  <option value="F23.1 Acute polymorphic psychotic disorder with symptoms of schizophrenia" />
                  <option value="F23.2 Acute schizophrenia-like psychotic disorder" />
                  <option value="F23.3 Other acute predominantly delusional psychotic disorders" />
                  <option value="F23.8 Other acute and transient psychotic disorders" />
                  <option value="F23.9 Acute and transient psychotic disorder, unspecified" />
                  <option value="F24 Induced delusional disorder" />
                  <option value="F25.0 Schizoaffective disorder, manic type" />
                  <option value="F25.1 Schizoaffective disorder, depressive type" />
                  <option value="F25.2 Schizoaffective disorder, mixed type" />
                  <option value="F25.8 Other schizoaffective disorders" />
                  <option value="F25.9 Schizoaffective disorder, unspecified" />
                  <option value="F28 Other nonorganic psychotic disorders" />
                  <option value="F29 Unspecified nonorganic psychosis" />
                  <option value="F30.0 Hypomania" />
                  <option value="F30.1 Mania without psychotic symptoms" />
                  <option value="F30.2 Mania with psychotic symptoms" />
                  <option value="F30.8 Other manic episodes" />
                  <option value="F30.9 Manic episode, unspecified" />
                  <option value="F31.0 Bipolar affective disorder, current episode hypomanic" />
                  <option value="F31.1 Bipolar affective disorder, current episode manic without psychotic symptoms" />
                  <option value="F31.2 Bipolar affective disorder, current episode manic with psychotic symptoms" />
                  <option value="F31.3 Bipolar affective disorder, current episode mild or moderate depression" />
                  <option value="F31.30 Bipolar affective disorder, current episode mild or moderate depression, unspecified" />
                  <option value="F31.4 Bipolar affective disorder, current episode severe depression without psychotic symptoms" />
                  <option value="F31.5 Bipolar affective disorder, current episode severe depression with psychotic symptoms" />
                  <option value="F31.6 Bipolar affective disorder, current episode mixed" />
                  <option value="F31.7 Bipolar affective disorder, currently in remission" />
                  <option value="F31.8 Other bipolar affective disorders" />
                  <option value="F31.9 Bipolar affective disorder, unspecified" />
                  <option value="F32.0 Mild depressive episode" />
                  <option value="F32.1 Moderate depressive episode" />
                  <option value="F32.2 Severe depressive episode without psychotic symptoms" />
                  <option value="F32.3 Severe depressive episode with psychotic symptoms" />
                  <option value="F32.8 Other depressive episodes" />
                  <option value="F32.9 Depressive episode, unspecified" />
                  <option value="F33.0 Recurrent depressive disorder, current episode mild" />
                  <option value="F33.1 Recurrent depressive disorder, current episode moderate" />
                  <option value="F33.2 Recurrent depressive disorder, current episode severe without psychotic symptoms" />
                  <option value="F33.3 Recurrent depressive disorder, current episode severe with psychotic symptoms" />
                  <option value="F33.4 Recurrent depressive disorder, currently in remission" />
                  <option value="F33.8 Other recurrent depressive disorders" />
                  <option value="F33.9 Recurrent depressive disorder, unspecified" />
                  <option value="F34.0 Cyclothymia" />
                  <option value="F34.1 Dysthymia" />
                  <option value="F34.8 Other persistent mood disorders" />
                  <option value="F34.9 Persistent mood disorder, unspecified" />
                  <option value="F38.0 Other single mood [affective] disorders" />
                  <option value="F38.1 Other recurrent mood [affective] disorders" />
                  <option value="F38.8 Other specified mood [affective] disorders" />
                  <option value="F39 Unspecified mood [affective] disorder" />
                  <option value="F40.0 Agoraphobia" />
                  <option value="F40.00 Agoraphobia without panic disorder" />
                  <option value="F40.01 Agoraphobia with panic disorder" />
                  <option value="F40.1 Social phobias" />
                  <option value="F40.2 Specific (isolated) phobias" />
                  <option value="F40.8 Other phobic anxiety disorders" />
                  <option value="F40.9 Phobic anxiety disorder, unspecified" />
                  <option value="F41.0 Panic disorder [episodic paroxysmal anxiety]" />
                  <option value="F41.1 Generalized anxiety disorder" />
                  <option value="F41.2 Mixed anxiety and depressive disorder" />
                  <option value="F41.3 Other mixed anxiety disorders" />
                  <option value="F41.8 Other specified anxiety disorders" />
                  <option value="F41.9 Anxiety disorder, unspecified" />
                  <option value="F42.0 Predominantly obsessional thoughts or ruminations" />
                  <option value="F42.1 Predominantly compulsive acts [obsessional rituals]" />
                  <option value="F42.2 Mixed obsessional thoughts and acts" />
                  <option value="F42.8 Other obsessive-compulsive disorders" />
                  <option value="F42.9 Obsessive-compulsive disorder, unspecified" />
                  <option value="F43.0 Acute stress reaction" />
                  <option value="F43.1 Post-traumatic stress disorder" />
                  <option value="F43.2 Adjustment disorders" />
                  <option value="F43.20 Adjustment disorder, unspecified" />
                  <option value="F43.21 Adjustment disorder with depressed mood" />
                  <option value="F43.22 Adjustment disorder with anxiety" />
                  <option value="F43.23 Adjustment disorder with mixed anxiety and depressed mood" />
                  <option value="F43.24 Adjustment disorder with disturbance of conduct" />
                  <option value="F43.25 Adjustment disorder with mixed disturbance of emotions and conduct" />
                  <option value="F43.28 Adjustment disorder with other symptoms" />
                  <option value="F43.8 Other reactions to severe stress" />
                  <option value="F43.9 Reaction to severe stress, unspecified" />
                  <option value="F44.0 Dissociative amnesia" />
                  <option value="F44.1 Dissociative fugue" />
                  <option value="F44.2 Dissociative stupor" />
                  <option value="F44.4 Dissociative motor disorders" />
                  <option value="F44.5 Dissociative convulsions" />
                  <option value="F44.6 Dissociative anaesthesia and sensory loss" />
                  <option value="F44.7 Dissociative and conversion disorder, unspecified" />
                  <option value="F44.8 Other dissociative and conversion disorders" />
                  <option value="F44.9 Dissociative and conversion disorder, unspecified" />
                  <option value="F45.0 Somatization disorder" />
                  <option value="F45.1 Undifferentiated somatoform disorder" />
                  <option value="F45.2 Hypochondriacal disorder" />
                  <option value="F45.3 Somatoform autonomic dysfunction" />
                  <option value="F45.4 Persistent somatoform pain disorder" />
                  <option value="F45.8 Other somatoform disorders" />
                  <option value="F45.9 Somatoform disorder, unspecified" />
                  <option value="F48.0 Neurasthenia" />
                  <option value="F48.1 Depersonalization-derealization syndrome" />
                  <option value="F48.8 Other specified neurotic disorders" />
                  <option value="F48.9 Neurotic disorder, unspecified" />
                  <option value="F50.0 Anorexia nervosa" />
                  <option value="F50.1 Atypical anorexia nervosa" />
                  <option value="F50.2 Bulimia nervosa" />
                  <option value="F50.3 Atypical bulimia nervosa" />
                  <option value="F50.4 Overeating associated with other psychological disturbances" />
                  <option value="F50.5 Vomiting associated with other psychological disturbances" />
                  <option value="F50.8 Other eating disorders" />
                  <option value="F50.9 Eating disorder, unspecified" />
                  <option value="F51.0 Nonorganic insomnia" />
                  <option value="F51.1 Nonorganic hypersomnia" />
                  <option value="F51.2 Nonorganic disorder of the sleep-wake schedule" />
                  <option value="F51.3 Sleepwalking [somnambulism]" />
                  <option value="F51.4 Sleep terrors [night terrors]" />
                  <option value="F51.5 Nightmare disorder" />
                  <option value="F51.8 Other nonorganic sleep disorders" />
                  <option value="F51.9 Nonorganic sleep disorder, unspecified" />
                  <option value="F52.0 Lack or loss of sexual desire" />
                  <option value="F52.1 Sexual aversion and lack of sexual enjoyment" />
                  <option value="F52.2 Failure of genital response" />
                  <option value="F52.3 Orgasmic dysfunction" />
                  <option value="F52.4 Premature ejaculation" />
                  <option value="F52.5 Nonorganic vaginismus" />
                  <option value="F52.6 Nonorganic dyspareunia" />
                  <option value="F52.7 Excessive sexual drive" />
                  <option value="F52.8 Other sexual dysfunction, not caused by organic disorder" />
                  <option value="F52.9 Sexual dysfunction, unspecified" />
                  <option value="F53.0 Mental and behavioural disorders associated with the puerperium, not elsewhere classified" />
                  <option value="F54 Psychological and behavioural factors associated with disorders or diseases classified elsewhere" />
                  <option value="F55.0 Abuse of antidepressants" />
                  <option value="F55.1 Abuse of laxatives" />
                  <option value="F55.2 Abuse of analgesics" />
                  <option value="F55.3 Abuse of antacids" />
                  <option value="F55.4 Abuse of vitamins" />
                  <option value="F55.5 Abuse of steroids or hormones" />
                  <option value="F55.6 Abuse of herbal or folk remedies" />
                  <option value="F55.8 Abuse of other substances that do not produce dependence" />
                  <option value="F55.9 Abuse of unspecified substance that does not produce dependence" />
                  <option value="F59 Unspecified behavioural syndrome associated with physiological disturbances and physical factors" />
                  <option value="F60.0 Paranoid personality disorder" />
                  <option value="F60.1 Schizoid personality disorder" />
                  <option value="F60.2 Dissocial personality disorder" />
                  <option value="F60.3 Emotionally unstable personality disorder" />
                  <option value="F60.30 Emotionally unstable personality disorder, unspecified" />
                  <option value="F60.31 Borderline type" />
                  <option value="F60.4 Histrionic personality disorder" />
                  <option value="F60.5 Anankastic personality disorder" />
                  <option value="F60.6 Anxious [avoidant] personality disorder" />
                  <option value="F60.7 Dependent personality disorder" />
                  <option value="F60.8 Other specific personality disorders" />
                  <option value="F60.9 Personality disorder, unspecified" />
                  <option value="F61.0 Mixed personality disorders" />
                  <option value="F61.1 Other mixed personality disorders" />
                  <option value="F62.0 Enduring personality change after catastrophic experience" />
                  <option value="F62.1 Enduring personality change after psychiatric illness" />
                  <option value="F62.8 Other enduring personality changes" />
                  <option value="F62.9 Enduring personality change, unspecified" />
                  <option value="F63.0 Pathological gambling" />
                  <option value="F63.1 Pathological fire-setting [pyromania]" />
                  <option value="F63.2 Pathological stealing [kleptomania]" />
                  <option value="F63.3 Trichotillomania" />
                  <option value="F63.8 Other habit and impulse disorders" />
                  <option value="F63.9 Habit and impulse disorder, unspecified" />
                  <option value="F64.0 Transsexualism" />
                  <option value="F64.1 Dual-role transvestism" />
                  <option value="F64.2 Gender identity disorder of childhood" />
                  <option value="F64.8 Other gender identity disorders" />
                  <option value="F64.9 Gender identity disorder, unspecified" />
                  <option value="F65.0 Fetishism" />
                  <option value="F65.1 Fetishistic transvestism" />
                  <option value="F65.2 Exhibitionism" />
                  <option value="F65.3 Voyeurism" />
                  <option value="F65.4 Paedophilia" />
                  <option value="F65.5 Sadomasochism" />
                  <option value="F65.6 Multiple disorders of sexual preference" />
                  <option value="F65.8 Other disorders of sexual preference" />
                  <option value="F65.9 Disorder of sexual preference, unspecified" />
                  <option value="F66.0 Sexual maturation disorder" />
                  <option value="F66.1 Ego-dystonic sexual orientation" />
                  <option value="F66.2 Sexual relationship disorder" />
                  <option value="F66.8 Other psychosexual development disorders" />
                  <option value="F66.9 Psychosexual development disorder, unspecified" />
                  <option value="F68.0 Elaboration of physical symptoms for psychological reasons" />
                  <option value="F68.1 Intentional production or feigning of symptoms or disabilities, either physical or psychological [factitious disorder]" />
                  <option value="F68.8 Other specified disorders of adult personality and behaviour" />
                  <option value="F69 Unspecified disorder of adult personality and behaviour" />
                  <option value="F70 Mild intellectual disability" />
                  <option value="F71 Moderate intellectual disability" />
                  <option value="F72 Severe intellectual disability" />
                  <option value="F73 Profound intellectual disability" />
                  <option value="F78 Other intellectual disabilities" />
                  <option value="F79 Unspecified intellectual disability" />
                  <option value="F80.0 Specific speech articulation disorder" />
                  <option value="F80.1 Expressive language disorder" />
                  <option value="F80.2 Receptive language disorder" />
                  <option value="F80.3 Acquired aphasia with epilepsy [Landau-Kleffner]" />
                  <option value="F80.8 Other developmental disorders of speech and language" />
                  <option value="F80.9 Developmental disorder of speech and language, unspecified" />
                  <option value="F81.0 Specific reading disorder" />
                  <option value="F81.1 Specific spelling disorder" />
                  <option value="F81.2 Specific disorder of arithmetical skills" />
                  <option value="F81.3 Mixed disorder of scholastic skills" />
                  <option value="F81.8 Other developmental disorders of scholastic skills" />
                  <option value="F81.9 Developmental disorder of scholastic skills, unspecified" />
                  <option value="F82 Specific developmental disorder of motor function" />
                  <option value="F83 Mixed specific developmental disorders" />
                  <option value="F84.0 Childhood autism" />
                  <option value="F84.1 Atypical autism" />
                  <option value="F84.2 Rett's syndrome" />
                  <option value="F84.3 Other childhood disintegrative disorder" />
                  <option value="F84.4 Overactive disorder associated with mental retardation and stereotyped movements" />
                  <option value="F84.5 Asperger's syndrome" />
                  <option value="F84.8 Other pervasive developmental disorders" />
                  <option value="F84.9 Pervasive developmental disorder, unspecified" />
                  <option value="F88 Other disorders of psychological development" />
                  <option value="F89 Disorder of psychological development, unspecified" />
                  <option value="F90.0 Disturbance of activity and attention" />
                  <option value="F90.1 Hyperkinetic conduct disorder" />
                  <option value="F90.8 Other hyperkinetic disorders" />
                  <option value="F90.9 Hyperkinetic disorder, unspecified" />
                  <option value="F91.0 Conduct disorder confined to the family context" />
                  <option value="F91.1 Unsocialized conduct disorder" />
                  <option value="F91.2 Socialized conduct disorder" />
                  <option value="F91.3 Oppositional defiant disorder" />
                  <option value="F91.8 Other conduct disorders" />
                  <option value="F91.9 Conduct disorder, unspecified" />
                  <option value="F92.0 Depressive conduct disorder" />
                  <option value="F92.8 Other mixed disorders of conduct and emotions" />
                  <option value="F92.9 Mixed disorder of conduct and emotions, unspecified" />
                  <option value="F93.0 Separation anxiety disorder of childhood" />
                  <option value="F93.1 Phobic anxiety disorder of childhood" />
                  <option value="F93.2 Social anxiety disorder of childhood" />
                  <option value="F93.3 Sibling rivalry disorder" />
                  <option value="F93.8 Other childhood emotional disorders" />
                  <option value="F93.9 Childhood emotional disorder, unspecified" />
                  <option value="F94.0 Elective mutism" />
                  <option value="F94.1 Reactive attachment disorder of childhood" />
                  <option value="F94.2 Disinhibited attachment disorder of childhood" />
                  <option value="F94.8 Other childhood disorders of social functioning" />
                  <option value="F94.9 Childhood disorder of social functioning, unspecified" />
                  <option value="F95.0 Transient tic disorder" />
                  <option value="F95.1 Chronic motor or vocal tic disorder" />
                  <option value="F95.2 Combined vocal and multiple motor tic disorder [de la Tourette]" />
                  <option value="F95.8 Other tic disorders" />
                  <option value="F95.9 Tic disorder, unspecified" />
                  <option value="F98.0 Nonorganic enuresis" />
                  <option value="F98.1 Nonorganic encopresis" />
                  <option value="F98.2 Feeding disorder of infancy and childhood" />
                  <option value="F98.3 Pica of infancy and childhood" />
                  <option value="F98.4 Stereotyped movement disorders" />
                  <option value="F98.5 Stuttering [stammering]" />
                  <option value="F98.6 Cluttering" />
                  <option value="F98.8 Other specified behavioural and emotional disorders with onset usually occurring in childhood and adolescence" />
                  <option value="F98.9 Unspecified behavioural and emotional disorder with onset usually occurring in childhood and adolescence" />
                  <option value="F99 Mental disorder, not otherwise specified" />
                </datalist>
                <span className="text-sm text-destructive">
                  {errors.lastDiagnosis?.message}
                </span>
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
                        value={value}
                        {...register("dischargeType")}
                      />
                      {label}
                    </label>
                  ))}
                </div>
                <span className="text-sm text-destructive">
                  {errors.dischargeType?.message}
                </span>
              </fieldset>
            </div>
            <div className="mt-8 flex justify-end">
              <Button
                type="submit"
                disabled={saving}
                className="bg-rose-600 hover:bg-rose-700"
              >
                {saving ? "กำลังบันทึก..." : "บันทึกการจำหน่าย"}
              </Button>
            </div>
          </form>
        ) : null}
      </section>
    </div>
  );
}
