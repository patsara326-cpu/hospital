"use client";

import { useState } from "react";

import { saveNewPatientAction, type NewPatientResult } from "@/app/actions/patients";
import Link from "next/link";

type PatientForm = {
  firstName: string; lastName: string; gender: string; age: string; hn: string;
  smiV: string; oasScore: string; aggressiveBehavior: string; substanceUse: string;
  substanceType: string; readmit28: string; admit3times: string; admitNumber: string;
  residenceType: string; residenceDistrict: string; residenceSubdistrict: string;
  residenceOtherDistrict: string; residenceDetails: string; caregiverStatus: string;
  caregiverName: string; caregiverRelation: string; caregiverRelationOther: string;
  caregiverPhone: string; patientPhone: string; diagnosis: string; diagnosisOther: string;
  admissionSource: string; admissionDate: string; admittingDoctor: string;
};

const defaultForm: PatientForm = {
  firstName: "", lastName: "", gender: "", age: "", hn: "", smiV: "", oasScore: "",
  aggressiveBehavior: "", substanceUse: "", substanceType: "", readmit28: "",
  admit3times: "", admitNumber: "", residenceType: "", residenceDistrict: "",
  residenceSubdistrict: "", residenceOtherDistrict: "", residenceDetails: "",
  caregiverStatus: "", caregiverName: "", caregiverRelation: "", caregiverRelationOther: "",
  caregiverPhone: "", patientPhone: "", diagnosis: "", diagnosisOther: "",
  admissionSource: "", admissionDate: "", admittingDoctor: "",
};

const steps = [
  ["ข้อมูลพื้นฐาน", "ชื่อ นามสกุล เพศ อายุ และ HN"],
  ["ประเมิน SMI-V", "เลือกผลการคัดกรอง SMI-V"],
  ["ประเมิน OAS", "เลือกคะแนนความก้าวร้าวรุนแรง"],
  ["ข้อมูลเพิ่มเติม", "พฤติกรรม สารเสพติด และการ readmit"],
  ["ที่อยู่และผู้ดูแล", "ข้อมูลที่อยู่ การวินิจฉัย และแพทย์ผู้รับ"],
] as const;

const fieldClass = "mt-2 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200";
const labelClass = "block text-sm font-medium text-slate-700";
const smiOptions = [["SMI-V 1", "รุนแรงต่อตนเอง"], ["SMI-V 2", "รุนแรงต่อผู้อื่น/สังคม"], ["SMI-V 3", "มีอาการทางจิตและคิดมุ่งร้ายเฉพาะเจาะจง"], ["SMI-V 4", "ก่อคดีอาชญากรรมรุนแรง"], ["ไม่เข้าข่าย SMI-V", "ไม่มีอาการเข้าข่าย SMI-V"]] as const;
const oasOptions = [["1", "กึ่งเร่งด่วน (Semi-urgency)", "หงุดหงิด ตะโกนด้วยความโกรธ หรือปิดประตูเสียงดัง"], ["2", "เร่งด่วน (Urgency)", "ด่าคำหยาบ คุกคาม พุ่งชน เตะ ผลัก หรือขว้างสิ่งของ"], ["3", "ฉุกเฉิน (Emergency)", "ข่มขู่ทำร้าย ทำร้ายจนบาดเจ็บ หรือทำลายสิ่งของอันตราย"]] as const;
const oasCareContent: Record<string, { title: string; items: string[] }> = {
  "1": {
    title: "OAS 1 - Semi-urgency (ต้องได้รับการดูแลภายใน 24 ชั่วโมง)",
    items: [
      "พูดคุยสร้างสัมพันธภาพ",
      "เปิดโอกาสให้ผู้ป่วยได้พูดคุย ระบายอารมณ์ความรู้สึก",
      "Verbal restraint",
      "ประเมินซ้ำ",
    ],
  },
  "2": {
    title: "OAS 2 - Urgency (ต้องได้รับการดูแลภายใน 2 ชั่วโมง)",
    items: [
      "จัดสิ่งแวดล้อม/พูดคุยสร้างสัมพันธภาพ",
      "Verbal restraint",
      "Physical restraint",
      "ให้ยา Hadol (5) IM / Valium (10) IV (ตามแผนการรักษาของแพทย์)",
      "ประเมินซ้ำหลังได้ยา หากอาการไม่ดีขึ้น renotify แพทย์",
      "ประเมินต่อเนื่องทุก 4-6 ชั่วโมง",
    ],
  },
  "3": {
    title: "OAS 3 - Emergency (ต้องได้รับการดูแลทันทีหรือภายใน 1 ชั่วโมง)",
    items: [
      "จัดสิ่งแวดล้อมให้ปลอดภัย อยู่ใกล้เคาท์เตอร์พยาบาล",
      "Physical restraint",
      "Verbal restraint",
      "ให้ยา Hadol (5) IM / Valium (10) IV (ตามแผนการรักษาของแพทย์)",
      "ประเมินซ้ำหลังได้ยา หากอาการไม่ดีขึ้น renotify แพทย์",
      "ประเมินต่อเนื่องทุก 4-6 ชั่วโมง",
    ],
  },
};
const citySubdistricts = ["บางทราย", "บางปลาสร้อย", "บ้านโขด", "มะขามหย่ง", "บ้านสวน", "หนองรี", "หนองข้างคอก", "นาป่า", "ดอนหัวฬ่อ", "หนองไม้แดง", "คลองตำหรุ", "เสม็ด", "ห้วยกะปิ", "บ้านปึก", "อ่างศิลา", "แสนสุข", "เหมือง", "สำนักบก"];
const otherDistricts = ["พนัสนิคม", "พานทอง", "บ้านบึง", "ศรีราชา", "บางละมุง", "สัตหีบ", "หนองใหญ่", "บ่อทอง", "เกาะจันทร์", "เกาะสีชัง"];

function isBlank(value: string) { return !value.trim(); }
function Field({ label, children, wide = false }: { label: string; children: React.ReactNode; wide?: boolean }) { return <label className={`${labelClass}${wide ? " md:col-span-2" : ""}`}>{label}{children}</label>; }
function SelectField({ value, onChange, children }: { value: string; onChange: (value: string) => void; children: React.ReactNode }) { return <select value={value} onChange={(event) => onChange(event.target.value)} className={fieldClass}>{children}</select>; }
function StepCard({ title, children }: { title: string; children: React.ReactNode }) { return <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5"><h2 className="mb-5 text-xl font-semibold text-slate-800">{title}</h2>{children}</div>; }

export default function NewPatientWizard() {
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<PatientForm>(defaultForm);
  const [returnAfterStep4, setReturnAfterStep4] = useState(false);
  const [showCare, setShowCare] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<NewPatientResult | null>(null);

  function updateField<K extends keyof PatientForm>(key: K, value: PatientForm[K]) { setForm((current) => ({ ...current, [key]: value })); setError(""); setMessage(""); }
  function validatePage1() { return [form.firstName, form.lastName, form.gender, form.age, form.hn].some(isBlank) ? "กรุณากรอกข้อมูลให้ครบ" : ""; }
  function validatePage4() {
    const missing: string[] = [];
    if (isBlank(form.aggressiveBehavior)) missing.push("พฤติกรรมรุนแรงที่นำส่ง");
    if (isBlank(form.substanceUse)) missing.push("การใช้สารเสพติด/สุรา");
    if (form.substanceUse === "ใช้" && isBlank(form.substanceType)) missing.push("ประเภทสารเสพติด/สุรา");
    if (isBlank(form.readmit28)) missing.push("readmit ใน 28 วัน");
    if (isBlank(form.admit3times)) missing.push("Admit มากกว่าหรือเท่ากับ 3 ครั้ง");
    if (form.admit3times === "ใช่" && isBlank(form.admitNumber)) missing.push("จำนวนครั้ง Admit");
    return missing.length ? `กรุณากรอกข้อมูลให้ครบ: ${missing.join(", ")}` : "";
  }
  function validatePage5() {
    if (isBlank(form.residenceType)) return "กรุณาเลือกสถานภาพที่อยู่";
    if (form.residenceType !== "เร่ร่อน/อยู่สถานสงเคราะห์") {
      if (isBlank(form.residenceDistrict)) return "กรุณาเลือกเขตที่อยู่";
      if (form.residenceDistrict === "ในเขตอำเภอเมืองชลบุรี" && isBlank(form.residenceSubdistrict)) return "กรุณาเลือกตำบล";
      if (form.residenceDistrict === "นอกเขตอำเภอเมืองชลบุรี" && isBlank(form.residenceOtherDistrict)) return "กรุณาเลือกอำเภอ";
      if (isBlank(form.residenceDetails)) return "กรุณากรอกรายละเอียดที่อยู่";
      if (isBlank(form.caregiverStatus)) return "กรุณาเลือกสถานภาพผู้ดูแล";
      if (form.caregiverStatus === "อยู่คนเดียว") { if (isBlank(form.patientPhone)) return "กรุณากรอกเบอร์โทรศัพท์ผู้ป่วย"; }
      else { if (isBlank(form.caregiverName)) return "กรุณากรอกชื่อผู้ดูแล"; if (isBlank(form.caregiverRelation) || (form.caregiverRelation === "อื่นๆ" && isBlank(form.caregiverRelationOther))) return "กรุณากรอกความสัมพันธ์ผู้ดูแล"; if (isBlank(form.caregiverPhone)) return "กรุณากรอกเบอร์โทรศัพท์ผู้ดูแล"; }
      if (isBlank(form.diagnosis)) return "กรุณาเลือกการวินิจฉัยโรคแรกรับ";
      if (form.diagnosis === "อื่นๆ" && isBlank(form.diagnosisOther)) return "กรุณาระบุการวินิจฉัยอื่นๆ";
      if (isBlank(form.admissionSource)) return "กรุณาเลือกวิธีการรับผู้ป่วย";
      if (isBlank(form.admissionDate)) return "กรุณาเลือกวันที่เข้ารับการรักษา";
      if (isBlank(form.admittingDoctor)) return "กรุณาเลือกนายแพทย์ผู้รับ";
    }
    return "";
  }
  function goNext() {
    if (step === 0) { const value = validatePage1(); if (value) return setError(value); setStep(1); }
    else if (step === 1) { if (isBlank(form.smiV)) return setError("กรุณาเลือกผลการประเมิน SMI-V"); if (form.smiV === "ไม่เข้าข่าย SMI-V") { setReturnAfterStep4(false); setStep(4); } else setStep(2); }
    else if (step === 2) {
      if (isBlank(form.oasScore)) return setError("กรุณาเลือกคะแนน OAS");
      if (oasCareContent[form.oasScore]) setShowCare(true);
      else setStep(3);
    }
    else if (step === 3) { const value = validatePage4(); if (value) return setError(value); setReturnAfterStep4(true); setStep(4); }
  }
  function goBack() { setError(""); if (step === 0) return; if (step === 4) { setStep(returnAfterStep4 ? 3 : 1); return; } setStep((current) => current - 1); }
  async function submit() {
    const value = validatePage5(); if (value) return setError(value);
    const data = new FormData();
    (Object.keys(form) as Array<keyof PatientForm>).forEach((key) => data.set(key, form[key]));
    data.set("residenceLocation", form.residenceDistrict === "ในเขตอำเภอเมืองชลบุรี" ? form.residenceSubdistrict : form.residenceOtherDistrict);
    if (form.caregiverRelation === "อื่นๆ") data.set("caregiverRelation", form.caregiverRelationOther);
    setSubmitting(true); setError("");
    const result = await saveNewPatientAction(data);
    setSubmitting(false);
    if (result.status === "error") return setError(result.message);
    if (!result.result) return setError("บันทึกสำเร็จ แต่ไม่พบข้อมูลสรุปผลลัพธ์");
    setResult(result.result); setForm(defaultForm); setStep(0); setReturnAfterStep4(false);
  }

  const addressVisible = form.residenceType === "มีที่อยู่เป็นหลักแหล่ง";
  const caregiverVisible = Boolean(form.caregiverStatus && form.caregiverStatus !== "อยู่คนเดียว");
  const progressClasses = ["w-1/5", "w-2/5", "w-3/5", "w-4/5", "w-full"] as const;

  if (result) {
    const isSmiv = result.smiVResult !== "ไม่เข้าข่าย SMI-V";
    return <div className="mx-auto max-w-3xl px-4 py-8 md:px-6"><section className="rounded-3xl border border-emerald-200 bg-white p-6 shadow-sm md:p-8">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-3xl text-emerald-700" aria-hidden="true">✓</div>
      <p className="mt-5 text-sm font-medium uppercase tracking-[0.2em] text-emerald-600">Registration complete</p>
      <h1 className="mt-1 text-2xl font-bold text-slate-800 md:text-3xl">{isSmiv ? "บันทึกประเมินเรียบร้อย (Supabase)" : "ไม่เข้าข่าย SMI-V (บันทึกสำเร็จ)"}</h1>
      <div className="mt-6 grid gap-3 rounded-2xl bg-slate-50 p-5 text-sm text-slate-700 md:grid-cols-2">
        <div><span className="font-semibold text-slate-900">ชื่อ:</span> {result.firstName} {result.lastName}</div>
        <div><span className="font-semibold text-slate-900">HN:</span> {result.hn}</div>
        <div><span className="font-semibold text-slate-900">ผลประเมิน:</span> {result.smiVResult}</div>
        {isSmiv ? <div><span className="font-semibold text-slate-900">OAS Score:</span> {result.oasScore || "ไม่ระบุ"}</div> : null}
      </div>
      <div className="mt-6 flex flex-wrap gap-3">
        <Link href="/dashboard" className="rounded-xl bg-indigo-600 px-5 py-2.5 font-semibold text-white transition hover:bg-indigo-700">กลับหน้าหลัก</Link>
        <button type="button" onClick={() => { setResult(null); setMessage(""); }} className="rounded-xl border border-slate-300 bg-white px-5 py-2.5 font-semibold text-slate-700 transition hover:border-indigo-400">ลงทะเบียนผู้ป่วยรายใหม่</button>
      </div>
    </section></div>;
  }

  return <div className="mx-auto max-w-5xl px-4 py-8 md:px-6"><section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
    <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-sm font-medium uppercase tracking-[0.2em] text-indigo-600">New Patient</p><h1 className="mt-1 text-2xl font-bold text-slate-800 md:text-3xl">แบบประเมินคัดกรองผู้ป่วย SMI-V แรกรับ</h1></div><span className="rounded-full bg-slate-100 px-3 py-1 text-sm font-medium text-slate-700">ขั้นตอน {step + 1}/{steps.length}</span></div>
    <div className="mt-6 h-2 overflow-hidden rounded-full bg-slate-200"><div className={`h-full rounded-full bg-gradient-to-r from-indigo-600 to-sky-500 transition-all ${progressClasses[step]}`} /></div>
    <div className="mt-5 grid gap-2 sm:grid-cols-5">{steps.map(([title, description], index) => <button key={title} type="button" disabled={index > step} onClick={() => { if (index <= step) setStep(index); }} className={`rounded-xl border px-2 py-2 text-left text-xs transition disabled:cursor-not-allowed ${index === step ? "border-indigo-600 bg-indigo-50 text-indigo-700" : index < step ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-slate-200 text-slate-500"}`}><span className="font-semibold">{index + 1}. {title}</span><span className="mt-1 block">{description}</span></button>)}</div>
    {message ? <p className="mt-5 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{message}</p> : null}{error ? <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p> : null}

    {step === 0 ? <StepCard title="ข้อมูลพื้นฐาน"><div className="grid gap-4 md:grid-cols-2"><Field label="1. ชื่อผู้ป่วย"><input value={form.firstName} onChange={(event) => updateField("firstName", event.target.value)} className={fieldClass} placeholder="กรอกชื่อ" /></Field><Field label="2. นามสกุลผู้ป่วย"><input value={form.lastName} onChange={(event) => updateField("lastName", event.target.value)} className={fieldClass} placeholder="กรอกนามสกุล" /></Field><Field label="3. เพศ"><SelectField value={form.gender} onChange={(value) => updateField("gender", value)}><option value="">-- เลือกเพศ --</option><option value="หญิง">เพศหญิง</option><option value="ชาย">เพศชาย</option></SelectField></Field><Field label="4. อายุ (ปี)"><input type="number" min={0} max={150} value={form.age} onChange={(event) => updateField("age", event.target.value)} className={fieldClass} placeholder="กรอกอายุ" /></Field><Field label="5. HN ผู้ป่วย" wide><input value={form.hn} onChange={(event) => updateField("hn", event.target.value)} className={fieldClass} placeholder="กรอก HN" /></Field></div></StepCard> : null}
    {step === 1 ? <StepCard title="แบบประเมินคัดกรอง SMI-V"><p className="mb-4 text-sm text-slate-600">เลือกข้อที่ตรงกับอาการผู้ป่วยมากที่สุด (เลือกได้ 1 ข้อ)</p><div className="space-y-3">{smiOptions.map(([value, description]) => <label key={value} className={`block cursor-pointer rounded-xl border p-4 transition ${form.smiV === value ? "border-indigo-500 bg-indigo-50" : "border-slate-200 hover:border-indigo-300"}`}><input type="radio" name="smiV" value={value} checked={form.smiV === value} onChange={(event) => updateField("smiV", event.target.value)} className="mr-2" /><strong>{value}</strong> <span className="text-sm text-slate-700">- {description}</span></label>)}</div></StepCard> : null}
    {step === 2 ? <StepCard title="OAS (Overt Aggression Scale)"><p className="mb-4 text-sm text-slate-600">กรุณาเลือกแถวที่ตรงกับพฤติกรรมของผู้ป่วยมากที่สุด</p><div className="space-y-3">{oasOptions.map(([value, title, description]) => <label key={value} className={`block cursor-pointer rounded-xl border p-4 transition ${form.oasScore === value ? "border-indigo-500 bg-indigo-50" : "border-slate-200 hover:border-indigo-300"}`}><input type="radio" name="oasScore" value={value} checked={form.oasScore === value} onChange={(event) => updateField("oasScore", event.target.value)} className="mr-2" /><strong>{value}. {title}</strong><p className="mt-1 pl-6 text-sm text-slate-600">{description}</p></label>)}</div></StepCard> : null}
    {step === 3 ? <StepCard title="ประเมินข้อมูลเพิ่มเติม"><div className="grid gap-4 md:grid-cols-2"><Field label="1. พฤติกรรมรุนแรงที่นำส่ง"><textarea value={form.aggressiveBehavior} onChange={(event) => updateField("aggressiveBehavior", event.target.value)} className={`${fieldClass} min-h-28`} placeholder="เช่น ทำร้ายตนเอง, ทำร้ายผู้อื่น, ขว้างปา" /></Field><Field label="2. สุราและสารเสพติด"><SelectField value={form.substanceUse} onChange={(value) => updateField("substanceUse", value)}><option value="">-- เลือก --</option><option value="ไม่ใช้">ไม่ใช้</option><option value="ใช้">ใช้</option></SelectField>{form.substanceUse === "ใช้" ? <SelectField value={form.substanceType} onChange={(value) => updateField("substanceType", value)}><option value="">-- เลือกประเภท --</option><option value="ใช้ยาเสพติด">ใช้ยาเสพติด</option><option value="ใช้สุรา">ใช้สุรา</option><option value="ใช้ทั้งสารเสพติดและสุรา">ใช้ทั้งสารเสพติดและสุรา</option></SelectField> : null}</Field><Field label="3.1 ผู้ป่วย readmit ใน 28 วัน"><SelectField value={form.readmit28} onChange={(value) => updateField("readmit28", value)}><option value="">-- เลือก --</option><option value="ใช่">ใช่</option><option value="ไม่ใช่">ไม่ใช่</option></SelectField></Field><Field label="3.2 Admit มากกว่าหรือเท่ากับ 3 ครั้งใน 1 ปี"><SelectField value={form.admit3times} onChange={(value) => updateField("admit3times", value)}><option value="">-- เลือก --</option><option value="ใช่">ใช่</option><option value="ไม่ใช่">ไม่ใช่</option></SelectField>{form.admit3times === "ใช่" ? <input type="number" min={1} value={form.admitNumber} onChange={(event) => updateField("admitNumber", event.target.value)} className={fieldClass} placeholder="ครั้งนี้ Admit เป็นครั้งที่เท่าไหร่" /> : null}</Field></div></StepCard> : null}
    {step === 4 ? <StepCard title="ข้อมูลที่อยู่และผู้ดูแล"><div className="space-y-5"><Field label="1. สถานภาพที่อยู่"><SelectField value={form.residenceType} onChange={(value) => updateField("residenceType", value)}><option value="">-- เลือกสถานภาพที่อยู่ --</option><option value="เร่ร่อน/อยู่สถานสงเคราะห์">เร่ร่อน/อยู่สถานสงเคราะห์</option><option value="มีที่อยู่เป็นหลักแหล่ง">มีที่อยู่เป็นหลักแหล่ง</option></SelectField></Field>{addressVisible ? <div className="grid gap-4 rounded-2xl border border-slate-200 bg-slate-50 p-4 md:grid-cols-2"><Field label="2. เขตที่อยู่"><SelectField value={form.residenceDistrict} onChange={(value) => { updateField("residenceDistrict", value); updateField("residenceSubdistrict", ""); updateField("residenceOtherDistrict", ""); }}><option value="">-- เลือกเขต --</option><option value="ในเขตอำเภอเมืองชลบุรี">ในเขตอำเภอเมืองชลบุรี</option><option value="นอกเขตอำเภอเมืองชลบุรี">นอกเขตอำเภอเมืองชลบุรี</option><option value="นอกจังหวัด">นอกจังหวัด</option></SelectField></Field>{form.residenceDistrict === "ในเขตอำเภอเมืองชลบุรี" ? <Field label="3. เลือกตำบล"><SelectField value={form.residenceSubdistrict} onChange={(value) => updateField("residenceSubdistrict", value)}><option value="">-- เลือกตำบล --</option>{citySubdistricts.map((item) => <option key={item}>{item}</option>)}</SelectField></Field> : null}{form.residenceDistrict === "นอกเขตอำเภอเมืองชลบุรี" ? <Field label="3. เลือกอำเภอ"><SelectField value={form.residenceOtherDistrict} onChange={(value) => updateField("residenceOtherDistrict", value)}><option value="">-- เลือกอำเภอ --</option>{otherDistricts.map((item) => <option key={item}>{item}</option>)}</SelectField></Field> : null}<Field label="รายละเอียดที่อยู่" wide><textarea value={form.residenceDetails} onChange={(event) => updateField("residenceDetails", event.target.value)} className={`${fieldClass} min-h-24`} placeholder="เช่น บ้านเลขที่ ซอย ถนน หมู่บ้าน" /></Field></div> : null}<Field label="4. สถานภาพผู้ดูแล"><SelectField value={form.caregiverStatus} onChange={(value) => updateField("caregiverStatus", value)}><option value="">-- เลือกสถานภาพผู้ดูแล --</option><option value="มีผู้ดูแลหลัก">มีผู้ดูแลหลัก</option><option value="มีผู้ดูแลแต่ไม่ได้อยู่ด้วยกัน">มีผู้ดูแลแต่ไม่ได้อยู่ด้วยกัน</option><option value="อยู่คนเดียว">อยู่คนเดียว</option></SelectField></Field>{caregiverVisible ? <div className="grid gap-4 rounded-2xl border border-slate-200 bg-slate-50 p-4 md:grid-cols-2"><Field label="ชื่อผู้ดูแล"><input value={form.caregiverName} onChange={(event) => updateField("caregiverName", event.target.value)} className={fieldClass} /></Field><Field label="ความสัมพันธ์"><SelectField value={form.caregiverRelation} onChange={(value) => updateField("caregiverRelation", value)}><option value="">-- เลือกความสัมพันธ์ --</option><option value="บิดามารดา">บิดามารดา</option><option value="คู่สมรส">คู่สมรส</option><option value="พี่น้อง">พี่น้อง</option><option value="ญาติ">ญาติ</option><option value="บุตร">บุตร</option><option value="อื่นๆ">อื่นๆ</option></SelectField>{form.caregiverRelation === "อื่นๆ" ? <input value={form.caregiverRelationOther} onChange={(event) => updateField("caregiverRelationOther", event.target.value)} className={fieldClass} placeholder="ระบุความสัมพันธ์อื่นๆ" /> : null}</Field><Field label="เบอร์โทรศัพท์ผู้ดูแล"><input type="tel" value={form.caregiverPhone} onChange={(event) => updateField("caregiverPhone", event.target.value)} className={fieldClass} placeholder="เช่น 0812345678" /></Field></div> : null}{form.caregiverStatus === "อยู่คนเดียว" ? <Field label="เบอร์โทรศัพท์ผู้ป่วย"><input type="tel" value={form.patientPhone} onChange={(event) => updateField("patientPhone", event.target.value)} className={fieldClass} placeholder="เช่น 0812345678" /></Field> : null}<div className="grid gap-4 md:grid-cols-2"><Field label="5. การวินิจฉัยโรคแรกรับ" wide><SelectField value={form.diagnosis} onChange={(value) => updateField("diagnosis", value)}><option value="">-- เลือกการวินิจฉัย --</option>{["Schizophrenia", "Schizophrenia Paranoid", "Substance Induce Psychosis", "Alcohol", "Acute Psychosis", "Depressive", "Adjustment", "Bipolar", "Suicidal Attempt", "Psychotic Disorder", "Amphetamine Induce Psychosis", "อื่นๆ"].map((item) => <option key={item}>{item}</option>)}</SelectField>{form.diagnosis === "อื่นๆ" ? <input value={form.diagnosisOther} onChange={(event) => updateField("diagnosisOther", event.target.value)} className={fieldClass} placeholder="ระบุการวินิจฉัยอื่นๆ" /> : null}</Field><Field label="6. รับ Admit" wide><SelectField value={form.admissionSource} onChange={(value) => updateField("admissionSource", value)}><option value="">-- เลือกวิธีการรับผู้ป่วย --</option><option value="รับจาก ER">รับจาก ER</option><option value="รับจาก OPD">รับจาก OPD</option><option value="รับย้าย">รับย้าย</option><option value="Refer Fasttrack">Refer Fasttrack</option></SelectField>{form.admissionSource ? <input type="date" value={form.admissionDate} onChange={(event) => updateField("admissionDate", event.target.value)} className={fieldClass} /> : null}</Field><Field label="7. นายแพทย์ผู้รับ" wide><SelectField value={form.admittingDoctor} onChange={(value) => updateField("admittingDoctor", value)}><option value="">-- เลือกแพทย์ผู้รับ --</option>{["พญ. บุญพร้อม เชษฐรตานนท์", "พญ. ปฏิมาภรณ์ ผลบุณยรักษ์", "พญ. อารียา สมบูรณ์เกื้อ", "นพ. แสนพล บุญชัย", "พญ. หทัยภัทร วิทยศักดิ์พันธุ์", "พญ. อนัญญา ชัยวัฒนพงศ์", "นพ.พูร์ ชีวะสุทโธ"].map((item) => <option key={item}>{item}</option>)}</SelectField></Field></div></div></StepCard> : null}

    <div className="mt-6 flex flex-wrap justify-between gap-3"><button type="button" onClick={goBack} disabled={step === 0 || submitting} className="rounded-xl bg-slate-400 px-5 py-2.5 font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50">ย้อนกลับ</button>{step < 4 ? <button type="button" onClick={goNext} disabled={submitting} className="rounded-xl bg-indigo-600 px-5 py-2.5 font-semibold text-white hover:bg-indigo-700 disabled:opacity-50">{step === 1 ? "บันทึกผลประเมิน" : step === 2 ? "ต่อไป - ข้อมูลเพิ่มเติม" : step === 3 ? "ต่อไป - ที่อยู่และผู้ดูแล" : "ถัดไป - ประเมิน SMI-V"}</button> : <button type="button" onClick={submit} disabled={submitting} className="rounded-xl bg-emerald-600 px-5 py-2.5 font-semibold text-white hover:bg-emerald-700 disabled:opacity-50">{submitting ? "กำลังบันทึก..." : "บันทึกข้อมูล"}</button>}</div>
  </section>
  {showCare ? <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4" role="presentation"><div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl" role="dialog" aria-modal="true" aria-labelledby="oas-care-title"><h2 id="oas-care-title" className="text-xl font-bold text-slate-800">{oasCareContent[form.oasScore]?.title}</h2><ul className="mt-4 list-disc space-y-2 pl-5 text-sm text-slate-700">{oasCareContent[form.oasScore]?.items.map((item) => <li key={item}>{item}</li>)}</ul><div className="mt-6 flex justify-end gap-3"><button type="button" onClick={() => setShowCare(false)} className="rounded-xl bg-slate-400 px-4 py-2 font-semibold text-white">ย้อนกลับ</button><button type="button" onClick={() => { setShowCare(false); setStep(3); }} className="rounded-xl bg-indigo-600 px-4 py-2 font-semibold text-white">ไปต่อ - ข้อมูลเพิ่มเติม</button></div></div></div> : null}
  </div>;
}
