# Supabase deployment checklist

The files in `migrations/` are the reviewable source of truth for a fresh project and
for hardening the existing hospital database. They are intentionally not pushed to
the remote database automatically because they change access to sensitive health data.

## Before applying the migrations

1. Take a database backup and test on a Supabase branch/staging project first.
2. Check duplicate identifiers; the hardening migration requires unique `users.username`
   and `patients.hn` values:

   ```sql
   select username, count(*) from public.users group by username having count(*) > 1;
   select hn, count(*) from public.patients group by hn having count(*) > 1;
   ```

3. Link the CLI and review the generated diff:

   ```sh
   npx supabase login
   npx supabase link --project-ref YOUR_PROJECT_REF
   npx supabase db diff --linked
   npx supabase db push --dry-run
   ```

   The repository pins Supabase CLI `2.115.0` (or the lockfile-resolved compatible
   version) as a dev dependency. Set `SUPABASE_ACCESS_TOKEN` outside source control;
   do not place it in `.env` or the Phase 5 browser environment file.

4. Apply only after the staging flows pass. Then bootstrap one administrator in the
   Supabase SQL editor (service-role context):

   ```sql
   update public.users set role = 'admin' where username = 'YOUR_ADMIN_USERNAME';
   ```

Existing auth-linked users are migrated to `clinician`. New registrations receive
`pending` and cannot access patient data until an administrator assigns `clinician`,
`auditor`, or `admin`.

## Generate remote TypeScript types

After the migrations are present on the remote project, regenerate the checked-in type
file and review the diff:

```sh
npx supabase gen types typescript --project-id YOUR_PROJECT_REF --schema public > types/database.types.ts
```

The current `types/database.types.ts` has the same shape as Supabase CLI output but was
derived from these migrations. The project's anon key cannot access PostgREST OpenAPI
metadata, so a real remote generation requires a developer's Supabase access token.

## Security verification

- Confirm RLS is enabled on `users`, `patients`, `assessments`, `backup`, `ior_records`,
  `audit_log`, and `activity_log`.
- Confirm `anon` cannot select any of those tables or execute clinical RPCs.
- Confirm `pending` cannot access PHI.
- Confirm `auditor` can read but cannot mutate clinical records.
- Confirm `clinician` can complete the clinical flows but cannot change roles or audit rows.
- Confirm `admin` can manage roles and read the audit log.
- Confirm only `auditor` and `admin` can read `activity_log`, and no authenticated role
  can write either log table directly.
- Confirm `audit_log.changed_fields` contains field names only and that the legacy
  `old_data`/`new_data` snapshot columns no longer exist.
- Rotate the legacy anon key from the Supabase dashboard after the policies are verified,
  then replace deployment environment variables. Never commit the replacement key.

## Authenticated Phase 5 E2E

1. Copy `phase5.e2e.env.example` to `phase5.e2e.env.local` at the repository root.
2. Use a dedicated staging QA user whose `public.users.role` is `clinician`.
3. Supply the staging service-role key only to enable exact-HN teardown. The cleanup
   refuses any HN outside `E2E_HN_PREFIX`.
4. Run `npm run e2e:check`; proceed only when it reports `READY`.
5. Run `npm run e2e`. Chrome is used from the host machine, so no Playwright browser
   download is required on the current Windows workstation.

The E2E runner intentionally refuses remote application URLs. It launches the local
Next.js app with the staging URL and anon key injected into the child process, which
keeps the database target reviewable and prevents an already-deployed application from
silently pointing at another Supabase project.

## Activity-log production rollout

Migrations `20260819000300_activity_logging.sql` and
`20260819000400_fix_activity_trigger_record_type.sql` were exercised on staging and
applied to production on 19 August 2026 together with the baseline/hardening migrations.
The post-deployment check confirmed all existing profiles are Auth-linked clinicians,
existing clinical row counts are unchanged, anonymous PHI reads return no rows, and the
two log tables are present. Assign at least one approved username the `admin` role using
the SQL shown above. No retention job is included: keep the logs until the hospital
defines and approves its retention policy.

The production project reported no managed physical backups and no PITR at rollout
time. Enable a Supabase backup option before any future destructive migration.
