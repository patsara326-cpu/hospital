import { z } from "zod";

import { isISODateOnly } from "../utils/date.ts";

export const dischargeSchema = z.object({
  hn: z.string().trim().min(1, "กรุณาค้นหาและเลือกผู้ป่วย"),
  dischargeMethod: z.string().trim().min(1, "กรุณาเลือกวิธีการจำหน่าย"),
  transferOther: z.string().trim(),
  dischargeDate: z.string().refine(isISODateOnly, "กรุณาเลือกวันที่จำหน่ายให้ถูกต้อง"),
  lastDiagnosis: z.string().trim().min(1, "กรุณาระบุ Last diagnosis"),
  dischargeType: z.string().trim().min(1, "กรุณาเลือกข้อมูลการเยี่ยมบ้าน"),
});

export type DischargeFormValues = z.infer<typeof dischargeSchema>;

