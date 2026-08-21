"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm, useWatch, type FieldPath } from "react-hook-form";

import { saveEditedPatientAction, searchPatientForEditAction } from "@/app/actions/patients";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  ADMISSION_SOURCE_OPTIONS,
  ADMITTING_DOCTOR_OPTIONS,
  CAREGIVER_RELATION_OPTIONS,
  CAREGIVER_STATUS_OPTIONS,
  CITY_SUBDISTRICTS,
  DIAGNOSIS_OPTIONS,
  NON_SMIV_VALUE,
  OAS_OPTIONS,
  OTHER_DISTRICTS,
  RESIDENCE_DISTRICT_OPTIONS,
  RESIDENCE_TYPE_OPTIONS,
  SMI_V_OPTIONS,
  SUBSTANCE_TYPE_OPTIONS,
  SUBSTANCE_USE_OPTIONS,
  YES_NO_OPTIONS,
} from "@/lib/constants/admission";
import {
  editPatientDefaultValues,
  editPatientSchema,
  type EditPatientFormValues,
} from "@/lib/validation/edit-patient";
import { formatDateBE } from "@/lib/utils/date";

const selectClass =
  "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-xs outline-none focus-visible:ring-2 focus-visible:ring-ring";

function Field({
  id,
  label,
  error,
  children,
  wide = false,
}: {
  id: string;
  label: string;
  error?: string;
  children: React.ReactNode;
  wide?: boolean;
}) {
  return (
    <div className={wide ? "md:col-span-2" : undefined}>
      <Label htmlFor={id}>{label}</Label>
      <div className="mt-2">{children}</div>
      {error ? <p className="mt-1 text-xs text-destructive">{error}</p> : null}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <fieldset className="rounded-2xl border border-border bg-muted/20 p-4 md:p-5">
      <legend className="px-2 text-lg font-semibold text-foreground">{title}</legend>
      {children}
    </fieldset>
  );
}

export default function EditPatientForm() {
  const [searchHn, setSearchHn] = useState("");
  const [loaded, setLoaded] = useState(false);
  const [assessmentId, setAssessmentId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const {
    register,
    control,
    handleSubmit,
    reset,
    setValue,
    formState: { errors },
  } = useForm<EditPatientFormValues>({
    resolver: zodResolver(editPatientSchema),
    defaultValues: editPatientDefaultValues,
  });

  const [
    smiV,
    oasScore,
    substanceUse,
    admit3times,
    residenceType,
    residenceDistrict,
    caregiverStatus,
    caregiverRelation,
    diagnosis,
    admissionSource,
    admissionDate,
  ] = useWatch({
    control,
    name: [
      "smiV",
      "oasScore",
      "substanceUse",
      "admit3times",
      "residenceType",
      "residenceDistrict",
      "caregiverStatus",
      "caregiverRelation",
      "diagnosis",
      "admissionSource",
      "admissionDate",
    ],
  });
  const isSmiv = Boolean(smiV && smiV !== NON_SMIV_VALUE);

  const fieldError = (name: FieldPath<EditPatientFormValues>) => {
    const issue = errors[name];
    return issue?.message ? String(issue.message) : undefined;
  };

  async function searchPatient() {
    if (!searchHn.trim()) return setError("กรุณากรอก HN");
    const data = new FormData();
    data.set("hn", searchHn);
    setLoading(true);
    setError("");
    setMessage("");
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
    for (const [key, value] of Object.entries(values)) data.set(key, value);
    if (assessmentId) data.set("assessmentId", assessmentId);
    setSaving(true);
    setError("");
    setMessage("");
    const result = await saveEditedPatientAction(data);
    setSaving(false);
    if (result.status === "error") return setError(result.message);
    setMessage(result.message);
    setLoaded(false);
    setAssessmentId(null);
    setSearchHn("");
    reset(editPatientDefaultValues);
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 md:px-6">
      <Card className="rounded-3xl">
        <CardHeader>
          <p className="text-sm font-medium uppercase tracking-[0.2em] text-indigo-600">Edit Patient</p>
          <h1 className="text-2xl font-semibold leading-none tracking-tight md:text-3xl">แก้ไขข้อมูลผู้ป่วย</h1>
          <p className="text-sm text-muted-foreground">ค้นหาด้วย HN แล้วแก้ไขข้อมูลด้วยตัวเลือกมาตรฐานเดียวกับการรับผู้ป่วยใหม่</p>
        </CardHeader>
        <CardContent>
          <form className="flex flex-col gap-3 md:flex-row" onSubmit={(event) => { event.preventDefault(); void searchPatient(); }}>
            <Label htmlFor="edit-patient-hn-search" className="sr-only">ค้นหาผู้ป่วยด้วย HN</Label>
            <Input
              id="edit-patient-hn-search"
              value={searchHn}
              onChange={(event) => {
                setSearchHn(event.target.value);
                setLoaded(false);
              }}
              placeholder="กรอกรหัส HN"
            />
            <Button type="submit" disabled={loading}>{loading ? "กำลังค้นหา..." : "ค้นหา"}</Button>
          </form>

          {error ? <Alert className="mt-4 border-destructive/40 bg-destructive/10 text-destructive"><AlertDescription>{error}</AlertDescription></Alert> : null}
          {message ? <Alert className="mt-4 border-emerald-200 bg-emerald-50 text-emerald-700"><AlertDescription>{message}</AlertDescription></Alert> : null}

          {loaded ? (
            <form onSubmit={handleSubmit(savePatient)} className="mt-8 space-y-6" noValidate>
              <Section title="ข้อมูลพื้นฐาน">
                <div className="grid gap-4 md:grid-cols-2">
                  <Field id="hn" label="HN" error={fieldError("hn")}>
                    <Input id="hn" readOnly className="bg-muted" {...register("hn")} />
                  </Field>
                  <Field id="gender" label="เพศ" error={fieldError("gender")}>
                    <select id="gender" {...register("gender")} className={selectClass}>
                      <option value="">-- เลือกเพศ --</option>
                      <option value="หญิง">เพศหญิง</option>
                      <option value="ชาย">เพศชาย</option>
                    </select>
                  </Field>
                  <Field id="firstName" label="ชื่อ" error={fieldError("firstName")}>
                    <Input id="firstName" {...register("firstName")} />
                  </Field>
                  <Field id="lastName" label="นามสกุล" error={fieldError("lastName")}>
                    <Input id="lastName" {...register("lastName")} />
                  </Field>
                  <Field id="age" label="อายุ (ปี)" error={fieldError("age")}>
                    <Input id="age" type="number" min={0} max={150} {...register("age")} />
                  </Field>
                </div>
              </Section>

              <Section title="ผลประเมิน SMI-V และ OAS">
                <div className="space-y-3">
                  {SMI_V_OPTIONS.map((option) => (
                    <Label key={option.value} className={`block cursor-pointer rounded-xl border p-4 leading-relaxed transition ${smiV === option.value ? "border-primary bg-indigo-50" : "bg-background hover:border-indigo-300"}`}>
                      <span className="flex items-start gap-3">
                        <input
                          type="radio"
                          value={option.value}
                          {...register("smiV", {
                            onChange: (event) => {
                              if (event.target.value !== NON_SMIV_VALUE) return;
                              for (const name of ["oasScore", "aggressiveBehavior", "substanceUse", "substanceType", "readmit28", "admit3times", "admitNumber"] as const) {
                                setValue(name, "");
                              }
                            },
                          })}
                          className="mt-1 accent-indigo-600"
                        />
                        <span><strong>{option.value}</strong> — {option.title}</span>
                      </span>
                    </Label>
                  ))}
                  {fieldError("smiV") ? <p className="text-xs text-destructive">{fieldError("smiV")}</p> : null}
                </div>

                {isSmiv ? (
                  <div className="mt-5 grid gap-3 md:grid-cols-3">
                    {OAS_OPTIONS.map((option) => (
                      <Label key={option.value} className={`cursor-pointer rounded-xl border p-4 ${oasScore === option.value ? "border-primary bg-indigo-50" : "bg-background"}`}>
                        <span className="flex items-start gap-2">
                          <input type="radio" value={option.value} {...register("oasScore")} className="mt-1 accent-indigo-600" />
                          <span><strong>OAS {option.value}</strong><span className="block text-sm font-normal text-muted-foreground">{option.title}</span></span>
                        </span>
                      </Label>
                    ))}
                    {fieldError("oasScore") ? <p className="text-xs text-destructive md:col-span-3">{fieldError("oasScore")}</p> : null}
                  </div>
                ) : null}
              </Section>

              {isSmiv ? (
                <Section title="ข้อมูลเพิ่มเติม">
                  <div className="grid gap-4 md:grid-cols-2">
                    <Field id="aggressiveBehavior" label="พฤติกรรมรุนแรงที่นำส่ง" error={fieldError("aggressiveBehavior")} wide>
                      <Textarea id="aggressiveBehavior" {...register("aggressiveBehavior")} />
                    </Field>
                    <Field id="substanceUse" label="สุราและสารเสพติด" error={fieldError("substanceUse")}>
                      <select id="substanceUse" {...register("substanceUse", { onChange: (event) => { if (event.target.value !== "ใช้") setValue("substanceType", ""); } })} className={selectClass}>
                        <option value="">-- เลือก --</option>
                        {SUBSTANCE_USE_OPTIONS.map((item) => <option key={item}>{item}</option>)}
                      </select>
                    </Field>
                    {substanceUse === "ใช้" ? (
                      <Field id="substanceType" label="ประเภทสารเสพติด/สุรา" error={fieldError("substanceType")}>
                        <select id="substanceType" {...register("substanceType")} className={selectClass}>
                          <option value="">-- เลือกประเภท --</option>
                          {SUBSTANCE_TYPE_OPTIONS.map((item) => <option key={item}>{item}</option>)}
                        </select>
                      </Field>
                    ) : null}
                    <Field id="readmit28" label="ผู้ป่วย readmit ใน 28 วัน" error={fieldError("readmit28")}>
                      <select id="readmit28" {...register("readmit28")} className={selectClass}>
                        <option value="">-- เลือก --</option>
                        {YES_NO_OPTIONS.map((item) => <option key={item}>{item}</option>)}
                      </select>
                    </Field>
                    <Field id="admit3times" label="Admit ≥ 3 ครั้งใน 1 ปี" error={fieldError("admit3times")}>
                      <select id="admit3times" {...register("admit3times", { onChange: (event) => { if (event.target.value !== "ใช่") setValue("admitNumber", ""); } })} className={selectClass}>
                        <option value="">-- เลือก --</option>
                        {YES_NO_OPTIONS.map((item) => <option key={item}>{item}</option>)}
                      </select>
                    </Field>
                    {admit3times === "ใช่" ? (
                      <Field id="admitNumber" label="ครั้งนี้ Admit เป็นครั้งที่" error={fieldError("admitNumber")}>
                        <Input id="admitNumber" type="number" min={1} {...register("admitNumber")} />
                      </Field>
                    ) : null}
                  </div>
                </Section>
              ) : null}

              <Section title="ข้อมูลที่อยู่ ผู้ดูแล และการรับไว้รักษา">
                <div className="grid gap-4 md:grid-cols-2">
                  <Field id="residenceType" label="1. สถานภาพที่อยู่" error={fieldError("residenceType")} wide>
                    <select id="residenceType" {...register("residenceType", { onChange: (event) => { if (event.target.value === "มีที่อยู่เป็นหลักแหล่ง") return; for (const name of ["residenceDistrict", "residenceSubdistrict", "residenceOtherDistrict", "residenceDetails"] as const) setValue(name, ""); } })} className={selectClass}>
                      <option value="">-- เลือกสถานภาพที่อยู่ --</option>
                      {RESIDENCE_TYPE_OPTIONS.map((item) => <option key={item}>{item}</option>)}
                    </select>
                  </Field>
                  {residenceType === "มีที่อยู่เป็นหลักแหล่ง" ? (
                    <>
                      <Field id="residenceDistrict" label="2. เขตที่อยู่" error={fieldError("residenceDistrict")}>
                        <select id="residenceDistrict" {...register("residenceDistrict", { onChange: () => { setValue("residenceSubdistrict", ""); setValue("residenceOtherDistrict", ""); } })} className={selectClass}>
                          <option value="">-- เลือกเขต --</option>
                          {RESIDENCE_DISTRICT_OPTIONS.map((item) => <option key={item}>{item}</option>)}
                        </select>
                      </Field>
                      {residenceDistrict === "ในเขตอำเภอเมืองชลบุรี" ? (
                        <Field id="residenceSubdistrict" label="3. ตำบล" error={fieldError("residenceSubdistrict")}>
                          <select id="residenceSubdistrict" {...register("residenceSubdistrict")} className={selectClass}>
                            <option value="">-- เลือกตำบล --</option>
                            {CITY_SUBDISTRICTS.map((item) => <option key={item}>{item}</option>)}
                          </select>
                        </Field>
                      ) : null}
                      {residenceDistrict === "นอกเขตอำเภอเมืองชลบุรี" ? (
                        <Field id="residenceOtherDistrict" label="3. อำเภอ" error={fieldError("residenceOtherDistrict")}>
                          <select id="residenceOtherDistrict" {...register("residenceOtherDistrict")} className={selectClass}>
                            <option value="">-- เลือกอำเภอ --</option>
                            {OTHER_DISTRICTS.map((item) => <option key={item}>{item}</option>)}
                          </select>
                        </Field>
                      ) : null}
                      <Field id="residenceDetails" label="รายละเอียดที่อยู่" error={fieldError("residenceDetails")} wide>
                        <Textarea id="residenceDetails" {...register("residenceDetails")} />
                      </Field>
                    </>
                  ) : null}

                  <Field id="caregiverStatus" label="4. สถานภาพผู้ดูแล" error={fieldError("caregiverStatus")} wide>
                    <select id="caregiverStatus" {...register("caregiverStatus", { onChange: (event) => { if (event.target.value === "อยู่คนเดียว") { for (const name of ["caregiverName", "caregiverRelation", "caregiverRelationOther", "caregiverPhone"] as const) setValue(name, ""); } else { setValue("patientPhone", ""); } } })} className={selectClass}>
                      <option value="">-- เลือกสถานภาพผู้ดูแล --</option>
                      {CAREGIVER_STATUS_OPTIONS.map((item) => <option key={item}>{item}</option>)}
                    </select>
                  </Field>
                  {caregiverStatus && caregiverStatus !== "อยู่คนเดียว" ? (
                    <>
                      <Field id="caregiverName" label="ชื่อผู้ดูแล" error={fieldError("caregiverName")}>
                        <Input id="caregiverName" {...register("caregiverName")} />
                      </Field>
                      <Field id="caregiverRelation" label="ความสัมพันธ์" error={fieldError("caregiverRelation")}>
                        <select id="caregiverRelation" {...register("caregiverRelation", { onChange: (event) => { if (event.target.value !== "อื่นๆ") setValue("caregiverRelationOther", ""); } })} className={selectClass}>
                          <option value="">-- เลือก --</option>
                          {CAREGIVER_RELATION_OPTIONS.map((item) => <option key={item}>{item}</option>)}
                        </select>
                      </Field>
                      {caregiverRelation === "อื่นๆ" ? (
                        <Field id="caregiverRelationOther" label="ระบุความสัมพันธ์" error={fieldError("caregiverRelationOther")}>
                          <Input id="caregiverRelationOther" {...register("caregiverRelationOther")} />
                        </Field>
                      ) : null}
                      <Field id="caregiverPhone" label="เบอร์โทรศัพท์ผู้ดูแล" error={fieldError("caregiverPhone")}>
                        <Input id="caregiverPhone" type="tel" inputMode="tel" {...register("caregiverPhone")} />
                      </Field>
                    </>
                  ) : null}
                  {caregiverStatus === "อยู่คนเดียว" ? (
                    <Field id="patientPhone" label="เบอร์โทรศัพท์ผู้ป่วย" error={fieldError("patientPhone")} wide>
                      <Input id="patientPhone" type="tel" inputMode="tel" {...register("patientPhone")} />
                    </Field>
                  ) : null}

                  <Field id="diagnosis" label="5. การวินิจฉัยโรคแรกรับ" error={fieldError("diagnosis")} wide>
                    <select id="diagnosis" {...register("diagnosis", { onChange: (event) => { if (event.target.value !== "อื่นๆ") setValue("diagnosisOther", ""); } })} className={selectClass}>
                      <option value="">-- เลือกการวินิจฉัย --</option>
                      {DIAGNOSIS_OPTIONS.map((item) => <option key={item}>{item}</option>)}
                    </select>
                  </Field>
                  {diagnosis === "อื่นๆ" ? (
                    <Field id="diagnosisOther" label="ระบุการวินิจฉัย" error={fieldError("diagnosisOther")} wide>
                      <Input id="diagnosisOther" {...register("diagnosisOther")} />
                    </Field>
                  ) : null}
                  <Field id="admissionSource" label="6. รับ Admit" error={fieldError("admissionSource")} wide>
                    <select id="admissionSource" {...register("admissionSource", { onChange: (event) => { if (!event.target.value) setValue("admissionDate", ""); } })} className={selectClass}>
                      <option value="">-- เลือกวิธีรับผู้ป่วย --</option>
                      {ADMISSION_SOURCE_OPTIONS.map((item) => <option key={item}>{item}</option>)}
                    </select>
                  </Field>
                  {admissionSource ? (
                    <Field id="admissionDate" label="วันที่เข้ารับการรักษา" error={fieldError("admissionDate")} wide>
                      <Input id="admissionDate" type="date" {...register("admissionDate")} />
                      <p className="mt-1 text-xs text-muted-foreground">พ.ศ. {formatDateBE(admissionDate, "-")}</p>
                    </Field>
                  ) : null}
                  <Field id="admittingDoctor" label="7. นายแพทย์ผู้รับ" error={fieldError("admittingDoctor")} wide>
                    <select id="admittingDoctor" {...register("admittingDoctor")} className={selectClass}>
                      <option value="">-- เลือกแพทย์ผู้รับ --</option>
                      {ADMITTING_DOCTOR_OPTIONS.map((item) => <option key={item}>{item}</option>)}
                    </select>
                  </Field>
                </div>
              </Section>

              <div className="flex justify-end">
                <Button type="submit" disabled={saving}>{saving ? "กำลังบันทึก..." : "บันทึกข้อมูล"}</Button>
              </div>
            </form>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
