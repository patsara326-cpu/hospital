## Tasks ที่ยังเหลือ

### 1. เพิ่มการแสดงวันที่รับผู้ป่วยเป็น พ.ศ.

ของเดิมมี:

- ค่า ISO สำหรับบันทึกฐานข้อมูล
- ช่องแสดงวันที่แบบ พ.ศ. ให้ผู้ใช้เห็น
- ตั้งค่าเริ่มต้นเป็นวันที่ปัจจุบัน

ปัจจุบันมีเพียง <input type="date"> และไม่มีช่องแสดงวันที่แบบ พ.ศ.

ไฟล์ที่เกี่ยวข้อง: components/patients/NewPatientWizard.tsx

### 2. Generate และตรวจสอบ TypeScript types จาก Supabase จริง

ปัจจุบัน types/database.types.ts เป็น type ที่เขียนด้วยมือ ยังไม่ได้ generate จาก schema จริง

ต้องตรวจสอบให้ตรงกับตารางเดิม:

- users
- patients
- assessments
- backup
- ior_records

โดยเฉพาะ nullable fields, raw_data, และชนิดของ primary key

### 3. ย้ายการ join ข้อมูล IOR ไปเป็น View หรือ RPC

หน้า incident statistics ปัจจุบันยัง query ior_records แล้ว query patients แยกเอง เหมือน logic เดิม

Migration guide แนะนำให้ย้ายเป็น Supabase View/RPC เพื่อลด round-trip และทำให้ query มีประสิทธิภาพขึ้น

ไฟล์ปัจจุบัน: app/(main)/statistics/incidents/page.tsx

### 4. ตรวจสอบความปลอดภัยของ Supabase

ยังต้องทำ:

- ตรวจสอบ RLS ทุกตาราง
- กำหนดสิทธิ์ตามบทบาทผู้ใช้
- พิจารณา audit log
- Rotate anon key เดิมที่เคยอยู่ใน legacy code

### 5. ทำ authenticated end-to-end QA

ยังต้องทดสอบด้วย session จริงทุก flow:

- Login/logout
- ลงทะเบียนผู้ป่วย
- ประเมินรายเวร
- บันทึก IOR
- แก้ไข/จำหน่าย
- Export Excel
- Dashboard swipe
- ตรวจสอบ RLS และ Server Actions

### 6. งานโครงสร้างตาม Migration Guide

- พิจารณารวมหน้า statistics ที่ซ้ำกันเป็น reusable `StatisticsPage`
- ตรวจสอบการใช้ `next/font` ตาม migration guide
