# Performance Tasks

เอกสารนี้สรุปงานปรับความเร็วของ Next.js และ Supabase โดยมีเงื่อนไขหลักว่า ผลลัพธ์ทางคลินิก สิทธิ์การเข้าถึง และรูปแบบรายงานต้องเหมือน logic เดิม

> สถานะ rollout ณ 28 สิงหาคม 2026: migrations `20260823000700`–`20260828001200` apply ไปทั้ง **staging และ production แล้ว**; staging ผ่าน field parity, synthetic volume/EXPLAIN, role matrix และ browser lifecycle/export test ส่วน production ตรวจ migration history `001`–`012`, post-push dry-run และ read-only schema check ผ่านทั้งหมด

## P0 — read-optimized PostgreSQL views

- [x] เตรียม `security_invoker` view `admission_statistics_rows` ที่คืนเฉพาะฟิลด์รายงานและกรอง gender ผ่าน PostgREST โดยไม่ส่ง `raw_data` ทั้งก้อน
- [x] เตรียม `security_invoker` view `discharge_statistics_rows` ที่ flatten ฟิลด์ legacy ที่หน้าใช้
- [x] เตรียม `security_invoker` view `current_ipd_rows` ที่หา admission assessment ล่าสุดใน SQL ด้วยลำดับ `assess_date DESC NULLS LAST, created_at DESC, id DESC`
- [x] ให้ `current_ipd_rows` ส่ง `extra_data` เฉพาะ legacy keys ที่ไม่อยู่ใน read model แทน raw JSON ทั้งก้อน
- [x] เตรียม `security_invoker` view `dashboard_patient_groups` ที่คืน grouped counts แทนผู้ป่วยทุกแถว
- [x] เปลี่ยน Next.js read paths ให้ใช้ views และ fallback ไป query เดิมเฉพาะกรณี migration/view ยังไม่มี
- [x] เพิ่ม performance harness สำหรับวัด payload/latency ของ current query เทียบ optimized views
- [x] คืน `phase5.e2e.env.example` เป็น placeholder ไม่มี staging `service_role` key จริง
- [x] ย้าย `.env` ออกจาก Git index โดยยังเก็บ local environment ไว้ และ sanitize tracked env template
- [ ] Rotate staging/production credential ที่เคยอยู่ใน tracked files แล้วอัปเดต secret store ของ deployment ที่ใช้งาน — **เว้นไว้ตามคำสั่งผู้ใช้**
- [ ] ย้าย hardcoded legacy anon key ใน `ref/script.js` ออก — **เว้นไว้ตามคำสั่งผู้ใช้**
- [x] Apply migrations `007`–`009` ไป staging และ production ตามลำดับ และยืนยัน migration history `001–009`
- [x] Apply migration `012` สำหรับ dashboard snapshot RPC ไป staging และ production และยืนยัน post-push dry-run เป็น `upToDate: true`
- [x] รัน staging security role matrix ครบ 4 roles และ browser lifecycle/export test ของ read views
- [x] ทำ field-by-field comparison กับ legacy projection บนชุดข้อมูล edge cases: assessment ซ้ำ, วันที่ผิดรูปแบบ, structured fallback, null date และ พ.ศ./ค.ศ.
- [x] เก็บ baseline ด้วย synthetic dataset 7,500 แถวใน transaction และตรวจ `EXPLAIN (ANALYZE, BUFFERS)`; transaction ถูก rollback หลังทดสอบ

## สถานะการวัดปัจจุบัน

- Production build ของหน้า `/login` บนเครื่อง local: warm TTFB ประมาณ 6–8 ms, cold TTFB ประมาณ 118 ms
- HTML ประมาณ 12.9 KB และ static assets หลังบีบอัดประมาณ 329 KB
- Supabase staging environment validation: ผ่าน
- Supabase staging security role matrix: ผ่านสำหรับ `pending`, `clinician`, `auditor` และ `admin`
- Supabase staging network check หลัง migration 009 (ข้อมูล 0 แถว): auth sign-in 162.9 ms, profile 85.4 ms และ optimized views 50.6–67.2 ms
- Synthetic report parity 7,500 แถว: pagination 100 แถวไม่ซ้ำ, full filtered export 7,501 แถว และ admission view หน้าแรก 50 แถวใช้ 63.88 ms ใน transaction
- Authenticated browser lifecycle บน local app ที่ชี้ staging: filter ด้วย URL/server query, admission/discharge export, discharge workflow และ history ผ่านครบ 1/1; synthetic HN ถูก cleanup แล้ว
- Supabase production: migrations `001`–`012` ตรงกัน, dry-run หลัง rollout เป็น `upToDate: true`, read-only report schema check ผ่าน
- Lighthouse `/login`: Performance 87, Accessibility 100, Best Practices 100, SEO 91, FCP 0.8 s, LCP 3.27 s, TBT 263 ms, CLS 0
- Local production load baseline: concurrency 10, 336.9 requests/s, p95 49.0 ms, error 0
- ยังไม่มี Chrome DevTools MCP ใน session จึงยังไม่มี Core Web Vitals และ network trace ของเส้นทาง authenticated
- ต้องวัดซ้ำบน staging deployment และใช้ข้อมูลสังเคราะห์ที่มีปริมาณใกล้ production

## คำสั่งวัดที่เพิ่มแล้ว

```powershell
$env:E2E_ENV_FILE='phase5.e2e.env.local'
npm.cmd run perf:supabase

$env:PERF_TARGET_URL='http://127.0.0.1:3100/login'
npm.cmd run perf:lighthouse

$env:PERF_TARGET_URL='http://127.0.0.1:3100/login'
$env:PERF_CONCURRENCY='10'
$env:PERF_DURATION_SECONDS='10'
npm.cmd run perf:load
```

การ load test URL ที่ไม่ใช่ localhost ต้องกำหนด `PERF_ALLOW_REMOTE=staging-only` และ `PERF_STAGING_ORIGIN` ให้ตรงกับ origin ของ staging เท่านั้น ถ้ามี production deployment ให้กำหนด `PERF_PRODUCTION_ORIGIN` เป็น denylist เพิ่มด้วย

## P0 — ติดตั้งการวัดก่อนแก้ query

- [x] เพิ่ม OpenTelemetry spans รอบ auth, profile lookup และ Supabase queries ที่สำคัญ
- [x] เก็บเวลาแยกเป็น Next.js render, Supabase request, row count และ response size โดยห้าม log PHI
- [ ] ใช้ Supabase Query Performance/`pg_stat_statements` หา query ที่มี `mean_exec_time`, `max_exec_time` หรือ `total_exec_time` สูง
- [x] เก็บ `EXPLAIN (ANALYZE, BUFFERS)` ของ legacy admission query และ server-filtered admission view บน staging ด้วยข้อมูลสังเคราะห์
- [ ] เก็บ Lighthouse report ของ `/login` และเส้นทางหลักที่ login แล้ว
- [ ] ทำ load test บน staging เท่านั้น ห้ามยิง production และห้ามใช้ข้อมูลผู้ป่วยจริง

เกณฑ์ผ่าน:

- มี baseline ก่อนแก้และผลหลังแก้สำหรับทุก query ที่เปลี่ยน
- trace และ test report ไม่มีชื่อ, HN, raw clinical data, token หรือ credential

## P1 — ลดข้อมูลที่ดึงจาก Supabase

### Admission statistics

- [x] ย้าย projection และการกรอง `gender` ไปใช้ `security_invoker` view
- [x] ย้ายการกรองเดือน/ปี, SMI-V และที่อยู่ไป PostgreSQL/PostgREST พร้อม server-side pagination และ exact total
- [x] หยุดดึง `raw_data` ทุกแถวใน optimized path
- [x] รองรับข้อมูล legacy ด้วย structured column ก่อน และ fallback ไป `raw_data` ภายใน view

ความเสี่ยงต่อ logic: ปานกลาง

ต้องยืนยันค่า `null`, รูปแบบวันที่เก่า, เขตเวลา Asia/Bangkok, พ.ศ./ค.ศ. และจำนวนรวมว่าเท่ากับ implementation เดิม

### IPD และ assessment ล่าสุด

- [x] เปลี่ยน optimized path จาก `.select("*")` เป็นรายชื่อคอลัมน์ที่หน้าใช้จริง
- [x] หา assessment ล่าสุดใน SQL ด้วย lateral query/read view
- [x] รักษาลำดับ `assess_date DESC NULLS LAST, created_at DESC, id DESC`
- [ ] กำหนดพฤติกรรมของ `assess_date IS NULL`, assessment วันเดียวกันหลายรายการ และผู้ป่วยที่จำหน่ายแล้วรับใหม่

ความเสี่ยงต่อ logic: ปานกลาง

### Dashboard

- [x] สร้างและใช้งาน view ที่คืน `COUNT`/`GROUP BY` แทนการดึงผู้ป่วยทุกแถวมาคำนวณใน Next.js
- [x] รวม patient groups และ monthly trends เป็น `get_dashboard_snapshot()` RPC หนึ่งรอบ พร้อม fallback ระหว่าง rollout
- [ ] เปรียบเทียบยอดแยกเพศ, SMI type, OAS score และแพทย์ผู้รับผิดชอบกับ logic เดิม

ความเสี่ยงต่อ logic: ปานกลาง

## P1 — Pagination และ export

- [x] ทำ server-side pagination สำหรับ IPD และ incidents (admission/discharge statistics เสร็จแล้ว)
- [x] ให้ admission/discharge filter ทำงานกับข้อมูลทั้งหมด ไม่ใช่เฉพาะหน้าปัจจุบัน
- [x] ให้ยอด admission/discharge คำนวณจากข้อมูลทั้งหมดตาม filter ด้วย exact count
- [x] ให้ admission/discharge export query ข้อมูลทั้งหมดตาม filter จาก server ไม่ใช่ export เฉพาะหน้าที่เปิดอยู่

ความเสี่ยงต่อ logic/UX: ปานกลาง

## P1 — ลด Auth round trips

- [x] ใช้ `getClaims()` ใน proxy สำหรับ optimistic identity check และคง `getUser()` ใน main layout เพื่อรับสถานะบัญชีล่าสุด
- [x] รวม auth/profile lookup ใน server-only DAL และ deduplicate ภายใน request
- [x] ให้ RLS/RPC เป็นตัวบังคับ authorization ขั้นสุดท้ายเหมือนเดิม
- [ ] ทดสอบ session หมดอายุ, logout, user ถูกปิดใช้งาน และทุก application role

ความเสี่ยงต่อ clinical logic: ต่ำ

## P1 — ปรับ RLS performance

- [x] เตรียม migration เปลี่ยน `public.current_app_role()` เป็น `(select public.current_app_role())` เพื่อประเมินครั้งเดียวต่อ statement
- [x] เตรียม migration ปรับ `auth.uid()` เป็น `(select auth.uid())` ใน policy ที่เหมาะสม
- [x] Apply migration ไป staging และ production แล้ว; staging security role matrix ผ่านครบ 4 roles

ความเสี่ยงต่อ logic/authorization: ต่ำ ถ้า role matrix ผ่านครบ

## P2 — Indexes

ตรวจด้วย Query Performance, `EXPLAIN` และ Index Advisor ก่อนเพิ่ม:

- [x] เพิ่ม `patients (gender, created_at DESC)` ใน migration
- [x] เพิ่ม partial index `backup (gender, discharge_date DESC)` สำหรับแถวที่มี discharge date ใน migration
- [x] เพิ่ม `assessments (hn, record_type, assess_date DESC, created_at DESC)` ใน migration
- [x] Apply indexes ไป staging และ production
- [x] ตรวจ `EXPLAIN (ANALYZE, BUFFERS)` สำหรับ admission report ด้วยข้อมูลสังเคราะห์ 7,500 แถว
- [ ] ตรวจ index สำหรับ filter/search ของ admin logs เมื่อข้อมูลโต
- [ ] ตรวจ unused/duplicate indexes หลังใช้งานจริง

ความเสี่ยงต่อ logic: ต่ำมาก แต่เพิ่ม write/storage cost จึงต้องยืนยันว่า query planner ใช้งานจริง

## P2 — Frontend และ perceived performance

- [x] เพิ่ม route `loading.tsx`/Suspense สำหรับหน้าที่รอข้อมูลหลายชุด
- [x] แยก dashboard cards/กราฟเป็น Server Components และ hydrate เฉพาะ pager/export controls
- [x] prefetch หน้ารายงาน/IPD เมื่อ hover หรือ focus เพื่อใช้ browser Router Cache โดยไม่ใช้ shared cache
- [x] ทดลอง lazy-load `RegisterModal` และย้อนการเปลี่ยนแปลง เพราะ unused JS ไม่ลดและ Lighthouse ไม่ดีขึ้น
- [x] วัด Lighthouse ก่อนและหลังการทดลอง

ความเสี่ยงต่อ data logic: ต่ำมาก

## สิ่งที่ยังไม่ควรทำ

- ห้ามใช้ shared/public cache กับข้อมูลผู้ป่วยหรือผล query ที่ขึ้นกับ role
- ห้ามทำให้ข้อมูลคลินิกค้างเพื่อแลกกับความเร็ว
- ห้ามลบ `raw_data` หรือ compatibility path ก่อน migration และ comparison tests ผ่าน
- ห้ามเพิ่ม index จำนวนมากโดยไม่มี query plan รองรับ
- ห้าม load test production

## Regression checklist

- [x] Existing domain tests ผ่าน (28 tests, local, 28 สิงหาคม 2026)
- [x] Security role matrix ผ่านครบ 4 roles บน staging หลัง migration
- [x] Browser smoke test ยืนยัน HN สังเคราะห์จาก views ใน IPD, Assessment, Admission และ Discharge โดยไม่พบ console/page/request error
- [x] ผล legacy projection และ view ใหม่เท่ากันแบบ field-by-field โดยไม่บันทึก PHI ลง log
- [x] ทดสอบข้อมูล legacy, ค่า `null`, วันที่ผิดรูปแบบ/ขอบช่วง และ assessment ซ้ำวัน
- [ ] Dashboard totals และ report totals เท่าเดิม
- [x] Admission/discharge filter, pagination, exact total และ full filtered export คืนชุดข้อมูลที่ถูกต้อง
- [x] Production build และ lint ผ่าน (local, 28 สิงหาคม 2026)
- [ ] Performance หลังแก้ดีขึ้นจาก baseline อย่างมีนัยสำคัญ
