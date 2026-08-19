import { z } from "zod";

import { IOR_BEHAVIORS, IOR_LEVELS } from "../constants/ior.ts";
import { isISODateOnly } from "../utils/date.ts";

export const iorSchema = z.object({
  hn: z.string().trim().min(1, "กรุณาค้นหาและเลือกผู้ป่วย"),
  recordDate: z.string().refine(isISODateOnly, "กรุณาเลือกวันที่ให้ถูกต้อง"),
  behaviors: z.array(z.enum(IOR_BEHAVIORS)).min(1, "กรุณาเลือกพฤติกรรมรุนแรงอย่างน้อย 1 รายการ"),
  level: z.enum(IOR_LEVELS, { error: "กรุณาเลือก Level" }),
});

export type IorFormValues = z.infer<typeof iorSchema>;

