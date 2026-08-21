"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useState } from "react";
import {
  FormProvider,
  useForm,
  useFormContext,
  type FieldPath,
} from "react-hook-form";

import {
  saveNewPatientAction,
  type NewPatientResult,
} from "@/app/actions/patients";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  OAS_CARE_CONTENT,
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
  newPatientDefaultValues,
  newPatientSchema,
  type NewPatientFormValues,
} from "@/lib/validation/new-patient";
import { cn } from "@/lib/utils";
import { formatDateBE, todayISOInThailand } from "@/lib/utils/date";

const steps = [
  ["ข้อมูลพื้นฐาน", "ชื่อ นามสกุล เพศ อายุ และ HN"],
  ["ประเมิน SMI-V", "เลือกผลการคัดกรอง SMI-V"],
  ["ประเมิน OAS", "ประเมินความก้าวร้าวรุนแรง"],
  ["ข้อมูลเพิ่มเติม", "พฤติกรรม สารเสพติด และ readmit"],
  ["ที่อยู่และผู้ดูแล", "ข้อมูลรับไว้รักษาและผู้ดูแล"],
] as const;

const selectClass =
  "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-xs outline-none focus-visible:ring-2 focus-visible:ring-ring";

const stepFields: Record<number, FieldPath<NewPatientFormValues>[]> = {
  0: ["firstName", "lastName", "gender", "age", "hn"],
  1: ["smiV"],
  2: ["oasScore"],
  3: [
    "aggressiveBehavior",
    "substanceUse",
    "substanceType",
    "readmit28",
    "admit3times",
    "admitNumber",
  ],
};

function FieldError({ name }: { name: FieldPath<NewPatientFormValues> }) {
  const {
    formState: { errors },
  } = useFormContext<NewPatientFormValues>();
  const error = errors[name];
  return error?.message ? (
    <p className="mt-1 text-xs text-destructive">{String(error.message)}</p>
  ) : null;
}

function FormField({
  name,
  label,
  children,
  wide = false,
}: {
  name: FieldPath<NewPatientFormValues>;
  label: string;
  children: React.ReactNode;
  wide?: boolean;
}) {
  return (
    <div className={wide ? "md:col-span-2" : undefined}>
      <Label htmlFor={name}>{label}</Label>
      <div className="mt-2">{children}</div>
      <FieldError name={name} />
    </div>
  );
}

function StepShell({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <Card className="mt-6 border-slate-200 bg-slate-50/80">
      <CardHeader>
        <CardTitle className="text-xl text-slate-800">{title}</CardTitle>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

function BasicInfoStep() {
  const { register } = useFormContext<NewPatientFormValues>();
  return (
    <StepShell title="ข้อมูลพื้นฐาน">
      <div className="grid gap-4 md:grid-cols-2">
        <FormField name="firstName" label="1. ชื่อผู้ป่วย">
          <Input
            id="firstName"
            {...register("firstName")}
            placeholder="กรอกชื่อ"
          />
        </FormField>
        <FormField name="lastName" label="2. นามสกุลผู้ป่วย">
          <Input
            id="lastName"
            {...register("lastName")}
            placeholder="กรอกนามสกุล"
          />
        </FormField>
        <FormField name="gender" label="3. เพศ">
          <select id="gender" {...register("gender")} className={selectClass}>
            <option value="">-- เลือกเพศ --</option>
            <option value="หญิง">เพศหญิง</option>
            <option value="ชาย">เพศชาย</option>
          </select>
        </FormField>
        <FormField name="age" label="4. อายุ (ปี)">
          <Input
            id="age"
            type="number"
            min={0}
            max={150}
            {...register("age")}
            placeholder="กรอกอายุ"
          />
        </FormField>
        <FormField name="hn" label="5. HN ผู้ป่วย" wide>
          <Input id="hn" {...register("hn")} placeholder="กรอก HN" />
        </FormField>
      </div>
    </StepShell>
  );
}

function SmivStep() {
  const { register, watch } = useFormContext<NewPatientFormValues>();
  const selected = watch("smiV");
  return (
    <StepShell title="แบบประเมินคัดกรอง SMI-V">
      <p className="mb-4 text-sm text-muted-foreground">
        เลือกข้อที่ตรงกับประวัติหรืออาการผู้ป่วยมากที่สุด 1 ข้อ
      </p>
      <div className="space-y-3">
        {SMI_V_OPTIONS.map((option) => (
          <Label
            key={option.value}
            className={`block cursor-pointer rounded-xl border p-4 leading-relaxed transition ${selected === option.value ? "border-primary bg-indigo-50" : "border-slate-200 bg-white hover:border-indigo-300"}`}
          >
            <span className="flex items-start gap-3">
              <input
                type="radio"
                value={option.value}
                {...register("smiV")}
                className="mt-1 accent-indigo-600"
              />
              <span>
                <strong>{option.value}</strong> — {option.title}
                <span className="mt-1 block text-sm font-normal text-slate-600">
                  เช่น {option.description}
                </span>
              </span>
            </span>
          </Label>
        ))}
      </div>
      <FieldError name="smiV" />
    </StepShell>
  );
}

function OasStep() {
  const { register, watch } = useFormContext<NewPatientFormValues>();
  const selected = watch("oasScore");
  return (
    <StepShell title="OAS (Overt Aggression Scale)">
      <p className="mb-4 text-sm text-muted-foreground">
        เลือกแถวที่ตรงกับพฤติกรรมของผู้ป่วยมากที่สุด
      </p>
      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="min-w-[900px] text-left text-sm">
          <thead className="bg-slate-100 text-slate-700">
            <tr>
              <th className="p-3">ระดับ</th>
              <th className="p-3">ต่อตนเอง</th>
              <th className="p-3">ต่อผู้อื่น/คำพูด</th>
              <th className="p-3">ต่อทรัพย์สิน</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {OAS_OPTIONS.map((option) => (
              <tr
                key={option.value}
                className={
                  selected === option.value
                    ? "bg-indigo-50"
                    : "hover:bg-slate-50"
                }
              >
                <td className="p-3 align-top">
                  <Label className="flex cursor-pointer items-start gap-2 leading-relaxed">
                    <input
                      type="radio"
                      value={option.value}
                      {...register("oasScore")}
                      className="mt-1 accent-indigo-600"
                    />
                    <span>
                      <strong>OAS {option.value}</strong>
                      <span className="block font-normal">{option.title}</span>
                    </span>
                  </Label>
                </td>
                <td className="p-3 align-top text-slate-600">{option.self}</td>
                <td className="p-3 align-top text-slate-600">
                  {option.others}
                </td>
                <td className="p-3 align-top text-slate-600">
                  {option.property}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <FieldError name="oasScore" />
    </StepShell>
  );
}

function AdditionalStep() {
  const { register, watch } = useFormContext<NewPatientFormValues>();
  const substanceUse = watch("substanceUse");
  const admit3times = watch("admit3times");
  return (
    <StepShell title="ประเมินข้อมูลเพิ่มเติม">
      <div className="grid gap-4 md:grid-cols-2">
        <FormField name="aggressiveBehavior" label="1. พฤติกรรมรุนแรงที่นำส่ง">
          <Textarea
            id="aggressiveBehavior"
            {...register("aggressiveBehavior")}
            placeholder="ระบุพฤติกรรมที่นำส่ง"
          />
        </FormField>
        <FormField name="substanceUse" label="2. สุราและสารเสพติด">
          <select
            id="substanceUse"
            {...register("substanceUse")}
            className={selectClass}
          >
            <option value="">-- เลือก --</option>
            {SUBSTANCE_USE_OPTIONS.map((item) => (
              <option key={item}>{item}</option>
            ))}
          </select>
          {substanceUse === "ใช้" ? (
            <div className="mt-2">
              <select
                aria-label="ประเภทสารเสพติด/สุรา"
                {...register("substanceType")}
                className={selectClass}
              >
                <option value="">-- เลือกประเภท --</option>
                {SUBSTANCE_TYPE_OPTIONS.map((item) => (
                  <option key={item}>{item}</option>
                ))}
              </select>
              <FieldError name="substanceType" />
            </div>
          ) : null}
        </FormField>
        <FormField name="readmit28" label="3.1 ผู้ป่วย readmit ใน 28 วัน">
          <select
            id="readmit28"
            {...register("readmit28")}
            className={selectClass}
          >
            <option value="">-- เลือก --</option>
            {YES_NO_OPTIONS.map((item) => (
              <option key={item}>{item}</option>
            ))}
          </select>
        </FormField>
        <FormField name="admit3times" label="3.2 Admit ≥ 3 ครั้งใน 1 ปี">
          <select
            id="admit3times"
            {...register("admit3times")}
            className={selectClass}
          >
            <option value="">-- เลือก --</option>
            {YES_NO_OPTIONS.map((item) => (
              <option key={item}>{item}</option>
            ))}
          </select>
          {admit3times === "ใช่" ? (
            <div className="mt-2">
              <Input
                type="number"
                min={1}
                {...register("admitNumber")}
                placeholder="ครั้งนี้ Admit เป็นครั้งที่เท่าไหร่"
              />
              <FieldError name="admitNumber" />
            </div>
          ) : null}
        </FormField>
      </div>
    </StepShell>
  );
}

function AddressStep() {
  const { register, watch, setValue } = useFormContext<NewPatientFormValues>();
  const residenceType = watch("residenceType");
  const residenceDistrict = watch("residenceDistrict");
  const caregiverStatus = watch("caregiverStatus");
  const caregiverRelation = watch("caregiverRelation");
  const hasPermanentResidence = residenceType === "มีที่อยู่เป็นหลักแหล่ง";
  return (
    <StepShell title="ข้อมูลที่อยู่ ผู้ดูแล และการรับไว้รักษา">
      <div className="space-y-5">
        <FormField name="residenceType" label="1. สถานภาพที่อยู่">
          <select
            id="residenceType"
            {...register("residenceType", {
              onChange: (event) => {
                if (event.target.value === "มีที่อยู่เป็นหลักแหล่ง") return;
                setValue("residenceDistrict", "");
                setValue("residenceSubdistrict", "");
                setValue("residenceOtherDistrict", "");
                setValue("residenceDetails", "");
              },
            })}
            className={selectClass}
          >
            <option value="">-- เลือกสถานภาพที่อยู่ --</option>
            {RESIDENCE_TYPE_OPTIONS.map((item) => (
              <option key={item}>{item}</option>
            ))}
          </select>
        </FormField>
        {hasPermanentResidence ? (
          <div className="grid gap-4 rounded-xl border bg-white p-4 md:grid-cols-2">
              <FormField name="residenceDistrict" label="2. เขตที่อยู่">
                <select
                  id="residenceDistrict"
                  {...register("residenceDistrict", {
                    onChange: () => {
                      setValue("residenceSubdistrict", "");
                      setValue("residenceOtherDistrict", "");
                    },
                  })}
                  className={selectClass}
                >
                  <option value="">-- เลือกเขต --</option>
                  {RESIDENCE_DISTRICT_OPTIONS.map((item) => (
                    <option key={item}>{item}</option>
                  ))}
                </select>
              </FormField>
              {residenceDistrict === "ในเขตอำเภอเมืองชลบุรี" ? (
                <FormField name="residenceSubdistrict" label="3. ตำบล">
                  <select
                    id="residenceSubdistrict"
                    {...register("residenceSubdistrict")}
                    className={selectClass}
                  >
                    <option value="">-- เลือกตำบล --</option>
                    {CITY_SUBDISTRICTS.map((item) => (
                      <option key={item}>{item}</option>
                    ))}
                  </select>
                </FormField>
              ) : null}
              {residenceDistrict === "นอกเขตอำเภอเมืองชลบุรี" ? (
                <FormField name="residenceOtherDistrict" label="3. อำเภอ">
                  <select
                    id="residenceOtherDistrict"
                    {...register("residenceOtherDistrict")}
                    className={selectClass}
                  >
                    <option value="">-- เลือกอำเภอ --</option>
                    {OTHER_DISTRICTS.map((item) => (
                      <option key={item}>{item}</option>
                    ))}
                  </select>
                </FormField>
              ) : null}
              <FormField name="residenceDetails" label="รายละเอียดที่อยู่" wide>
                <Textarea
                  id="residenceDetails"
                  {...register("residenceDetails")}
                />
              </FormField>
          </div>
        ) : null}
        <FormField name="caregiverStatus" label="4. สถานภาพผู้ดูแล">
              <select
                id="caregiverStatus"
                {...register("caregiverStatus")}
                className={selectClass}
              >
                <option value="">-- เลือกสถานภาพผู้ดูแล --</option>
                {CAREGIVER_STATUS_OPTIONS.map((item) => (
                  <option key={item}>{item}</option>
                ))}
              </select>
            </FormField>
            {caregiverStatus && caregiverStatus !== "อยู่คนเดียว" ? (
              <div className="grid gap-4 rounded-xl border bg-white p-4 md:grid-cols-2">
                <FormField name="caregiverName" label="ชื่อผู้ดูแล">
                  <Input id="caregiverName" {...register("caregiverName")} />
                </FormField>
                <FormField name="caregiverRelation" label="ความสัมพันธ์">
                  <select
                    id="caregiverRelation"
                    {...register("caregiverRelation")}
                    className={selectClass}
                  >
                    <option value="">-- เลือก --</option>
                    {CAREGIVER_RELATION_OPTIONS.map((item) => (
                      <option key={item}>{item}</option>
                    ))}
                  </select>
                  {caregiverRelation === "อื่นๆ" ? (
                    <div className="mt-2">
                      <Input
                        {...register("caregiverRelationOther")}
                        placeholder="ระบุความสัมพันธ์"
                      />
                      <FieldError name="caregiverRelationOther" />
                    </div>
                  ) : null}
                </FormField>
                <FormField name="caregiverPhone" label="เบอร์โทรศัพท์ผู้ดูแล">
                  <Input
                    id="caregiverPhone"
                    type="tel"
                    {...register("caregiverPhone")}
                  />
                </FormField>
              </div>
            ) : null}
            {caregiverStatus === "อยู่คนเดียว" ? (
              <FormField name="patientPhone" label="เบอร์โทรศัพท์ผู้ป่วย">
                <Input
                  id="patientPhone"
                  type="tel"
                  {...register("patientPhone")}
                />
              </FormField>
            ) : null}
            <div className="grid gap-4 md:grid-cols-2">
              <FormField name="diagnosis" label="5. การวินิจฉัยโรคแรกรับ" wide>
                <select
                  id="diagnosis"
                  {...register("diagnosis")}
                  className={selectClass}
                >
                  <option value="">-- เลือกการวินิจฉัย --</option>
                  {DIAGNOSIS_OPTIONS.map((item) => (
                    <option key={item}>{item}</option>
                  ))}
                </select>
                {watch("diagnosis") === "อื่นๆ" ? (
                  <div className="mt-2">
                    <Input
                      {...register("diagnosisOther")}
                      placeholder="ระบุการวินิจฉัย"
                    />
                    <FieldError name="diagnosisOther" />
                  </div>
                ) : null}
              </FormField>
              <FormField name="admissionSource" label="6. รับ Admit" wide>
                <select
                  id="admissionSource"
                  {...register("admissionSource")}
                  className={selectClass}
                >
                  <option value="">-- เลือกวิธีรับผู้ป่วย --</option>
                  {ADMISSION_SOURCE_OPTIONS.map((item) => (
                    <option key={item}>{item}</option>
                  ))}
                </select>
                {watch("admissionSource") ? (
                  <div className="mt-2">
                    <Input type="date" {...register("admissionDate")} />
                    <p className="mt-1 text-xs text-muted-foreground">
                      พ.ศ. {formatDateBE(watch("admissionDate"), "-")}
                    </p>
                    <FieldError name="admissionDate" />
                  </div>
                ) : null}
              </FormField>
              <FormField name="admittingDoctor" label="7. นายแพทย์ผู้รับ" wide>
                <select
                  id="admittingDoctor"
                  {...register("admittingDoctor")}
                  className={selectClass}
                >
                  <option value="">-- เลือกแพทย์ผู้รับ --</option>
                  {ADMITTING_DOCTOR_OPTIONS.map((item) => (
                    <option key={item}>{item}</option>
                  ))}
                </select>
              </FormField>
        </div>
      </div>
    </StepShell>
  );
}

function OasCareDialog({
  score,
  onBack,
  onContinue,
}: {
  score: string;
  onBack: () => void;
  onContinue: () => void;
}) {
  const care = OAS_CARE_CONTENT[score];
  if (!care) return null;
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4"
      role="presentation"
    >
      <Card
        role="dialog"
        aria-modal="true"
        aria-labelledby="oas-care-title"
        className="w-full max-w-lg bg-white shadow-2xl"
      >
        <CardHeader>
          <CardTitle id="oas-care-title" className="text-xl">
            {care.title}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="list-disc space-y-2 pl-5 text-sm text-slate-700">
            {care.items.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
          <div className="mt-6 flex justify-end gap-3">
            <Button variant="secondary" onClick={onBack}>
              ย้อนกลับ
            </Button>
            <Button onClick={onContinue}>ไปต่อ</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function ResultCard({
  result,
  onNew,
}: {
  result: NewPatientResult;
  onNew: () => void;
}) {
  const isSmiv = result.smiVResult !== NON_SMIV_VALUE;
  return (
    <div className="mx-auto max-w-3xl px-4 py-8 md:px-6">
      <Card className="border-emerald-200 bg-white">
        <CardHeader>
          <div className="flex size-14 items-center justify-center rounded-full bg-emerald-100 text-3xl text-emerald-700">
            ✓
          </div>
          <h1 className="pt-3 text-2xl font-semibold leading-none tracking-tight">
            {isSmiv
              ? "บันทึกประเมินเรียบร้อย"
              : "ไม่เข้าข่าย SMI-V (บันทึกสำเร็จ)"}
          </h1>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 rounded-xl bg-slate-50 p-5 text-sm md:grid-cols-2">
            <div>
              <strong>ชื่อ:</strong> {result.firstName} {result.lastName}
            </div>
            <div>
              <strong>HN:</strong> {result.hn}
            </div>
            <div>
              <strong>ผลประเมิน:</strong> {result.smiVResult}
            </div>
            {isSmiv ? (
              <div>
                <strong>OAS:</strong> {result.oasScore}
              </div>
            ) : null}
          </div>
          <div className="mt-6 flex gap-3">
            <Link href="/dashboard" className={cn(buttonVariants())}>
              กลับหน้าหลัก
            </Link>
            <Button variant="outline" onClick={onNew}>
              ลงทะเบียนรายใหม่
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function NewPatientWizardForm() {
  const methods = useForm<NewPatientFormValues>({
    resolver: zodResolver(newPatientSchema),
    defaultValues: {
      ...newPatientDefaultValues,
      admissionDate: todayISOInThailand(),
    },
    mode: "onTouched",
  });
  const [step, setStep] = useState(0);
  const [finalReturnStep, setFinalReturnStep] = useState<1 | 3>(3);
  const [showCare, setShowCare] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<NewPatientResult | null>(null);

  async function goNext() {
    setSubmitError("");
    const valid = await methods.trigger(stepFields[step]);
    if (!valid) return;
    if (step === 1) {
      if (methods.getValues("smiV") === NON_SMIV_VALUE) {
        setFinalReturnStep(1);
        setStep(4);
      } else setStep(2);
      return;
    }
    if (step === 2) {
      setShowCare(true);
      return;
    }
    if (step === 3) {
      setFinalReturnStep(3);
      setStep(4);
      return;
    }
    setStep((current) => current + 1);
  }

  function goBack() {
    setSubmitError("");
    if (step === 4) setStep(finalReturnStep);
    else setStep((current) => Math.max(0, current - 1));
  }

  async function submit(values: NewPatientFormValues) {
    setSubmitting(true);
    setSubmitError("");
    const data = new FormData();
    Object.entries(values).forEach(([key, value]) => data.set(key, value));
    const response = await saveNewPatientAction(data);
    setSubmitting(false);
    if (response.status === "error") {
      setSubmitError(response.message);
      for (const [name, messages] of Object.entries(
        response.fieldErrors ?? {},
      )) {
        if (messages?.[0])
          methods.setError(name as FieldPath<NewPatientFormValues>, {
            message: messages[0],
          });
      }
      return;
    }
    if (!response.result) {
      setSubmitError("บันทึกสำเร็จ แต่ไม่พบข้อมูลสรุปผลลัพธ์");
      return;
    }
    setResult(response.result);
    methods.reset({
      ...newPatientDefaultValues,
      admissionDate: todayISOInThailand(),
    });
    setStep(0);
    setFinalReturnStep(3);
    setShowCare(false);
  }

  if (result)
    return <ResultCard result={result} onNew={() => setResult(null)} />;

  return (
    <FormProvider {...methods}>
      <form
        onSubmit={methods.handleSubmit(submit)}
        className="mx-auto max-w-6xl px-4 py-8 md:px-6"
        noValidate
      >
        <Card className="border-slate-200 bg-white">
          <CardHeader>
            <p className="text-sm font-medium uppercase tracking-[0.2em] text-indigo-600">
              New Patient
            </p>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <h1 className="text-2xl font-semibold leading-none tracking-tight md:text-3xl">
                แบบประเมินคัดกรองผู้ป่วย SMI-V แรกรับ
              </h1>
              <span className="rounded-full bg-muted px-3 py-1 text-sm">
                ขั้นตอน {step + 1}/{steps.length}
              </span>
            </div>
            <div className="mt-3 grid gap-2 sm:grid-cols-5">
              {steps.map(([title, description], index) => (
                <div
                  key={title}
                  className={`rounded-lg border p-2 text-xs ${index === step ? "border-primary bg-indigo-50 text-indigo-700" : index < step ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-slate-200 text-slate-500"}`}
                >
                  <strong>
                    {index + 1}. {title}
                  </strong>
                  <span className="mt-1 block">{description}</span>
                </div>
              ))}
            </div>
          </CardHeader>
          <CardContent>
            {submitError ? (
              <Alert className="border-red-200 bg-red-50 text-red-700">
                <AlertDescription>{submitError}</AlertDescription>
              </Alert>
            ) : null}
            {step === 0 ? <BasicInfoStep /> : null}
            {step === 1 ? <SmivStep /> : null}
            {step === 2 ? <OasStep /> : null}
            {step === 3 ? <AdditionalStep /> : null}
            {step === 4 ? <AddressStep /> : null}
            <div className="mt-6 flex justify-between gap-3">
              <Button
                variant="secondary"
                onClick={goBack}
                disabled={step === 0 || submitting}
              >
                ย้อนกลับ
              </Button>
              {step < 4 ? (
                <Button onClick={() => void goNext()} disabled={submitting}>
                  ถัดไป
                </Button>
              ) : (
                <Button type="submit" disabled={submitting}>
                  {submitting ? "กำลังบันทึก..." : "บันทึกข้อมูล"}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
        {showCare ? (
          <OasCareDialog
            score={methods.getValues("oasScore")}
            onBack={() => setShowCare(false)}
            onContinue={() => {
              setShowCare(false);
              setStep(3);
            }}
          />
        ) : null}
      </form>
    </FormProvider>
  );
}
