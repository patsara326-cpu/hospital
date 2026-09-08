"use server";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { iorSchema } from "@/lib/validation/ior";
import type { Json } from "@/types/database.types";

export type IorPatient = {
  hn: string;
  prefix: string | null;
  full_name: string | null;
};

export type IorSearchState = {
  patient: IorPatient | null;
  error: string;
};

export type SaveIorState = {
  status: "error" | "success";
  message: string;
};

type SupabaseServerClient = NonNullable<
  Awaited<ReturnType<typeof createSupabaseServerClient>>
>;

function textValue(value: unknown): string {
  return typeof value === "string" || typeof value === "number" ? String(value) : "";
}

async function authorizedSupabase() {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return { supabase: null, error: "ยังไม่ได้ตั้งค่า Supabase environment variables" };
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return { supabase: null, error: "กรุณาเข้าสู่ระบบก่อนบันทึก IOR" };
  return { supabase, error: "" };
}

function toIorPatient(row: {
  hn: unknown;
  prefix: unknown;
  full_name: unknown;
}): IorPatient {
  return {
    hn: textValue(row.hn),
    prefix: textValue(row.prefix) || null,
    full_name: textValue(row.full_name) || null,
  };
}

async function findIorPatientByHn(
  supabase: SupabaseServerClient,
  hn: string,
): Promise<IorSearchState> {
  const { data: activeRows, error: activeError } = await supabase
    .from("patients")
    .select("hn, prefix, full_name")
    .eq("hn", hn)
    .limit(1);

  if (activeError) return { patient: null, error: activeError.message };
  if (activeRows?.[0]) {
    return { patient: toIorPatient(activeRows[0]), error: "" };
  }

  const { data: archivedRows, error: archivedError } = await supabase
    .from("backup")
    .select("hn, prefix, full_name")
    .eq("hn", hn)
    .order("discharge_date", { ascending: false, nullsFirst: false })
    .order("discharged_at", { ascending: false })
    .limit(1);

  if (archivedError) return { patient: null, error: archivedError.message };
  if (archivedRows?.[0]) {
    return { patient: toIorPatient(archivedRows[0]), error: "" };
  }

  return { patient: null, error: `ไม่พบผู้ป่วยรหัส HN: ${hn}` };
}

export async function searchIorPatientAction(formData: FormData): Promise<IorSearchState> {
  const hn = textValue(formData.get("hn")).trim();
  if (!hn) return { patient: null, error: "กรุณากรอกรหัส HN" };

  const { supabase, error: authError } = await authorizedSupabase();
  if (!supabase) return { patient: null, error: authError };

  return findIorPatientByHn(supabase, hn);
}

export async function saveIorRecordAction(formData: FormData): Promise<SaveIorState> {
  const hn = textValue(formData.get("hn")).trim();
  const recordDate = textValue(formData.get("recordDate")).trim();
  const level = textValue(formData.get("level")).trim();
  let behaviors: unknown;
  try {
    behaviors = JSON.parse(textValue(formData.get("behaviors")));
  } catch {
    return { status: "error", message: "ข้อมูลพฤติกรรมไม่ถูกต้อง" };
  }

  const parsed = iorSchema.safeParse({ hn, recordDate, behaviors, level });
  if (!parsed.success) return { status: "error", message: parsed.error.issues[0]?.message ?? "ข้อมูล IOR ไม่ถูกต้อง" };

  const { supabase, error: authError } = await authorizedSupabase();
  if (!supabase) return { status: "error", message: authError };
  const patientResult = await findIorPatientByHn(supabase, hn);
  if (!patientResult.patient) {
    return { status: "error", message: patientResult.error };
  }

  const { error } = await supabase.from("ior_records").insert({
    hn: parsed.data.hn,
    record_date: parsed.data.recordDate,
    behaviors: parsed.data.behaviors as Json,
    level: parsed.data.level,
  });
  if (error) return { status: "error", message: `เกิดข้อผิดพลาด: ${error.message}` };
  return { status: "success", message: "✅ บันทึกข้อมูลสำเร็จ" };
}
