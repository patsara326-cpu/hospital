import { z } from "zod";

import {
  ADMISSION_SOURCE_OPTIONS,
  ADMITTING_DOCTOR_OPTIONS,
  CAREGIVER_RELATION_OPTIONS,
  CAREGIVER_STATUS_OPTIONS,
  CITY_SUBDISTRICTS,
  DIAGNOSIS_OPTIONS,
  NON_SMIV_VALUE,
  OTHER_DISTRICTS,
  RESIDENCE_DISTRICT_OPTIONS,
  RESIDENCE_TYPE_OPTIONS,
  SMI_V_OPTIONS,
  SUBSTANCE_TYPE_OPTIONS,
  SUBSTANCE_USE_OPTIONS,
  YES_NO_OPTIONS,
} from "../constants/admission.ts";
import { isISODateOnly } from "../utils/date.ts";

const text = z.string().trim();
const oneOf = (value: string, options: readonly string[]) => options.includes(value);
const optionalPhone = text.refine(
  (value) => !value || /^[0-9+\-\s]{8,20}$/.test(value),
  "รูปแบบเบอร์โทรศัพท์ไม่ถูกต้อง",
);

export const newPatientSchema = z
  .object({
    firstName: text.min(1, "กรุณากรอกชื่อผู้ป่วย"),
    lastName: text.min(1, "กรุณากรอกนามสกุลผู้ป่วย"),
    gender: text.refine((value): boolean => value === "ชาย" || value === "หญิง", "กรุณาเลือกเพศ"),
    age: text
      .regex(/^\d+$/, "อายุต้องเป็นตัวเลขจำนวนเต็ม")
      .refine((value) => Number(value) >= 0 && Number(value) <= 150, "อายุต้องอยู่ระหว่าง 0–150 ปี"),
    hn: text.min(1, "กรุณากรอก HN"),
    smiV: text.refine(
      (value) => oneOf(value, SMI_V_OPTIONS.map((option) => option.value)),
      "กรุณาเลือกผลการประเมิน SMI-V",
    ),
    oasScore: text,
    aggressiveBehavior: text,
    substanceUse: text,
    substanceType: text,
    readmit28: text,
    admit3times: text,
    admitNumber: text,
    residenceType: text.refine((value) => oneOf(value, RESIDENCE_TYPE_OPTIONS), "กรุณาเลือกสถานภาพที่อยู่"),
    residenceDistrict: text,
    residenceSubdistrict: text,
    residenceOtherDistrict: text,
    residenceDetails: text,
    caregiverStatus: text,
    caregiverName: text,
    caregiverRelation: text,
    caregiverRelationOther: text,
    caregiverPhone: optionalPhone,
    patientPhone: optionalPhone,
    diagnosis: text.refine((value) => oneOf(value, DIAGNOSIS_OPTIONS), "กรุณาเลือกการวินิจฉัยโรคแรกรับ"),
    diagnosisOther: text,
    admissionSource: text.refine((value) => oneOf(value, ADMISSION_SOURCE_OPTIONS), "กรุณาเลือกวิธีการรับผู้ป่วย"),
    admissionDate: text,
    admittingDoctor: text.refine((value) => oneOf(value, ADMITTING_DOCTOR_OPTIONS), "กรุณาเลือกนายแพทย์ผู้รับ"),
  })
  .superRefine((value, context) => {
    const issue = (path: keyof typeof value, message: string) =>
      context.addIssue({ code: "custom", path: [path], message });

    if (value.smiV !== NON_SMIV_VALUE) {
      if (!["1", "2", "3"].includes(value.oasScore)) issue("oasScore", "กรุณาเลือกคะแนน OAS");
      if (!value.aggressiveBehavior) issue("aggressiveBehavior", "กรุณาระบุพฤติกรรมรุนแรงที่นำส่ง");
      if (!oneOf(value.substanceUse, SUBSTANCE_USE_OPTIONS)) issue("substanceUse", "กรุณาระบุการใช้สารเสพติด/สุรา");
      if (value.substanceUse === "ใช้" && !oneOf(value.substanceType, SUBSTANCE_TYPE_OPTIONS)) issue("substanceType", "กรุณาระบุประเภทสารเสพติด/สุรา");
      if (!oneOf(value.readmit28, YES_NO_OPTIONS)) issue("readmit28", "กรุณาระบุการ readmit ใน 28 วัน");
      if (!oneOf(value.admit3times, YES_NO_OPTIONS)) issue("admit3times", "กรุณาระบุจำนวนครั้งที่ Admit");
      if (value.admit3times === "ใช่" && (!/^\d+$/.test(value.admitNumber) || Number(value.admitNumber) < 1)) {
        issue("admitNumber", "กรุณาระบุจำนวนครั้ง Admit ที่ถูกต้อง");
      }
    }

    if (value.residenceType === "มีที่อยู่เป็นหลักแหล่ง") {
      if (!oneOf(value.residenceDistrict, RESIDENCE_DISTRICT_OPTIONS)) issue("residenceDistrict", "กรุณาเลือกเขตที่อยู่");
      if (value.residenceDistrict === "ในเขตอำเภอเมืองชลบุรี" && !oneOf(value.residenceSubdistrict, CITY_SUBDISTRICTS)) issue("residenceSubdistrict", "กรุณาเลือกตำบล");
      if (value.residenceDistrict === "นอกเขตอำเภอเมืองชลบุรี" && !oneOf(value.residenceOtherDistrict, OTHER_DISTRICTS)) issue("residenceOtherDistrict", "กรุณาเลือกอำเภอ");
      if (!value.residenceDetails) issue("residenceDetails", "กรุณากรอกรายละเอียดที่อยู่");
    }

    if (!oneOf(value.caregiverStatus, CAREGIVER_STATUS_OPTIONS)) issue("caregiverStatus", "กรุณาเลือกสถานภาพผู้ดูแล");
      if (value.caregiverStatus && value.caregiverStatus !== "อยู่คนเดียว") {
        if (!value.caregiverName) issue("caregiverName", "กรุณากรอกชื่อผู้ดูแล");
        if (!oneOf(value.caregiverRelation, CAREGIVER_RELATION_OPTIONS)) issue("caregiverRelation", "กรุณาเลือกความสัมพันธ์ผู้ดูแล");
        if (value.caregiverRelation === "อื่นๆ" && !value.caregiverRelationOther) issue("caregiverRelationOther", "กรุณาระบุความสัมพันธ์ผู้ดูแล");
        if (!value.caregiverPhone) issue("caregiverPhone", "กรุณากรอกเบอร์โทรศัพท์ผู้ดูแล");
      }
      if (value.diagnosis === "อื่นๆ" && !value.diagnosisOther) issue("diagnosisOther", "กรุณาระบุการวินิจฉัยอื่นๆ");
      if (!isISODateOnly(value.admissionDate)) {
        issue("admissionDate", "กรุณาเลือกวันที่เข้ารับการรักษา");
      }
  });

export type NewPatientFormValues = z.infer<typeof newPatientSchema>;

export const newPatientDefaultValues: NewPatientFormValues = {
  firstName: "", lastName: "", gender: "", age: "", hn: "", smiV: "", oasScore: "",
  aggressiveBehavior: "", substanceUse: "", substanceType: "", readmit28: "",
  admit3times: "", admitNumber: "", residenceType: "", residenceDistrict: "",
  residenceSubdistrict: "", residenceOtherDistrict: "", residenceDetails: "",
  caregiverStatus: "", caregiverName: "", caregiverRelation: "", caregiverRelationOther: "",
  caregiverPhone: "", patientPhone: "", diagnosis: "", diagnosisOther: "",
  admissionSource: "", admissionDate: "", admittingDoctor: "",
};

export function newPatientInputFromFormData(formData: FormData): Record<keyof NewPatientFormValues, string> {
  return Object.fromEntries(
    Object.keys(newPatientDefaultValues).map((key) => [key, String(formData.get(key) ?? "")]),
  ) as Record<keyof NewPatientFormValues, string>;
}
