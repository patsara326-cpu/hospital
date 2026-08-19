import { z } from "zod";

import { isISODateOnly } from "../utils/date.ts";

const score = z.number().refine((value) => [1, 3, 5, 7].includes(value), "คะแนนไม่ถูกต้อง").nullable();

export const assessmentSchema = z.object({
  hn: z.string().trim().min(1, "กรุณาเลือกผู้ป่วย"),
  assessDate: z.string().refine(isISODateOnly, "กรุณาเลือกวันที่ประเมินให้ถูกต้อง"),
  shift: z.string().refine((value) => ["เวรดึก", "เวรเช้า", "เวรบ่าย"].includes(value), "กรุณาเลือกเวร"),
  oasScore: z.string().refine((value) => ["0", "1", "2", "3"].includes(value), "กรุณาเลือก OAS"),
  phuaScores: z.array(score).length(4, "กรุณาประเมิน PHUA ให้ครบ").refine((scores): boolean => scores.every((value) => value !== null), "กรุณาประเมิน PHUA ให้ครบ"),
  ghardScores: z.array(score).length(5, "กรุณาประเมิน G-HARD ให้ครบ").refine((scores): boolean => scores.every((value) => value !== null), "กรุณาประเมิน G-HARD ให้ครบ"),
});

export type AssessmentFormValues = z.infer<typeof assessmentSchema>;
