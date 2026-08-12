"use server";

import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type AuthActionState = {
  status: "idle" | "error" | "success";
  message: string;
};

function readValue(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

function readText(formData: FormData, key: string) {
  return readValue(formData, key).trim();
}

function authErrorMessage(message: string) {
  if (message.toLowerCase().includes("invalid login credentials")) {
    return "Username หรือ Password ไม่ถูกต้อง";
  }

  if (
    message.toLowerCase().includes("already registered") ||
    message.toLowerCase().includes("duplicate key")
  ) {
    return "Username นี้มีผู้ใช้งานแล้ว";
  }

  return message;
}

export async function loginAction(
  _previousState: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const username = readText(formData, "username");
  const password = readValue(formData, "password");

  if (!username || !password) {
    return {
      status: "error",
      message: "กรุณากรอก Username และ Password",
    };
  }

  const supabase = await createSupabaseServerClient();
  if (!supabase) {
    return {
      status: "error",
      message: "ยังไม่ได้ตั้งค่า Supabase environment variables",
    };
  }

  const { error } = await supabase.auth.signInWithPassword({
    email: `${username}@app.local`,
    password,
  });

  if (error) {
    return { status: "error", message: authErrorMessage(error.message) };
  }

  redirect("/dashboard");
}

export async function registerAction(
  _previousState: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const prefix = readText(formData, "prefix");
  const firstName = readText(formData, "firstName");
  const lastName = readText(formData, "lastName");
  const username = readText(formData, "username");
  const password = readValue(formData, "password");
  const confirmPassword = readValue(formData, "confirmPassword");

  if (
    !prefix ||
    !firstName ||
    !lastName ||
    !username ||
    !password ||
    !confirmPassword
  ) {
    return { status: "error", message: "กรุณากรอกข้อมูลให้ครบทุกช่อง" };
  }

  if (password !== confirmPassword) {
    return {
      status: "error",
      message: "รหัสผ่าน และ ยืนยันรหัสผ่าน ไม่ตรงกัน",
    };
  }

  const supabase = await createSupabaseServerClient();
  if (!supabase) {
    return {
      status: "error",
      message: "ยังไม่ได้ตั้งค่า Supabase environment variables",
    };
  }

  const { error: authError } = await supabase.auth.signUp({
    email: `${username}@app.local`,
    password,
  });

  if (authError) {
    return {
      status: "error",
      message: authErrorMessage(authError.message),
    };
  }

  // Keep the legacy users schema: prefix, first_name, last_name, username.
  const { error: profileError } = await supabase.from("users").insert({
    username,
    prefix,
    first_name: firstName,
    last_name: lastName,
  });

  if (profileError) {
    return {
      status: "error",
      message: authErrorMessage(profileError.message),
    };
  }

  return {
    status: "success",
    message: "สมัครสมาชิกเรียบร้อยแล้ว กรุณาเข้าสู่ระบบ",
  };
}

export async function logoutAction() {
  const supabase = await createSupabaseServerClient();
  if (supabase) {
    await supabase.auth.signOut();
  }

  redirect("/login");
}
