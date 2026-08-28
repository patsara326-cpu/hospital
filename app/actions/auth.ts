"use server";

import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { loginSchema, registerSchema } from "@/lib/validation/auth";

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

function isMissingDatabaseFunction(error: { code?: string; message: string } | null): boolean {
  if (!error) return false;
  return error.code === "PGRST202"
    || error.message.toLowerCase().includes("schema cache")
    || error.message.toLowerCase().includes("could not find the function");
}

export async function loginAction(
  _previousState: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const parsed = loginSchema.safeParse({
    username: readText(formData, "username"),
    password: readValue(formData, "password"),
  });
  if (!parsed.success) {
    return {
      status: "error",
      message: parsed.error.issues[0]?.message ?? "ข้อมูลเข้าสู่ระบบไม่ถูกต้อง",
    };
  }
  const { username, password } = parsed.data;

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

  const { data: role, error: roleError } = await supabase.rpc("current_app_role");
  if (roleError) {
    await supabase.auth.signOut();
    return {
      status: "error",
      message: "ไม่สามารถตรวจสอบสิทธิ์ผู้ใช้งานได้ กรุณาติดต่อผู้ดูแลระบบ",
    };
  }
  if (role === "pending") {
    await supabase.auth.signOut();
    return {
      status: "error",
      message: "บัญชีผู้ใช้ยังไม่พร้อมใช้งาน กรุณาติดต่อผู้ดูแลระบบ",
    };
  }

  const { error: activityError } = await supabase.rpc("record_app_activity", {
    p_event_type: "auth.login",
    p_metadata: {},
  });
  if (activityError) {
    // Supabase Auth retains the authoritative authentication event. The app
    // activity mirror must not lock a valid user out when it is unavailable.
    console.error("Login activity mirror failed", activityError.code ?? "unknown");
  }

  redirect("/dashboard");
}

export async function registerAction(
  _previousState: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const parsed = registerSchema.safeParse({
    prefix: readText(formData, "prefix"),
    firstName: readText(formData, "firstName"),
    lastName: readText(formData, "lastName"),
    username: readText(formData, "username"),
    password: readValue(formData, "password"),
    confirmPassword: readValue(formData, "confirmPassword"),
  });
  if (!parsed.success) {
    return {
      status: "error",
      message: parsed.error.issues[0]?.message ?? "ข้อมูลสมัครสมาชิกไม่ถูกต้อง",
    };
  }
  const { prefix, firstName, lastName, username, password } = parsed.data;

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
    options: {
      data: {
        username,
        prefix,
        first_name: firstName,
        last_name: lastName,
      },
    },
  });

  if (authError) {
    return {
      status: "error",
      message: authErrorMessage(authError.message),
    };
  }

  // Hardened databases create the profile atomically from an auth.users trigger.
  // Keep the legacy insert only while the migration/RPC is not installed yet.
  const { error: roleFunctionError } = await supabase.rpc("current_app_role");
  if (!roleFunctionError || !isMissingDatabaseFunction(roleFunctionError)) {
    return {
      status: "success",
      message: "สมัครสมาชิกเรียบร้อยแล้ว กรุณาเข้าสู่ระบบ",
    };
  }

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
    const { error: activityError } = await supabase.rpc("record_app_activity", {
      p_event_type: "auth.logout",
      p_metadata: {},
    });
    if (activityError) {
      // Logging must never prevent a user from ending their session.
      console.error("Logout activity mirror failed", activityError.code ?? "unknown");
    }
    await supabase.auth.signOut();
  }

  redirect("/login");
}
