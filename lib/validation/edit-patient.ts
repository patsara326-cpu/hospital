import { z } from "zod";

import { isISODateOnly } from "../utils/date.ts";

const optionalText = z.string().trim();

export const editPatientSchema = z.object({
  hn: z.string().trim().min(1, "HN ไม่ถูกต้อง"),
  prefix: optionalText,
  first_name: optionalText,
  last_name: optionalText,
  full_name: optionalText,
  gender: optionalText.refine((value): boolean => !value || value === "ชาย" || value === "หญิง", "เพศไม่ถูกต้อง"),
  age: optionalText.refine((value) => !value || (/^\d+$/.test(value) && Number(value) <= 150), "อายุต้องอยู่ระหว่าง 0–150 ปี"),
  is_smi_v: z.boolean(),
  diagnosis: optionalText,
  smi_v_result: optionalText,
  smi_type: optionalText,
  substance_use: optionalText,
  substance_type: optionalText,
  patient_phone: optionalText,
  admission_date: optionalText.refine((value) => !value || isISODateOnly(value), "วันที่รับไม่ถูกต้อง"),
  admitting_doctor: optionalText,
  caregiver_name: optionalText,
  caregiver_relation: optionalText,
  caregiver_phone: optionalText,
  admission_source: optionalText,
  residence_type: optionalText,
  residence_details: optionalText,
  residence_district: optionalText,
  residence_subdistrict: optionalText,
  aggressive_behavior: optionalText,
  oas_score: optionalText.refine((value) => !value || [0, 1, 2, 3].includes(Number(value)), "OAS ต้องอยู่ระหว่าง 0–3"),
  oas_risk_level: optionalText,
});

export type EditPatientFormValues = z.infer<typeof editPatientSchema>;
