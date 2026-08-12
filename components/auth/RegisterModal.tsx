"use client";

import {
  registerAction,
  type AuthActionState,
} from "@/app/actions/auth";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";

const initialState: AuthActionState = { status: "idle", message: "" };

const prefixes = ["นพ.", "พญ.", "พว.", "นาย", "นาง", "นางสาว"];

function RegisterSubmitButton() {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="legacy-button flex-1"
    >
      {pending ? "กำลังบันทึก..." : "ยืนยันสมัครสมาชิก"}
    </button>
  );
}

export default function RegisterModal({
  onClose,
}: {
  onClose: () => void;
}) {
  const [state, formAction] = useActionState(registerAction, initialState);

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/60 px-4 py-8 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="register-title"
      onMouseDown={(event) => {
        if (event.currentTarget === event.target) onClose();
      }}
    >
      <div className="w-full max-w-lg rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl">
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-medium uppercase tracking-[0.18em] text-indigo-600">
              Psychiatric Care
            </p>
            <h2 id="register-title" className="mt-1 text-2xl font-bold text-slate-800">
              สมัครสมาชิก
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-2 py-1 text-xl text-slate-500 transition hover:bg-slate-100 hover:text-slate-800"
            aria-label="ปิดหน้าต่างสมัครสมาชิก"
          >
            ×
          </button>
        </div>

        <form action={formAction} className="space-y-4">
          <label className="block text-sm font-semibold text-slate-700">
            คำนำหน้าชื่อ
            <select name="prefix" defaultValue="" required className="legacy-input">
              <option value="">-- เลือกคำนำหน้า --</option>
              {prefixes.map((prefix) => (
                <option key={prefix} value={prefix}>
                  {prefix}
                </option>
              ))}
            </select>
          </label>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block text-sm font-semibold text-slate-700">
              ชื่อ
              <input name="firstName" required className="legacy-input" placeholder="ชื่อ" />
            </label>
            <label className="block text-sm font-semibold text-slate-700">
              นามสกุล
              <input name="lastName" required className="legacy-input" placeholder="นามสกุล" />
            </label>
          </div>

          <label className="block text-sm font-semibold text-slate-700">
            Username
            <input name="username" required className="legacy-input" placeholder="ใส่รหัส Ephis" />
          </label>

          <label className="block text-sm font-semibold text-slate-700">
            Password
            <input
              name="password"
              type="password"
              autoComplete="new-password"
              required
              className="legacy-input"
              placeholder="รหัสผ่าน"
            />
          </label>

          <label className="block text-sm font-semibold text-slate-700">
            ยืนยัน Password
            <input
              name="confirmPassword"
              type="password"
              autoComplete="new-password"
              required
              className="legacy-input"
              placeholder="ยืนยันรหัสผ่าน"
            />
          </label>

          {state.status !== "idle" ? (
            <div
              aria-live="polite"
              className={`rounded-xl border px-3 py-2 text-sm ${
                state.status === "error"
                  ? "border-red-200 bg-red-50 text-red-700"
                  : "border-emerald-200 bg-emerald-50 text-emerald-700"
              }`}
            >
              {state.message}
            </div>
          ) : null}

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="legacy-button-secondary flex-1"
            >
              ยกเลิก
            </button>
            <RegisterSubmitButton />
          </div>
        </form>
      </div>
    </div>
  );
}
