import { z } from "zod";

export const logFilterSchema = z.object({
  query: z.string().trim().max(100),
  source: z.enum(["", "activity", "audit"]),
  actorRole: z.enum(["", "pending", "clinician", "auditor", "admin"]),
  eventType: z.string().max(80),
});

export type LogFilterValues = z.infer<typeof logFilterSchema>;
