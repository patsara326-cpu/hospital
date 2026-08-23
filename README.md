# Hospital psychiatric patient system

Next.js 16 App Router migration of the legacy psychiatric patient registration,
assessment, discharge, IOR, IPD, dashboard, history, and statistics application.

## Migration status (19 August 2026)

- [x] Restore detailed legacy SMI-V/OAS choices and clinical care guidance.
- [x] Add shared Zod validation on client and Server Actions.
- [x] Migrate login, registration, new patient, edit, discharge, IOR, and assessment
  forms to React Hook Form and shadcn/ui primitives.
- [x] Standardize date-only values to `Asia/Bangkok` and display Thai Buddhist Era dates.
- [x] Add reproducible Supabase baseline and hardening migrations.
- [x] Add RLS role design (`pending`, `clinician`, `auditor`, `admin`) and audit logging.
- [x] Add privacy-minimized login/logout, clinical action, and Excel export activity logs.
- [x] Add atomic RPCs for registration, edit, and discharge workflows.
- [x] Add the `ior_statistics` view with an application fallback until migration deployment.
- [x] Restrict IPD lists to current rows in `patients`.
- [x] Consolidate statistics filters, panel layout, and Excel export UI.
- [x] Use self-hosted Sarabun/Kodchasan through `next/font/local`.
- [x] Upgrade SheetJS to vendored 0.20.3; production dependency audit is clean.
- [x] Pass unit tests, TypeScript, lint, production build, and unauthenticated browser smoke tests.
- [x] Apply migrations to the staging Supabase project and pass the role security checklist.
- [x] Generate `types/database.types.ts` from the remote staging schema.
- [x] Run authenticated end-to-end tests for all clinical write and export flows.
- [x] Apply migrations `00100`-`00400` to production and verify data counts/RLS.
- [ ] Rotate the legacy anon key after RLS is verified.
- [ ] Enable managed production backups or PITR in Supabase.

Database deployment and security steps are documented in
[`supabase/README.md`](supabase/README.md). Staging and production were migrated and
verified on 19 August 2026. Production currently has no managed physical backup or PITR;
enable one before future destructive schema changes.

### Activity and audit logging

- Successful app login/logout, patient registration/update/discharge, shift assessment,
  IOR save, and Excel export actions are recorded in `activity_log`.
- Failed authentication remains in Supabase Auth audit logs and is not duplicated in
  the application table.
- `audit_log` stores the changed field names and minimum record reference only; it does
  not store before/after patient row snapshots.
- Only `auditor` and `admin` can read the log viewer at `/admin/logs`; direct client
  inserts, updates, and deletes are denied.
- No automatic log deletion policy is enabled until the hospital approves a retention
  period.

## Quality commands

```sh
npm install
npm test
npm run lint
npm run build
npm audit --omit=dev
npm run e2e:check
npm run e2e
```

## Required inputs for Phase 5

Use a non-production Supabase branch/project and provide:

1. approval to link/push the checked-in migrations to staging;
2. a Supabase CLI access token (set outside source control) for remote type generation;
3. a dedicated QA account with `clinician` role;
4. an approved synthetic HN prefix and permission to create/delete its test records.

No production patient record should be used for automated QA.

### Phase 5 harness

The repository now pins the Supabase CLI and Playwright as development dependencies.
Copy `phase5.e2e.env.example` to the ignored `phase5.e2e.env.local`, fill only staging
credentials, and run `npm run e2e:check` before any browser test. The guard rejects a
staging ref that matches the declared production ref, rejects non-local application
URLs, and requires the explicit value `E2E_ALLOW_MUTATIONS=staging-only`.

`npm run e2e` starts the app locally against the staging Supabase project, logs in as
the QA clinician, and verifies registration, edit, shift assessment, IOR, three Excel
exports, and discharge. It then uses the staging service-role key server-side in the
test runner to delete only the exact synthetic HN created during that run. The key is
never passed to browser code and must never be committed.
