import { z } from "zod";

const requiredText = (message: string) => z.string().trim().min(1, message);

export const loginSchema = z.object({
  username: requiredText("กรุณากรอก Username"),
  password: z.string().min(1, "กรุณากรอก Password"),
});

export const registerSchema = z.object({
  prefix: requiredText("กรุณาเลือกคำนำหน้าชื่อ"),
  firstName: requiredText("กรุณากรอกชื่อ"),
  lastName: requiredText("กรุณากรอกนามสกุล"),
  username: requiredText("กรุณากรอก Username").regex(/^\S+$/, "Username ต้องไม่มีช่องว่าง"),
  password: z.string().min(6, "Password ต้องมีอย่างน้อย 6 ตัวอักษร"),
  confirmPassword: z.string().min(1, "กรุณายืนยัน Password"),
}).refine((value) => value.password === value.confirmPassword, {
  path: ["confirmPassword"],
  message: "รหัสผ่าน และ ยืนยันรหัสผ่าน ไม่ตรงกัน",
});

export type LoginFormValues = z.infer<typeof loginSchema>;
export type RegisterFormValues = z.infer<typeof registerSchema>;

