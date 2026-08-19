"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useState, useTransition } from "react";
import { useForm } from "react-hook-form";

import { registerAction, type AuthActionState } from "@/app/actions/auth";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { registerSchema, type RegisterFormValues } from "@/lib/validation/auth";

const initialState: AuthActionState = { status: "idle", message: "" };
const prefixes = ["นพ.", "พญ.", "พว.", "นาย", "นาง", "นางสาว"];
const selectClass = "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-xs outline-none focus-visible:ring-2 focus-visible:ring-ring";

export default function RegisterModal({ onClose }: { onClose: () => void }) {
  const [state, setState] = useState(initialState);
  const [pending, startTransition] = useTransition();
  const { register, handleSubmit, formState: { errors } } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: { prefix: "", firstName: "", lastName: "", username: "", password: "", confirmPassword: "" },
  });

  useEffect(() => {
    function closeOnEscape(event: KeyboardEvent) { if (event.key === "Escape") onClose(); }
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [onClose]);

  function submit(values: RegisterFormValues) {
    const formData = new FormData();
    for (const [key, value] of Object.entries(values)) formData.set(key, value);
    startTransition(async () => setState(await registerAction(initialState, formData)));
  }

  const fieldError = (name: keyof RegisterFormValues) => errors[name]
    ? <p className="mt-1 text-sm text-destructive">{errors[name]?.message}</p>
    : null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/60 px-4 py-8 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="register-title" onMouseDown={(event) => { if (event.currentTarget === event.target) onClose(); }}>
      <div className="max-h-full w-full max-w-lg overflow-y-auto rounded-3xl border bg-white p-6 shadow-2xl">
        <div className="mb-6 flex items-start justify-between gap-4">
          <div><p className="text-sm font-medium uppercase tracking-[0.18em] text-indigo-600">Psychiatric Care</p><h2 id="register-title" className="mt-1 text-2xl font-bold">สมัครสมาชิก</h2></div>
          <Button type="button" variant="ghost" size="icon" onClick={onClose} aria-label="ปิดหน้าต่างสมัครสมาชิก">×</Button>
        </div>
        <form onSubmit={handleSubmit(submit)} className="space-y-4" noValidate>
          <div><Label htmlFor="register-prefix">คำนำหน้าชื่อ</Label><select id="register-prefix" className={selectClass} aria-invalid={Boolean(errors.prefix)} {...register("prefix")}><option value="">-- เลือกคำนำหน้า --</option>{prefixes.map((prefix) => <option key={prefix}>{prefix}</option>)}</select>{fieldError("prefix")}</div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div><Label htmlFor="register-first-name">ชื่อ</Label><Input id="register-first-name" placeholder="ชื่อ" {...register("firstName")} />{fieldError("firstName")}</div>
            <div><Label htmlFor="register-last-name">นามสกุล</Label><Input id="register-last-name" placeholder="นามสกุล" {...register("lastName")} />{fieldError("lastName")}</div>
          </div>
          <div><Label htmlFor="register-username">Username</Label><Input id="register-username" autoComplete="username" placeholder="ใส่รหัส Ephis" {...register("username")} />{fieldError("username")}</div>
          <div><Label htmlFor="register-password">Password</Label><Input id="register-password" type="password" autoComplete="new-password" placeholder="รหัสผ่านอย่างน้อย 6 ตัวอักษร" {...register("password")} />{fieldError("password")}</div>
          <div><Label htmlFor="register-confirm-password">ยืนยัน Password</Label><Input id="register-confirm-password" type="password" autoComplete="new-password" placeholder="ยืนยันรหัสผ่าน" {...register("confirmPassword")} />{fieldError("confirmPassword")}</div>
          {state.status !== "idle" ? <Alert className={state.status === "error" ? "border-destructive/40 bg-destructive/10 text-destructive" : "border-emerald-200 bg-emerald-50 text-emerald-700"}><AlertDescription>{state.message}</AlertDescription></Alert> : null}
          <div className="flex gap-3 pt-2"><Button type="button" variant="outline" onClick={onClose} className="flex-1">ยกเลิก</Button><Button type="submit" disabled={pending} className="flex-1">{pending ? "กำลังบันทึก..." : "ยืนยันสมัครสมาชิก"}</Button></div>
        </form>
      </div>
    </div>
  );
}
