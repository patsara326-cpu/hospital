"use client";

import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const trimmedUsername = username.trim();
    if (!trimmedUsername || !password) {
      setSuccess("");
      setError("กรุณากรอก Username และ Password");
      return;
    }

    const supabase = createSupabaseBrowserClient();
    if (!supabase) {
      setSuccess("");
      setError("ยังไม่ได้ตั้งค่า Supabase environment variables");
      return;
    }

    setIsSubmitting(true);
    setError("");
    setSuccess("");

    const fakeEmail = `${trimmedUsername}@app.local`;
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: fakeEmail,
      password,
    });

    setIsSubmitting(false);

    if (signInError) {
      setError(
        "ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง หรือยังไม่ได้สมัครบัญชีในระบบ กรุณาสมัครสมาชิกก่อนเข้าสู่ระบบ",
      );
      return;
    }

    router.push("/");
    router.refresh();
  }

  async function handleRegister(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const trimmedUsername = username.trim();
    const trimmedFirstName = firstName.trim();
    const trimmedLastName = lastName.trim();

    if (
      !trimmedUsername ||
      !password ||
      !trimmedFirstName ||
      !trimmedLastName
    ) {
      setSuccess("");
      setError("กรุณากรอก Username, Password, ชื่อ, และนามสกุลให้ครบ");
      return;
    }

    const supabase = createSupabaseBrowserClient();
    if (!supabase) {
      setSuccess("");
      setError("ยังไม่ได้ตั้งค่า Supabase environment variables");
      return;
    }

    setIsSubmitting(true);
    setError("");
    setSuccess("");

    const fakeEmail = `${trimmedUsername}@app.local`;
    const { data: signUpData, error: signUpError } = await supabase.auth.signUp(
      {
        email: fakeEmail,
        password,
        options: {
          data: {
            first_name: trimmedFirstName,
            last_name: trimmedLastName,
            username: trimmedUsername,
          },
        },
      },
    );

    if (signUpError) {
      setIsSubmitting(false);
      setError(signUpError.message || "สมัครสมาชิกไม่สำเร็จ");
      return;
    }

    const userId = signUpData.user?.id;
    if (userId) {
      const { error: profileError } = await supabase.from("users").insert({
        username: trimmedUsername,
        first_name: trimmedFirstName,
        last_name: trimmedLastName,
        auth_user_id: userId,
      });

      if (profileError) {
        console.warn("User profile insert warning:", profileError.message);
      }
    }

    setIsSubmitting(false);
    setSuccess(
      "สมัครสมาชิกสำเร็จ กรุณาเข้าสู่ระบบด้วย Username และ Password เดียวกัน",
    );
    setIsRegistering(false);
    setPassword("");
    setFirstName("");
    setLastName("");
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top,_#e0f2fe,_#f8fafc_40%,_#eef2ff)] px-4 py-10">
      <div className="w-full max-w-md rounded-[22px] border border-slate-200 bg-white/90 p-8 shadow-[0_18px_40px_rgba(15,23,42,0.12)] backdrop-blur-sm">
        <div className="mb-8 text-center">
          <p className="text-sm font-medium uppercase tracking-[0.18em] text-indigo-600">
            Psychiatric Care
          </p>
          <h1 className="mt-2 text-3xl font-bold text-slate-800">
            {isRegistering ? "สมัครสมาชิก" : "เข้าสู่ระบบ"}
          </h1>
        </div>

        {isRegistering ? (
          <form onSubmit={handleRegister} className="space-y-5">
            <div>
              <label
                htmlFor="reg-username"
                className="mb-2 block text-sm font-semibold text-slate-700"
              >
                Username
              </label>
              <input
                id="reg-username"
                type="text"
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                placeholder="กรอก Username"
                className="legacy-input"
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label
                  htmlFor="first-name"
                  className="mb-2 block text-sm font-semibold text-slate-700"
                >
                  ชื่อ
                </label>
                <input
                  id="first-name"
                  type="text"
                  value={firstName}
                  onChange={(event) => setFirstName(event.target.value)}
                  placeholder="ชื่อ"
                  className="legacy-input"
                />
              </div>

              <div>
                <label
                  htmlFor="last-name"
                  className="mb-2 block text-sm font-semibold text-slate-700"
                >
                  นามสกุล
                </label>
                <input
                  id="last-name"
                  type="text"
                  value={lastName}
                  onChange={(event) => setLastName(event.target.value)}
                  placeholder="นามสกุล"
                  className="legacy-input"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="reg-password"
                className="mb-2 block text-sm font-semibold text-slate-700"
              >
                Password
              </label>
              <input
                id="reg-password"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="กรอก Password"
                className="legacy-input"
              />
            </div>

            {error ? (
              <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {error}
              </div>
            ) : null}

            {success ? (
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
                {success}
              </div>
            ) : null}

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => {
                  setIsRegistering(false);
                  setError("");
                  setSuccess("");
                }}
                className="legacy-button-secondary flex-1"
              >
                กลับ
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="legacy-button flex-1"
              >
                {isSubmitting ? "กำลังสมัคร..." : "ยืนยัน"}
              </button>
            </div>
          </form>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label
                htmlFor="username"
                className="mb-2 block text-sm font-semibold text-slate-700"
              >
                Username
              </label>
              <input
                id="username"
                type="text"
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                placeholder="กรอก Username"
                className="legacy-input"
              />
            </div>

            <div>
              <label
                htmlFor="password"
                className="mb-2 block text-sm font-semibold text-slate-700"
              >
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="กรอก Password"
                className="legacy-input"
              />
            </div>

            {error ? (
              <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {error}
              </div>
            ) : null}

            {success ? (
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
                {success}
              </div>
            ) : null}

            <button
              type="submit"
              disabled={isSubmitting}
              className="legacy-button w-full"
            >
              {isSubmitting ? "กำลังเข้าสู่ระบบ..." : "เข้าสู่ระบบ"}
            </button>
          </form>
        )}

        {!isRegistering ? (
          <div className="mt-6 text-center text-sm text-slate-600">
            ยังไม่มีบัญชี?{" "}
            <button
              type="button"
              onClick={() => {
                setIsRegistering(true);
                setError("");
                setSuccess("");
              }}
              className="font-semibold text-indigo-600 underline underline-offset-2"
            >
              สมัครสมาชิก
            </button>
          </div>
        ) : null}
      </div>
    </main>
  );
}
