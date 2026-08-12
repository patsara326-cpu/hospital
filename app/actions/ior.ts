"use server";

import { IOR_BEHAVIORS, IOR_LEVELS } from "@/lib/constants/ior";
import { createSupabaseServerClient } from "@/lib/supabase/server";
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

export async function searchIorPatientAction(formData: FormData): Promise<IorSearchState> {
  const hn = textValue(formData.get("hn")).trim();
  if (!hn) return { patient: null, error: "กรุณากรอกรหัส HN" };

  const { supabase, error: authError } = await authorizedSupabase();
  if (!supabase) return { patient: null, error: authError };

  const { data, error } = await supabase
    .from("patients")
    .select("hn, prefix, full_name")
    .eq("hn", hn)
    .limit(1);
  if (error) return { patient: null, error: error.message };
  const row = data?.[0];
  if (!row) return { patient: null, error: `ไม่พบผู้ป่วยรหัส HN: ${hn}` };

  return {
    patient: {
      hn: textValue(row.hn),
      prefix: textValue(row.prefix) || null,
      full_name: textValue(row.full_name) || null,
    },
    error: "",
  };
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

  const validBehaviors =
    Array.isArray(behaviors) &&
    behaviors.length > 0 &&
    behaviors.every((behavior) => typeof behavior === "string" && IOR_BEHAVIORS.includes(behavior as (typeof IOR_BEHAVIORS)[number]));
  if (!hn || !recordDate) return { status: "error", message: "กรุณาค้นหาผู้ป่วยและเลือกวันที่" };
  if (!validBehaviors) return { status: "error", message: "กรุณาเลือกพฤติกรรมรุนแรงอย่างน้อย 1 รายการ" };
  if (!IOR_LEVELS.includes(level as (typeof IOR_LEVELS)[number])) return { status: "error", message: "กรุณาเลือก Level" };

  const { supabase, error: authError } = await authorizedSupabase();
  if (!supabase) return { status: "error", message: authError };
  const { data: patient, error: patientError } = await supabase
    .from("patients")
    .select("hn")
    .eq("hn", hn)
    .limit(1);
  if (patientError) return { status: "error", message: patientError.message };
  if (!patient?.[0]) return { status: "error", message: `ไม่พบผู้ป่วยรหัส HN: ${hn}` };

  const { error } = await supabase.from("ior_records").insert({
    hn,
    record_date: recordDate,
    behaviors: behaviors as Json,
    level,
  });
  if (error) return { status: "error", message: `เกิดข้อผิดพลาด: ${error.message}` };
  return { status: "success", message: "✅ บันทึกข้อมูลสำเร็จ" };
}
