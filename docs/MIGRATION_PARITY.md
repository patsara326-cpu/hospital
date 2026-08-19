# Legacy migration parity report

Compared against `ref/index.html`, `ref/script.js`, `ref/style.css`, and
`ref/MIGRATION_GUIDE.md` on 19 August 2026.

| Legacy module | App Router target | Status |
|---|---|---|
| Login/register | `/login` | Implemented; RHF/Zod; Supabase Auth |
| Dashboard slides | `/dashboard` | Implemented; swipe/auto-advance retained |
| New-patient wizard | `/patients/new` | Implemented; five steps; SMI-V/OAS conditional logic restored |
| Edit patient | `/patients/edit` | Implemented; RHF/Zod; transactional RPC when migration is installed |
| Discharge | `/patients/discharge` | Implemented; transactional backup/delete RPC when installed |
| Shift assessment | `/assessment` | Implemented; PHUA/G-HARD legacy thresholds covered by tests |
| Discharge history | `/history` | Implemented from `backup` |
| IOR entry | `/ior` | Implemented; RHF/Zod |
| Male/female IPD | `/ipd/[gender]` | Implemented from current `patients` only |
| Admission statistics | `/statistics/admission/[gender]` | Implemented; filter and XLSX export |
| Discharge statistics | `/statistics/discharge/[gender]` | Implemented; filter and XLSX export |
| IOR statistics | `/statistics/incidents` | Implemented; view-first with legacy query fallback |

## Domain parity

- SMI-V choices and descriptive examples are sourced from the legacy form.
- OAS 1–3 includes separate self/others/property criteria and legacy care guidance.
- PHUA/G-HARD scoring remains: Mild `< 10`, Moderate `10–14`, Severe `15–19`,
  Critical `>= 20` or any item scored `7`.
- Date-only storage remains ISO `YYYY-MM-DD`; UI output uses Buddhist Era and
  `Asia/Bangkok` boundaries.
- Excel workbooks are produced from source arrays, not rendered DOM tables.

## Supabase readiness

The configured URL/anon key can reach the existing REST tables, but anon access cannot
read PostgREST OpenAPI metadata. Checked-in types therefore reflect the checked-in
migrations and must be regenerated after those migrations are applied to staging.

The hardening migration adds:

- RLS policies for all sensitive tables;
- pending/clinician/auditor/admin roles;
- immutable application audit events;
- atomic registration, edit, and discharge functions;
- an IOR statistics view;
- auth-profile synchronization for new users.

## Not production-approved yet

- Remote migrations and RLS policies have not been applied or exercised on staging.
- Remote generated types are pending Supabase CLI access.
- Authenticated mutation/export QA needs a dedicated synthetic-data account.
- The previously exposed legacy anon key still needs rotation after RLS verification.
- The tracked nested `hospital` gitlink was left untouched because removing it is a
  destructive repository operation and needs explicit approval.
