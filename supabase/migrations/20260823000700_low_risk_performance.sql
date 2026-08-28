-- Low-risk performance improvements. These changes preserve the existing role
-- matrix and query results; they only reduce repeated policy evaluation and add
-- indexes for established application query shapes.

alter policy users_select_own_or_privileged on public.users
using (
  auth_user_id = (select auth.uid())
  or (select public.current_app_role()) in ('admin', 'auditor')
);

alter policy users_insert_own_pending on public.users
with check (auth_user_id = (select auth.uid()) and role = 'pending');

alter policy users_admin_update on public.users
using ((select public.current_app_role()) = 'admin')
with check ((select public.current_app_role()) = 'admin');

alter policy patients_staff_read on public.patients
using ((select public.current_app_role()) in ('clinician', 'auditor', 'admin'));

alter policy patients_clinical_write on public.patients
using ((select public.current_app_role()) in ('clinician', 'admin'))
with check ((select public.current_app_role()) in ('clinician', 'admin'));

alter policy assessments_staff_read on public.assessments
using ((select public.current_app_role()) in ('clinician', 'auditor', 'admin'));

alter policy assessments_clinical_write on public.assessments
using ((select public.current_app_role()) in ('clinician', 'admin'))
with check ((select public.current_app_role()) in ('clinician', 'admin'));

alter policy backup_staff_read on public.backup
using ((select public.current_app_role()) in ('clinician', 'auditor', 'admin'));

alter policy backup_clinical_insert on public.backup
with check ((select public.current_app_role()) in ('clinician', 'admin'));

alter policy backup_admin_modify on public.backup
using ((select public.current_app_role()) = 'admin')
with check ((select public.current_app_role()) = 'admin');

alter policy backup_admin_delete on public.backup
using ((select public.current_app_role()) = 'admin');

alter policy ior_staff_read on public.ior_records
using ((select public.current_app_role()) in ('clinician', 'auditor', 'admin'));

alter policy ior_clinical_write on public.ior_records
using ((select public.current_app_role()) in ('clinician', 'admin'))
with check ((select public.current_app_role()) in ('clinician', 'admin'));

alter policy audit_privileged_read on public.audit_log
using ((select public.current_app_role()) in ('auditor', 'admin'));

alter policy activity_log_privileged_read on public.activity_log
using ((select public.current_app_role()) in ('auditor', 'admin'));

create index if not exists patients_gender_created_at_idx
  on public.patients (gender, created_at desc);

create index if not exists assessments_hn_record_type_date_idx
  on public.assessments (hn, record_type, assess_date desc, created_at desc);

create index if not exists backup_gender_discharge_date_idx
  on public.backup (gender, discharge_date desc)
  where discharge_date is not null;
