"use server";

import { createSupabaseServerClient } from "@/lib/supabase/server";

export type BackupPatient = {
  hn: string;
  full_name: string | null;
  age: number | null;
  gender: string | null;
  admit_date: string | null;
  raw_data: Record<string, unknown> | null;
};

export type BackupHistoryRow = {
  admit_date: string | null;
  discharge_date: string | null;
  last_diagnosis: string | null;
};

export type HistoryState = {
  searchedHn: string;
  patient: BackupPatient | null;
  history: BackupHistoryRow[];
  error: string | null;
};

export const initialHistoryState: HistoryState = {
  searchedHn: "",
  patient: null,
  history: [],
  error: null,
};

async function getAuthorizedSupabase() {
  const supabase = await createSupabaseServerClient();
  if (!supabase) {
    return {
      supabase: null,
      error: "ยังไม่ได้ตั้งค่า Supabase environment variables",
    };
  }

  const { data } = await supabase.auth.getUser();
  if (!data.user) {
    return {
      supabase: null,
      error: "กรุณาเข้าสู่ระบบก่อนดูประวัติผู้ป่วย",
    };
  }

  return { supabase, error: "" };
}

export async function searchBackupHistory(
  _previousState: HistoryState,
  formData: FormData,
): Promise<HistoryState> {
  const hn = String(formData.get("hn") ?? "").trim();
  if (!hn) {
    return {
      ...initialHistoryState,
      error: "กรุณากรอก HN",
    };
  }

  const { supabase, error: accessError } = await getAuthorizedSupabase();
  if (!supabase) {
    return {
      ...initialHistoryState,
      searchedHn: hn,
      error: accessError,
    };
  }

  const { data: patientRows, error: patientError } = await supabase
    .from("backup")
    .select("hn, full_name, gender, age, admit_date, raw_data")
    .eq("hn", hn)
    .order("admit_date", { ascending: false })
    .limit(1);

  if (patientError) {
    console.error("Backup patient lookup failed", patientError);
    return {
      ...initialHistoryState,
      searchedHn: hn,
      error: patientError.message,
    };
  }

  const patient = (patientRows?.[0] as BackupPatient | undefined) ?? null;
  if (!patient) {
    return {
      ...initialHistoryState,
      searchedHn: hn,
      error: `ไม่พบข้อมูลสำรองสำหรับ HN: ${hn}`,
    };
  }

  const { data: historyRows, error: historyError } = await supabase
    .from("backup")
    .select("admit_date, discharge_date, last_diagnosis")
    .eq("hn", hn)
    .order("admit_date", { ascending: false });

  if (historyError) {
    console.error("Backup history lookup failed", historyError);
    return {
      searchedHn: hn,
      patient,
      history: [],
      error: historyError.message,
    };
  }

  return {
    searchedHn: hn,
    patient,
    history: (historyRows ?? []) as BackupHistoryRow[],
    error: null,
  };
}
