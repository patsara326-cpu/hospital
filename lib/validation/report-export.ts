import { z } from "zod";

export const reportTypeSchema = z.enum([
  "admission",
  "discharge",
  "incidents",
]);

const clientReportFiltersSchema = z.object({
  gender: z.string().max(20).optional(),
  month: z.string().max(2).optional(),
  year: z.string().max(4).optional(),
  smi_filter: z.string().max(40).optional(),
  residence_filter: z.string().max(120).optional(),
}).strict();

export const reportFiltersSchema = z.object({
  gender: z.enum(["ชาย", "หญิง"]).or(z.literal("")).optional(),
  month: z.string().regex(/^(?:[1-9]|1[0-2])?$/).optional(),
  year: z.string().regex(/^(?:2[4-9]\d{2}|3000)?$/).optional(),
  smi_filter: z.enum(["SMI-V", "ไม่เข้าข่าย SMI-V"]).or(z.literal("")).optional(),
  residence_filter: z.enum([
    "นอกเขตอำเภอเมืองชลบุรี",
    "ในเขตอำเภอเมืองชลบุรี",
    "นอกจังหวัด",
    "เร่ร่อน",
  ]).or(z.literal("")).optional(),
}).strict();

const cellSchema = z.union([
  z.string().max(10_000),
  z.number().finite(),
  z.boolean(),
  z.null(),
]);

const reportMetadataSchema = z.object({
  reportType: reportTypeSchema,
  filename: z.string()
    .trim()
    .min(1)
    .max(180)
    .regex(/^[^\\/:*?"<>|]+\.xlsx$/i, "ชื่อไฟล์ Excel ไม่ถูกต้อง"),
  sheetName: z.string()
    .trim()
    .min(1)
    .max(31)
    .regex(/^[^\\/?*\[\]:]+$/, "ชื่อ worksheet ไม่ถูกต้อง"),
});

const clientReportExportSchema = reportMetadataSchema.extend({
  source: z.literal("client").optional(),
  headers: z.array(z.string().trim().min(1).max(200)).min(1).max(30),
  rows: z.array(z.array(cellSchema).max(30)).max(10_000),
  filters: clientReportFiltersSchema,
}).strict().superRefine((value, context) => {
  for (const [index, row] of value.rows.entries()) {
    if (row.length !== value.headers.length) {
      context.addIssue({
        code: "custom",
        path: ["rows", index],
        message: "จำนวนคอลัมน์ไม่ตรงกับหัวตาราง",
      });
    }
  }
});

const databaseReportExportSchema = reportMetadataSchema.extend({
  source: z.literal("database"),
  reportType: z.enum(["admission", "discharge", "incidents"]),
  filters: reportFiltersSchema,
}).strict();

export const reportExportSchema = z.union([
  clientReportExportSchema,
  databaseReportExportSchema,
]);

export type ReportExportRequest = z.infer<typeof reportExportSchema>;
export type ReportType = z.infer<typeof reportTypeSchema>;
