import { z } from "zod";

import { NON_SMIV_VALUE } from "../constants/admission.ts";
import { isISODateOnly } from "../utils/date.ts";

const text = z.string().trim();

export const newPatientSchema = z
  .object({
    firstName: text.min(1, "กรุณากรอกชื่อผู้ป่วย"),
    lastName: text.min(1, "กรุณากรอกนามสกุลผู้ป่วย"),
    gender: text.refine((value): boolean => value === "ชาย" || value === "หญิง", "กรุณาเลือกเพศ"),
    age: text
      .regex(/^\d+$/, "อายุต้องเป็นตัวเลขจำนวนเต็ม")
      .refine((value) => Number(value) >= 0 && Number(value) <= 150, "อายุต้องอยู่ระหว่าง 0–150 ปี"),
    hn: text.min(1, "กรุณากรอก HN"),
    smiV: text.min(1, "กรุณาเลือกผลการประเมิน SMI-V"),
    oasScore: text,
    aggressiveBehavior: text,
    substanceUse: text,
    substanceType: text,
    readmit28: text,
    admit3times: text,
    admitNumber: text,
    residenceType: text.min(1, "กรุณาเลือกสถานภาพที่อยู่"),
    residenceDistrict: text,
    residenceSubdistrict: text,
    residenceOtherDistrict: text,
    residenceDetails: text,
    caregiverStatus: text,
    caregiverName: text,
    caregiverRelation: text,
    caregiverRelationOther: text,
    caregiverPhone: text,
    patientPhone: text,
    diagnosis: text,
    diagnosisOther: text,
    admissionSource: text,
    admissionDate: text,
    admittingDoctor: text,
  })
  .superRefine((value, context) => {
    const issue = (path: keyof typeof value, message: string) =>
      context.addIssue({ code: "custom", path: [path], message });

    if (value.smiV !== NON_SMIV_VALUE) {
      if (!["1", "2", "3"].includes(value.oasScore)) issue("oasScore", "กรุณาเลือกคะแนน OAS");
      if (!value.aggressiveBehavior) issue("aggressiveBehavior", "กรุณาระบุพฤติกรรมรุนแรงที่นำส่ง");
      if (!["ใช้", "ไม่ใช้"].includes(value.substanceUse)) issue("substanceUse", "กรุณาระบุการใช้สารเสพติด/สุรา");
      if (value.substanceUse === "ใช้" && !value.substanceType) issue("substanceType", "กรุณาระบุประเภทสารเสพติด/สุรา");
      if (!["ใช่", "ไม่ใช่"].includes(value.readmit28)) issue("readmit28", "กรุณาระบุการ readmit ใน 28 วัน");
      if (!["ใช่", "ไม่ใช่"].includes(value.admit3times)) issue("admit3times", "กรุณาระบุจำนวนครั้งที่ Admit");
      if (value.admit3times === "ใช่" && (!/^\d+$/.test(value.admitNumber) || Number(value.admitNumber) < 1)) {
        issue("admitNumber", "กรุณาระบุจำนวนครั้ง Admit ที่ถูกต้อง");
      }
    }

    if (value.residenceType === "มีที่อยู่เป็นหลักแหล่ง") {
      if (!value.residenceDistrict) issue("residenceDistrict", "กรุณาเลือกเขตที่อยู่");
      if (value.residenceDistrict === "ในเขตอำเภอเมืองชลบุรี" && !value.residenceSubdistrict) issue("residenceSubdistrict", "กรุณาเลือกตำบล");
      if (value.residenceDistrict === "นอกเขตอำเภอเมืองชลบุรี" && !value.residenceOtherDistrict) issue("residenceOtherDistrict", "กรุณาเลือกอำเภอ");
      if (!value.residenceDetails) issue("residenceDetails", "กรุณากรอกรายละเอียดที่อยู่");
    }

    if (!value.caregiverStatus) issue("caregiverStatus", "กรุณาเลือกสถานภาพผู้ดูแล");
      if (value.caregiverStatus === "อยู่คนเดียว") {
        if (!value.patientPhone) issue("patientPhone", "กรุณากรอกเบอร์โทรศัพท์ผู้ป่วย");
      } else if (value.caregiverStatus) {
        if (!value.caregiverName) issue("caregiverName", "กรุณากรอกชื่อผู้ดูแล");
        if (!value.caregiverRelation) issue("caregiverRelation", "กรุณาเลือกความสัมพันธ์ผู้ดูแล");
        if (value.caregiverRelation === "อื่นๆ" && !value.caregiverRelationOther) issue("caregiverRelationOther", "กรุณาระบุความสัมพันธ์ผู้ดูแล");
        if (!value.caregiverPhone) issue("caregiverPhone", "กรุณากรอกเบอร์โทรศัพท์ผู้ดูแล");
      }
      if (!value.diagnosis) issue("diagnosis", "กรุณาเลือกการวินิจฉัยโรคแรกรับ");
      if (value.diagnosis === "อื่นๆ" && !value.diagnosisOther) issue("diagnosisOther", "กรุณาระบุการวินิจฉัยอื่นๆ");
      if (!value.admissionSource) issue("admissionSource", "กรุณาเลือกวิธีการรับผู้ป่วย");
      if (!isISODateOnly(value.admissionDate)) {
        issue("admissionDate", "กรุณาเลือกวันที่เข้ารับการรักษา");
      }
      if (!value.admittingDoctor) issue("admittingDoctor", "กรุณาเลือกนายแพทย์ผู้รับ");
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
