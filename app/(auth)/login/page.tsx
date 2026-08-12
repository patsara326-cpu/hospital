"use client";

import LoginForm from "@/components/auth/LoginForm";
import RegisterModal from "@/components/auth/RegisterModal";
import { useState } from "react";

export default function LoginPage() {
  const [isRegistering, setIsRegistering] = useState(false);

  return (
    <main className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top,_#e0f2fe,_#f8fafc_40%,_#eef2ff)] px-4 py-10">
      <div className="w-full max-w-md rounded-[22px] border border-slate-200 bg-white/90 p-8 shadow-[0_18px_40px_rgba(15,23,42,0.12)] backdrop-blur-sm">
        <div className="mb-8 text-center">
          <p className="text-sm font-medium uppercase tracking-[0.18em] text-indigo-600">
            Psychiatric Care
          </p>
          <h1 className="mt-2 text-3xl font-bold text-slate-800">เข้าสู่ระบบ</h1>
        </div>

        <LoginForm />

        <div className="mt-6 text-center text-sm text-slate-600">
          ยังไม่มีบัญชี?{" "}
          <button
            type="button"
            onClick={() => setIsRegistering(true)}
            className="font-semibold text-indigo-600 underline underline-offset-2"
          >
            สมัครสมาชิก
          </button>
        </div>
      </div>

      {isRegistering ? (
        <RegisterModal onClose={() => setIsRegistering(false)} />
      ) : null}
    </main>
  );
}
