# แผนการย้ายระบบ "ระบบลงทะเบียนและประเมินผู้ป่วยจิตเวช" จาก HTML/CSS/JS (Vanilla + Supabase)
# ไปเป็น Next.js (App Router) + TypeScript + Tailwind CSS

เอกสารนี้เขียนขึ้นเพื่อให้ AI coding assistant (เช่น Claude Code, Cursor, Copilot) ใช้เป็น "แผนที่" ในการย้ายโค้ดจากไฟล์เดิม
(`index.html`, `script.js`, `style.css`) ไปเป็นโปรเจกต์ Next.js สมัยใหม่ โดยคงฟังก์ชันการทำงานเดิมทั้งหมดไว้ ไม่ให้ตกหล่น

---

## 0. สรุประบบเดิม (สิ่งที่ต้องย้ายให้ครบ)

**สแตกเดิม:** ไฟล์เดียว `index.html` (~1,480 บรรทัด, SPA แบบ show/hide div) + `script.js` (~2,486 บรรทัด, จัดการทุกอย่างแบบ global function) + `style.css` + Tailwind CDN (`@tailwindcss/browser@4`) + Supabase JS SDK (CDN) + SheetJS (`xlsx`) สำหรับ export Excel

**Backend ที่ใช้อยู่:** Supabase (Auth + Postgres) เรียกตรงจาก client ด้วย anon key ที่ hardcode ไว้ในโค้ด (ต้องแก้เรื่อง security ด้วย — ดูข้อ 7)

**ตารางฐานข้อมูล (Supabase) ที่พบในโค้ด:**
- `users` — โปรไฟล์ผู้ใช้ (prefix, first_name, last_name, username)
- `patients` — ข้อมูลผู้ป่วย (hn, full_name, gender, smi_type, admit_date, last_diagnosis, admitting_doctor, raw_data (jsonb) ฯลฯ)
- `assessments` — ผลประเมินรายเวร (PHUA, GHARD scales), มี `raw_data` (jsonb)
- `backup` — ประวัติผู้ป่วยที่จำหน่ายแล้ว (เก็บ snapshot ทั้งหมดตอน discharge)
- `ior_records` — บันทึกอุบัติการณ์ (IOR) ผูกกับ `hn` และ `level`

**หน้า/โมดูลหลักในแอป (อิงจาก `showPage()` และ id `page-*`):**
1. `login` — เข้าสู่ระบบ + สมัครสมาชิก (modal)
2. `home` — Dashboard สรุปยอดผู้ป่วย (auto-advance เปลี่ยนสไลด์ dashboard-2, dashboard-3)
3. `newPatient` — ลงทะเบียนผู้ป่วยแรกรับ เป็น **wizard 5 ขั้นตอน** (`sv_page1`–`sv_page5`) พร้อม logic ประเมิน SMI-V
4. `editPatient` — ลงทะเบียนผู้ป่วยเพิ่มเติม/แก้ไขข้อมูลผู้ป่วย
5. `smiv` — ทะเบียนจำหน่ายผู้ป่วย (ค้นหาด้วย HN แล้ว discharge)
6. `assessment` — ประเมินรายเวร (แบบประเมิน PHUA + GHARD, มีการคำนวณความเสี่ยง `calculateRisk`)
7. `oldPatient` — ประวัติการจำหน่าย (ค้นหาจาก `backup` table)
8. `ior` — บันทึก IOR (อุบัติการณ์)
9. `ipdMale` / `ipdFemale` — รายชื่อผู้ป่วยใน ward ชาย/หญิง
10. `male-admission` / `female-admission` — สถิติรับใหม่ (filter + export Excel)
11. `male-discharge` / `female-discharge` — สถิติจำหน่าย (filter + export Excel)
12. `incident-statistics` — สถิติอุบัติการณ์ IOR (filter + export Excel)
13. `result` — หน้าแสดงผลลัพธ์ทั่วไป

**ฟีเจอร์ cross-cutting:**
- Auth ด้วย Supabase (username → fake email `username@app.local`)
- Responsive navbar พร้อม hamburger menu บนมือถือ + dropdown/dropdown-sub หลายชั้น
- Export ตารางเป็น Excel ด้วย SheetJS (`table_to_sheet`)
- Toast notification (`toast()`)
- แปลงวันที่เป็น พ.ศ. (Buddhist Era) ทุกจุดที่แสดงวันที่
- แบบประเมิน PHUA/GHARD แบบ dynamic table (`buildScaleTable`)

---

## 1. โครงสร้างโปรเจกต์ Next.js ที่แนะนำ

```
psychiatric-patient-system/
├── src/
│   ├── app/
│   │   ├── (auth)/
│   │   │   └── login/page.tsx
│   │   ├── (main)/                      # ทุกหน้าที่ต้อง login ก่อน (ใช้ layout ร่วม = navbar)
│   │   │   ├── layout.tsx               # ย้าย navbar/dropdown + auth guard มาไว้ที่นี่
│   │   │   ├── page.tsx                 # หน้า home/dashboard
│   │   │   ├── patients/
│   │   │   │   ├── new/page.tsx         # newPatient wizard (sv_page1-5)
│   │   │   │   ├── edit/page.tsx        # editPatient
│   │   │   │   └── discharge/page.tsx   # smiv (ทะเบียนจำหน่าย)
│   │   │   ├── assessment/page.tsx
│   │   │   ├── ior/page.tsx
│   │   │   ├── ipd/male/page.tsx
│   │   │   ├── ipd/female/page.tsx
│   │   │   ├── history/page.tsx         # oldPatient
│   │   │   └── statistics/
│   │   │       ├── admission/[gender]/page.tsx
│   │   │       ├── discharge/[gender]/page.tsx
│   │   │       └── incidents/page.tsx
│   │   ├── api/                         # Route Handlers (ดูข้อ 7 เรื่อง server-side Supabase)
│   │   │   ├── patients/route.ts
│   │   │   ├── assessments/route.ts
│   │   │   ├── discharge/route.ts
│   │   │   ├── ior/route.ts
│   │   │   └── export/[type]/route.ts   # (ทางเลือก) generate excel ฝั่ง server
│   │   ├── layout.tsx                   # root layout (font, globals.css)
│   │   └── globals.css                  # @tailwind base/components/utilities
│   ├── components/
│   │   ├── layout/
│   │   │   ├── Navbar.tsx
│   │   │   ├── MobileMenuToggle.tsx
│   │   │   └── UserMenu.tsx
│   │   ├── auth/
│   │   │   ├── LoginForm.tsx
│   │   │   └── RegisterModal.tsx
│   │   ├── dashboard/
│   │   │   ├── DashboardCard.tsx
│   │   │   └── DashboardCarousel.tsx    # auto-advance dashboard-2/3
│   │   ├── patients/
│   │   │   ├── NewPatientWizard/
│   │   │   │   ├── index.tsx
│   │   │   │   ├── Step1BasicInfo.tsx
│   │   │   │   ├── Step2SmivScreen.tsx
│   │   │   │   ├── Step3SmivDetail.tsx
│   │   │   │   ├── Step4Result.tsx
│   │   │   │   └── Step5Confirm.tsx
│   │   │   ├── PatientSearchByHN.tsx
│   │   │   └── DischargeForm.tsx
│   │   ├── assessment/
│   │   │   ├── ScaleTable.tsx           # แทนที่ buildScaleTable()
│   │   │   └── RiskBadge.tsx            # แทนที่ getRiskColor()
│   │   ├── statistics/
│   │   │   ├── StatFilterBar.tsx
│   │   │   ├── StatTable.tsx
│   │   │   └── ExportExcelButton.tsx
│   │   └── ui/                          # ปุ่ม, input, select, modal, toast (design system)
│   ├── lib/
│   │   ├── supabase/
│   │   │   ├── client.ts                # createBrowserClient (Supabase SSR)
│   │   │   ├── server.ts                # createServerClient (สำหรับ Server Components / Route Handlers)
│   │   │   └── middleware.ts
│   │   ├── constants/
│   │   │   ├── scales.ts                # PHUA_ITEMS, GHARD_ITEMS
│   │   │   └── options.ts               # dropdown options (residence, smiv type ฯลฯ)
│   │   ├── utils/
│   │   │   ├── date.ts                  # formatDateBE, formatDateLongBE (พ.ศ.)
│   │   │   ├── risk.ts                  # calculateRisk
│   │   │   └── export.ts                # wrapper รอบ SheetJS
│   │   └── validation/                  # zod schemas สำหรับทุกฟอร์ม
│   ├── hooks/
│   │   ├── useAuth.ts
│   │   ├── usePatients.ts
│   │   ├── useDashboardCounts.ts
│   │   └── useDischargeStats.ts
│   ├── types/
│   │   ├── patient.ts
│   │   ├── assessment.ts
│   │   ├── discharge.ts
│   │   └── database.types.ts            # generate จาก `supabase gen types typescript`
│   └── middleware.ts                    # ป้องกันหน้า (auth guard) ระดับ route
├── public/
├── tailwind.config.ts
├── next.config.ts
├── tsconfig.json
└── package.json
```

---

## 2. Mapping หน้าที่เก่า → ใหม่ (บอก AI ให้ทำทีละหน้า)

| เดิม (id ใน index.html) | ใหม่ (Next.js route) | หมายเหตุ |
|---|---|---|
| `loginPage` | `app/(auth)/login/page.tsx` | แยก layout ออกจาก main app เพราะไม่มี navbar |
| `page-home` + dashboard-2/3 | `app/(main)/page.tsx` + `DashboardCarousel` | auto-advance ใช้ `useEffect` + `setInterval`, cleanup ตอน unmount |
| `page-newPatient` (sv_page1-5) | `app/(main)/patients/new/page.tsx` | ใช้ local state machine (`useState<step>` หรือ `useReducer`) แทนการ show/hide div; เก็บ form state รวมด้วย `react-hook-form` |
| `page-editPatient` | `app/(main)/patients/edit/page.tsx` | |
| `page-smiv` | `app/(main)/patients/discharge/page.tsx` | ทะเบียนจำหน่ายผู้ป่วย |
| `page-assessment` | `app/(main)/assessment/page.tsx` | ใช้ `ScaleTable` component รับ items เป็น prop |
| `page-oldPatient` | `app/(main)/history/page.tsx` | |
| `page-ior` | `app/(main)/ior/page.tsx` | |
| `page-ipdMale` / `page-ipdFemale` | `app/(main)/ipd/[gender]/page.tsx` (dynamic route) | รวมเป็น route เดียว ลด duplicate code |
| `page-male-admission` / `page-female-admission` | `app/(main)/statistics/admission/[gender]/page.tsx` | |
| `page-male-discharge` / `page-female-discharge` | `app/(main)/statistics/discharge/[gender]/page.tsx` | |
| `page-incident-statistics` | `app/(main)/statistics/incidents/page.tsx` | |
| `registerModal` | `components/auth/RegisterModal.tsx` | ใช้ Radix Dialog หรือ headlessui แทนการ toggle class `hidden` |

**คำแนะนำสำคัญ:** อย่าพยายาม "1 ไฟล์ HTML = 1 component" ตรงตัว ให้ AI **แตกทุกหน้าออกเป็น route จริงของ Next.js** (แทนการ show/hide ด้วย JS ในหน้าเดียว) เพราะจะได้ประโยชน์จาก:
- URL ที่ deep-link ได้ (กด back/forward ได้จริง, แชร์ลิงก์ได้)
- Code splitting อัตโนมัติ (โหลดเฉพาะหน้าที่ใช้)
- Next.js `loading.tsx` / `error.tsx` per route

---

## 3. แปลง State Management: จาก Global Variable → React State/Context

โค้ดเดิมใช้ตัวแปร global เช่น `fetchedPatientsCache`, `currentDischargePatient`, `sv4ReturnTo`, `currentEditAssessment` ต้องแปลงเป็น:

- **State ที่ใช้เฉพาะในหน้าเดียว** (เช่น `currentDischargePatient`) → `useState` ใน component ของหน้านั้น
- **State ที่ต้องใช้ร่วมข้ามหน้า/component** (เช่น session ผู้ใช้ล็อกอิน) → React Context (`AuthContext`) หรือ library เบา ๆ อย่าง `zustand`
- **Cache ข้อมูลจาก Supabase** (เช่น `fetchedPatientsCache`, `dischargeData`, `incidentStatData`) → แนะนำให้ใช้ **TanStack Query (React Query)** แทนการ cache มือเอง จะได้ caching, refetch, loading/error state ให้ฟรี

---

## 4. แปลง Auth Flow

โค้ดเดิม:
```js
supabaseClient.auth.signInWithPassword({ email: `${username}@app.local`, password })
```

แผนย้าย:
1. ใช้ `@supabase/ssr` (แพ็กเกจทางการสำหรับ Next.js) แทน `@supabase/supabase-js` ตรง ๆ
2. สร้าง `lib/supabase/client.ts` (browser) และ `lib/supabase/server.ts` (server component / route handler) ตามแพทเทิร์นของ Supabase สำหรับ App Router
3. ใช้ `middleware.ts` เช็ค session แล้ว redirect ไป `/login` ถ้ายังไม่ได้ล็อกอิน (แทนการ `if (session) {...} else {...}` ใน `DOMContentLoaded`)
4. คง logic "username → fake email" ไว้เหมือนเดิมได้ (แปลงใน server action หรือ API route เพื่อไม่ต้อง expose logic นี้ที่ client มากเกินไป)
5. ฟอร์มสมัครสมาชิก → ใช้ Server Action (`"use server"`) เขียนลง `users` table + `auth.signUp`

---

## 5. แปลงฟอร์มต่าง ๆ

ทุกฟอร์มในเดิม (login, register, newPatient wizard, editPatient, discharge, IOR, assessment) ใช้ `document.getElementById(...).value` ล้วน ๆ ให้เปลี่ยนเป็น:

- **React Hook Form** + **Zod** สำหรับ validation (กำหนด schema ใน `lib/validation/*.ts` ให้ตรงกับ field ที่เจอในฟอร์มเดิมทุกตัว)
- แปลง dropdown ที่ hardcode ใน HTML (เช่น คำนำหน้าชื่อ, ประเภทที่อยู่, ประเภท SMI-V) → เก็บเป็น constant array ใน `lib/constants/options.ts` แล้ว map เป็น `<option>` เพื่อลด duplication (ตอนนี้ตัวเลือก residence/smiv ซ้ำกันหลายจุดในไฟล์เดิม)
- Wizard `newPatient` (sv_page1-5): แปลงเป็น multi-step form component เดียวที่คุม step ด้วย state, เก็บข้อมูลรวมทุก step ไว้ใน object เดียว แล้ว submit ครั้งเดียวตอนจบ step สุดท้าย (เดิมมี `sv4ReturnTo`/`sv5ReturnTo` ควบคุมการย้อนกลับแบบ manual — คงพฤติกรรมนี้ไว้ด้วย conditional step transitions)

---

## 6. แปลงตารางสถิติ + Export Excel

หน้าเหล่านี้: admission/discharge stats (male/female), incident statistics — มีรูปแบบเดียวกันหมด (filter → table → export)

แนะนำสร้าง **generic component เดียว** ใช้ซ้ำ 5 หน้า:
```tsx
<StatisticsPage
  title="สถิติผู้ป่วยชาย - รับใหม่"
  columns={admissionColumns}
  fetcher={() => fetchAdmissionData('male')}
  filters={['month', 'year', 'smiv', 'residence']}
  exportFileName="สถิติผู้ป่วยชายรับใหม่.xlsx"
/>
```

Export Excel: ย้ายจาก `XLSX.utils.table_to_sheet(document.getElementById(...))` (อ่านจาก DOM) → เปลี่ยนเป็น `XLSX.utils.json_to_sheet(filteredRows)` (อ่านจาก data ตรง ๆ ไม่ผูกกับ DOM) วางไว้ใน `lib/utils/export.ts` เป็นฟังก์ชันกลาง `exportToExcel(rows, sheetName, fileName)`

**หมายเหตุ:** ในโค้ดเดิมพบ `exportDischargeExcel` ถูก define ซ้ำสองครั้ง (บรรทัด 2365 และ 2374 เหมือนกันทุกตัวอักษร) — เป็น dead code ที่ควรลบตอนย้าย ไม่ต้องเอาไปด้วย

---

## 7. Backend / Database — สิ่งที่ควรปรับปรุงตอนย้าย (ไม่ใช่แค่ port โค้ด)

1. **ย้าย Supabase key ออกจาก client bundle ที่ hardcode:** ตอนนี้ `supabaseUrl`/`supabaseKey` ฝังตรงในไฟล์ JS (public repo ก็เห็นได้) แม้ anon key จะถูกออกแบบให้ expose ได้ในระดับหนึ่ง แต่ควร:
   - ย้ายไปเป็น environment variables: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - **ต้องเปิด/ทบทวน Row Level Security (RLS) policy บนทุกตาราง** (`users`, `patients`, `assessments`, `backup`, `ior_records`) เพราะข้อมูลผู้ป่วยจิตเวชเป็นข้อมูลอ่อนไหวมาก (sensitive health data) — ไม่ควรพึ่งแค่ anon key + ไม่มี RLS
   - **หมุน (rotate) anon key เดิมที่เคย commit ไว้ในไฟล์ที่ส่งมา** เนื่องจากเคยถูกฝังไว้แบบ plaintext แล้ว
2. **ย้าย query ที่ทำ join แบบ manual ใน JS (เช่น `loadIncidentData()` ที่ query `ior_records` แล้วเอา `hn` ไป query `patients` อีกที) ไปทำเป็น Postgres view หรือ RPC function** จะเร็วกว่าและลด round-trip
3. **ใช้ Next.js Route Handlers หรือ Server Actions สำหรับ mutation ที่สำคัญ** (บันทึกผู้ป่วย, จำหน่ายผู้ป่วย, บันทึก IOR) แทนการยิง Supabase ตรงจาก client ทั้งหมด เพื่อให้ validate ข้อมูลฝั่ง server ได้ก่อนเขียนลง DB
4. **Generate TypeScript types จากฐานข้อมูลจริง:** `npx supabase gen types typescript --project-id <id> > src/types/database.types.ts` แล้วใช้กับ Supabase client เพื่อให้ query ทุกจุด type-safe (แก้ปัญหาการเข้าถึง field แบบ `r.raw_data?.first_name` ที่ไม่มี type check ในโค้ดเดิม)

---

## 8. แปลง CSS → Tailwind

- ไฟล์เดิมใช้ Tailwind ผ่าน CDN (`@tailwindcss/browser@4`) ผสมกับ custom class ใน `style.css` (เช่น `.login-container`, `.card`, `.nav-menu`, `.dropdown`, `.dropdown-sub`) และ **inline style จำนวนมาก** (`style="padding:8px; border:1px solid #ccc; ..."` ซ้ำ ๆ หลายร้อยจุด)
- แผนย้าย:
  1. อ่าน `style.css` ทั้งหมด แล้วแปลง custom class เป็น Tailwind utility class หรือ `@apply` ใน `globals.css` ถ้า pattern ซ้ำบ่อย (เช่น navbar, dropdown, card, modal)
  2. **แปลง inline style ทั้งหมดเป็น Tailwind class** ตอนสร้างแต่ละ component (อย่าคง `style={{ padding: '8px' }}` ไว้ เพราะเสียจุดประสงค์ของการย้ายมาใช้ Tailwind)
  3. ตั้งค่า custom font (Sarabun, Kanit) ผ่าน `next/font/google` แทนการโหลดจาก Google Fonts CDN ใน `<head>` ตรง ๆ — จะได้ font optimization ของ Next.js
  4. Responsive navbar (hamburger + scrim + multi-level dropdown) → เขียนใหม่ด้วย React state (`useState` เปิด/ปิดเมนู) แทนการใช้ `<input type="checkbox">` + CSS sibling selector แบบเดิม จะ maintain ง่ายกว่ามาก
  5. สีที่ hardcode เป็น hex (เช่น `#ffd8a8`, `#dff6ff`, `#44c013`) ที่ใช้ซ้ำในการ์ด dashboard → ดึงออกมาเป็น Tailwind theme colors ใน `tailwind.config.ts`

---

## 9. Library ที่แนะนำให้เพิ่ม

| งาน | เดิมใช้ | แนะนำในโปรเจกต์ใหม่ |
|---|---|---|
| Auth + DB | `@supabase/supabase-js` (CDN) | `@supabase/supabase-js` + `@supabase/ssr` (npm) |
| Excel export | `xlsx` (SheetJS CDN) | `xlsx` (npm) — ยังใช้ตัวเดิมได้ แค่เปลี่ยนวิธีเรียก |
| Form + validation | ไม่มี (manual DOM) | `react-hook-form` + `zod` |
| Data fetching/cache | manual global var | `@tanstack/react-query` |
| Modal/Dropdown | manual CSS class toggle | `@headlessui/react` หรือ `radix-ui` |
| Toast | custom `toast()` function | `sonner` หรือคง logic เดิมแต่ทำเป็น React component |
| Date (พ.ศ.) | manual function | คงฟังก์ชันเดิม (`formatDateBE`) ย้ายไป `lib/utils/date.ts` หรือใช้ `dayjs` + plugin buddhist era |
| State (global เล็ก ๆ) | global `let` | `zustand` (เบา เหมาะกับโปรเจกต์ขนาดนี้) |

---

## 10. ลำดับขั้นการย้าย (แนะนำให้ AI ทำเป็นเฟส ไม่ทำทีเดียวทั้งหมด)

1. **Setup:** `create-next-app` (TypeScript + Tailwind + App Router), ต่อ Supabase, ตั้ง env vars, generate DB types
2. **Auth:** login page + middleware guard + session handling (ย้ายก่อนเพราะทุกหน้าอื่นพึ่ง auth)
3. **Layout:** Navbar + responsive menu + user dropdown (ย้ายให้ตรงกับของเดิมเป๊ะก่อน ค่อยปรับ UI)
4. **Dashboard (home):** เพราะเป็นหน้าแรกหลัง login, เทียบผลลัพธ์ตัวเลขกับของเดิมได้ง่าย (regression test ง่าย)
5. **Static/read-heavy pages ก่อน** (ipdMale/ipdFemale, oldPatient, statistics ทั้งหมด) เพราะเป็น read-only เสี่ยงน้อยกว่า
6. **Forms ที่ mutate data** (newPatient wizard, editPatient, discharge, IOR, assessment) ทำทีหลังสุดและทดสอบละเอียดที่สุด เพราะกระทบข้อมูลผู้ป่วยจริง
7. **QA:** เทียบทุกหน้ากับของเดิม 1:1 (field ครบไหม, การคำนวณ risk score ตรงกันไหม, export Excel ได้ column เหมือนเดิมไหม)
8. **Cleanup:** ลบ dead code ที่เจอระหว่างย้าย (เช่น `exportDischargeExcel` ที่ define ซ้ำ), ลบ commented-out legacy register code

---

## 11. ข้อควรระวังเฉพาะของระบบนี้ (Domain-specific)

- นี่คือระบบข้อมูล**ผู้ป่วยจิตเวช** ซึ่งเป็นข้อมูลสุขภาพอ่อนไหว (sensitive/PHI) — ควรพิจารณา audit log, การเข้ารหัสข้อมูลบางฟิลด์, และสิทธิ์การเข้าถึงตามบทบาท (role-based access) ไม่ใช่แค่ login/logout ธรรมดา
- Logic การคำนวณ SMI-V type และ `calculateRisk()` (PHUA/GHARD) เป็น **clinical logic** ที่ต้องย้ายมาให้ตรงเป๊ะ 100% ห้ามปัดเศษ/เปลี่ยนเงื่อนไขโดยไม่ได้รับการยืนยันจากผู้ใช้ ให้ AI เขียน unit test เทียบ input/output กับของเดิมก่อน merge
- วันที่ทั้งระบบแสดงเป็น **พ.ศ. (Buddhist Era)** ต้องคงไว้ทุกจุด (อย่าเผลอปล่อยเป็น ค.ศ. ตอน migrate)

---

## สรุปสิ่งที่อยากให้ AI ทำเมื่อเริ่มงานจริง

1. อ่านไฟล์ `index.html`, `script.js`, `style.css` ทั้งหมดอย่างละเอียด (ไม่ใช่แค่ไฟล์นี้) เพื่อดึง field/label/option ให้ครบทุกตัวอักษรก่อนเริ่มเขียนโค้ดใหม่
2. เริ่มจาก Setup + Auth + Layout ตามลำดับในข้อ 10
3. ทำทีละหน้า ทีละ PR/commit เล็ก ๆ พร้อมเทียบผลลัพธ์กับของเดิมทุกครั้ง
4. ถามผู้ใช้เมื่อเจอจุดที่ต้อง "ตัดสินใจ" เช่น จะทำ RBAC ไหม, จะเก็บ business logic การคำนวณ SMI-V ไว้ที่ client หรือย้ายไป server
