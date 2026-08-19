-- Security hardening and transactional clinical workflows.
-- New signups receive `pending`; an administrator must promote them before they
-- can read patient data. Existing auth-linked users are preserved as clinicians.

alter table public.users
  add column if not exists auth_user_id uuid references auth.users(id) on delete cascade,
  add column if not exists role text not null default 'pending';

update public.users as profile
set auth_user_id = account.id
from auth.users as account
where profile.auth_user_id is null
  and lower(profile.username) = lower(split_part(account.email, '@', 1));

update public.users set role = 'clinician' where role = 'pending' and auth_user_id is not null;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'users_role_check' and conrelid = 'public.users'::regclass
  ) then
    alter table public.users add constraint users_role_check
      check (role in ('pending', 'clinician', 'auditor', 'admin'));
  end if;
end
$$;

create unique index if not exists users_auth_user_id_key
  on public.users (auth_user_id) where auth_user_id is not null;
create unique index if not exists users_username_key on public.users (username);
create unique index if not exists patients_hn_key on public.patients (hn);

comment on column public.users.role is
  'pending cannot access PHI; clinician can read/write clinical records; auditor is read-only; admin manages access.';

create or replace function public.current_app_role()
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    (select profile.role from public.users as profile where profile.auth_user_id = auth.uid()),
    'pending'
  );
$$;

revoke all on function public.current_app_role() from public;
grant execute on function public.current_app_role() to authenticated;

create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_username text := coalesce(new.raw_user_meta_data ->> 'username', split_part(new.email, '@', 1));
begin
  insert into public.users (auth_user_id, username, prefix, first_name, last_name, role)
  values (
    new.id,
    v_username,
    nullif(new.raw_user_meta_data ->> 'prefix', ''),
    coalesce(nullif(new.raw_user_meta_data ->> 'first_name', ''), v_username),
    coalesce(nullif(new.raw_user_meta_data ->> 'last_name', ''), '-'),
    'pending'
  )
  on conflict (username) do update
    set auth_user_id = excluded.auth_user_id,
        prefix = coalesce(excluded.prefix, public.users.prefix),
        first_name = excluded.first_name,
        last_name = excluded.last_name;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_auth_user();

revoke all on function public.handle_new_auth_user() from public, anon, authenticated;

create table if not exists public.audit_log (
  id bigint generated always as identity primary key,
  table_name text not null,
  operation text not null check (operation in ('INSERT', 'UPDATE', 'DELETE')),
  record_id text,
  changed_by uuid,
  changed_role text,
  old_data jsonb,
  new_data jsonb,
  changed_at timestamptz not null default now()
);

create index if not exists audit_log_record_idx
  on public.audit_log (table_name, record_id, changed_at desc);
create index if not exists audit_log_actor_idx
  on public.audit_log (changed_by, changed_at desc);

create or replace function public.capture_audit_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_old jsonb := case when tg_op in ('UPDATE', 'DELETE') then to_jsonb(old) else null end;
  v_new jsonb := case when tg_op in ('INSERT', 'UPDATE') then to_jsonb(new) else null end;
begin
  insert into public.audit_log (
    table_name, operation, record_id, changed_by, changed_role, old_data, new_data
  ) values (
    tg_table_name,
    tg_op,
    coalesce(v_new ->> 'id', v_old ->> 'id', v_new ->> 'hn', v_old ->> 'hn'),
    auth.uid(),
    public.current_app_role(),
    v_old,
    v_new
  );
  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;

do $$
declare
  v_table text;
begin
  foreach v_table in array array['users', 'patients', 'assessments', 'backup', 'ior_records']
  loop
    execute format('drop trigger if exists audit_%I on public.%I', v_table, v_table);
    execute format(
      'create trigger audit_%I after insert or update or delete on public.%I for each row execute function public.capture_audit_change()',
      v_table,
      v_table
    );
  end loop;
end
$$;

revoke all on function public.capture_audit_change() from public, anon, authenticated;

alter table public.users enable row level security;
alter table public.patients enable row level security;
alter table public.assessments enable row level security;
alter table public.backup enable row level security;
alter table public.ior_records enable row level security;
alter table public.audit_log enable row level security;

drop policy if exists users_select_own_or_privileged on public.users;
create policy users_select_own_or_privileged on public.users for select to authenticated
using (auth_user_id = auth.uid() or public.current_app_role() in ('admin', 'auditor'));

drop policy if exists users_insert_own_pending on public.users;
create policy users_insert_own_pending on public.users for insert to authenticated
with check (auth_user_id = auth.uid() and role = 'pending');

drop policy if exists users_admin_update on public.users;
create policy users_admin_update on public.users for update to authenticated
using (public.current_app_role() = 'admin')
with check (public.current_app_role() = 'admin');

drop policy if exists patients_staff_read on public.patients;
create policy patients_staff_read on public.patients for select to authenticated
using (public.current_app_role() in ('clinician', 'auditor', 'admin'));
drop policy if exists patients_clinical_write on public.patients;
create policy patients_clinical_write on public.patients for all to authenticated
using (public.current_app_role() in ('clinician', 'admin'))
with check (public.current_app_role() in ('clinician', 'admin'));

drop policy if exists assessments_staff_read on public.assessments;
create policy assessments_staff_read on public.assessments for select to authenticated
using (public.current_app_role() in ('clinician', 'auditor', 'admin'));
drop policy if exists assessments_clinical_write on public.assessments;
create policy assessments_clinical_write on public.assessments for all to authenticated
using (public.current_app_role() in ('clinician', 'admin'))
with check (public.current_app_role() in ('clinician', 'admin'));

drop policy if exists backup_staff_read on public.backup;
create policy backup_staff_read on public.backup for select to authenticated
using (public.current_app_role() in ('clinician', 'auditor', 'admin'));
drop policy if exists backup_clinical_insert on public.backup;
create policy backup_clinical_insert on public.backup for insert to authenticated
with check (public.current_app_role() in ('clinician', 'admin'));
drop policy if exists backup_admin_modify on public.backup;
create policy backup_admin_modify on public.backup for update to authenticated
using (public.current_app_role() = 'admin') with check (public.current_app_role() = 'admin');
drop policy if exists backup_admin_delete on public.backup;
create policy backup_admin_delete on public.backup for delete to authenticated
using (public.current_app_role() = 'admin');

drop policy if exists ior_staff_read on public.ior_records;
create policy ior_staff_read on public.ior_records for select to authenticated
using (public.current_app_role() in ('clinician', 'auditor', 'admin'));
drop policy if exists ior_clinical_write on public.ior_records;
create policy ior_clinical_write on public.ior_records for all to authenticated
using (public.current_app_role() in ('clinician', 'admin'))
with check (public.current_app_role() in ('clinician', 'admin'));

drop policy if exists audit_privileged_read on public.audit_log;
create policy audit_privileged_read on public.audit_log for select to authenticated
using (public.current_app_role() in ('auditor', 'admin'));

create or replace function public.register_patient_with_assessment(
  p_profile jsonb,
  p_assessment jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_hn text := nullif(trim(p_profile ->> 'hn'), '');
  v_patient_id public.patients.id%type;
  v_assessment_id public.assessments.id%type;
begin
  if auth.uid() is null or public.current_app_role() not in ('clinician', 'admin') then
    raise exception 'insufficient_privilege' using errcode = '42501';
  end if;
  if coalesce(jsonb_typeof(p_profile), 'null') <> 'object'
    or coalesce(jsonb_typeof(p_assessment), 'null') <> 'object'
    or v_hn is null then
    raise exception 'invalid_patient_payload' using errcode = '22023';
  end if;
  if exists (select 1 from public.patients where hn = v_hn) then
    raise exception 'duplicate_hn' using errcode = '23505';
  end if;

  insert into public.patients (
    hn, prefix, full_name, gender, age, smi_type, substance, admit_date,
    admitting_doctor, oas_score, oas_risk, raw_data
  ) values (
    v_hn,
    nullif(p_profile ->> 'prefix', ''),
    nullif(p_profile ->> 'full_name', ''),
    nullif(p_profile ->> 'gender', ''),
    nullif(p_profile ->> 'age', '')::integer,
    nullif(p_profile ->> 'smi_type', ''),
    nullif(p_profile ->> 'substance', ''),
    nullif(p_profile ->> 'admit_date', '')::date,
    nullif(p_profile ->> 'admitting_doctor', ''),
    nullif(p_profile ->> 'oas_score', '')::integer,
    nullif(p_profile ->> 'oas_risk', ''),
    p_assessment -> 'raw_data'
  )
  returning id into v_patient_id;

  insert into public.assessments (
    hn, record_type, assess_date, shift, oas_score, raw_data
  ) values (
    v_hn,
    coalesce(nullif(p_assessment ->> 'record_type', ''), 'smi-v_admission'),
    nullif(p_assessment ->> 'assess_date', '')::date,
    nullif(p_assessment ->> 'shift', ''),
    nullif(p_assessment ->> 'oas_score', '')::integer,
    coalesce(p_assessment -> 'raw_data', '{}'::jsonb)
  )
  returning id into v_assessment_id;

  return jsonb_build_object('patient_id', v_patient_id, 'assessment_id', v_assessment_id, 'hn', v_hn);
end;
$$;

create or replace function public.discharge_patient(
  p_hn text,
  p_discharge_method text,
  p_discharge_date date,
  p_last_diagnosis text,
  p_discharge_type text
)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_patient public.patients%rowtype;
  v_assessment_raw jsonb;
  v_backup_id public.backup.id%type;
begin
  if auth.uid() is null or public.current_app_role() not in ('clinician', 'admin') then
    raise exception 'insufficient_privilege' using errcode = '42501';
  end if;
  if nullif(trim(p_hn), '') is null or p_discharge_date is null
    or nullif(trim(p_discharge_method), '') is null
    or nullif(trim(p_last_diagnosis), '') is null
    or nullif(trim(p_discharge_type), '') is null then
    raise exception 'invalid_discharge_payload' using errcode = '22023';
  end if;

  select * into v_patient from public.patients where hn = trim(p_hn) for update;
  if not found then
    raise exception 'patient_not_found' using errcode = 'P0002';
  end if;

  select raw_data into v_assessment_raw
  from public.assessments
  where hn = v_patient.hn
  order by assess_date desc nulls last, created_at desc
  limit 1;

  insert into public.backup (
    hn, prefix, full_name, gender, age, smi_type, substance, admit_date,
    admitting_doctor, last_diagnosis, discharge_method, discharge_date,
    discharge_type, discharged_at, raw_data
  ) values (
    v_patient.hn, v_patient.prefix, v_patient.full_name, v_patient.gender,
    v_patient.age, v_patient.smi_type, v_patient.substance, v_patient.admit_date,
    v_patient.admitting_doctor, trim(p_last_diagnosis), trim(p_discharge_method),
    p_discharge_date, trim(p_discharge_type), now(),
    to_jsonb(v_patient) || coalesce(v_assessment_raw, '{}'::jsonb)
  )
  returning id into v_backup_id;

  delete from public.patients where id = v_patient.id;
  return v_backup_id::text;
end;
$$;

create or replace function public.update_patient_with_assessment(
  p_profile jsonb,
  p_assessment_id text,
  p_raw_data jsonb
)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_hn text := nullif(trim(p_profile ->> 'hn'), '');
begin
  if auth.uid() is null or public.current_app_role() not in ('clinician', 'admin') then
    raise exception 'insufficient_privilege' using errcode = '42501';
  end if;
  if v_hn is null
    or coalesce(jsonb_typeof(p_profile), 'null') <> 'object'
    or coalesce(jsonb_typeof(p_raw_data), 'null') <> 'object' then
    raise exception 'invalid_patient_payload' using errcode = '22023';
  end if;

  insert into public.patients (
    hn, prefix, full_name, gender, age, smi_type, substance, admit_date,
    admitting_doctor, oas_score, oas_risk, raw_data
  ) values (
    v_hn, nullif(p_profile ->> 'prefix', ''), nullif(p_profile ->> 'full_name', ''),
    nullif(p_profile ->> 'gender', ''), nullif(p_profile ->> 'age', '')::integer,
    nullif(p_profile ->> 'smi_type', ''), nullif(p_profile ->> 'substance', ''),
    nullif(p_profile ->> 'admit_date', '')::date, nullif(p_profile ->> 'admitting_doctor', ''),
    nullif(p_profile ->> 'oas_score', '')::integer, nullif(p_profile ->> 'oas_risk', ''), p_raw_data
  )
  on conflict (hn) do update set
    prefix = excluded.prefix,
    full_name = excluded.full_name,
    gender = excluded.gender,
    age = excluded.age,
    smi_type = excluded.smi_type,
    substance = excluded.substance,
    admit_date = excluded.admit_date,
    admitting_doctor = excluded.admitting_doctor,
    oas_score = excluded.oas_score,
    oas_risk = excluded.oas_risk,
    raw_data = excluded.raw_data;

  if nullif(trim(p_assessment_id), '') is not null then
    update public.assessments
    set raw_data = p_raw_data,
        oas_score = nullif(p_profile ->> 'oas_score', '')::integer
    where id::text = p_assessment_id and hn = v_hn;
    if not found then raise exception 'assessment_not_found' using errcode = 'P0002'; end if;
  end if;

  return v_hn;
end;
$$;

revoke all on function public.register_patient_with_assessment(jsonb, jsonb) from public, anon;
revoke all on function public.discharge_patient(text, text, date, text, text) from public, anon;
revoke all on function public.update_patient_with_assessment(jsonb, text, jsonb) from public, anon;
grant execute on function public.register_patient_with_assessment(jsonb, jsonb) to authenticated;
grant execute on function public.discharge_patient(text, text, date, text, text) to authenticated;
grant execute on function public.update_patient_with_assessment(jsonb, text, jsonb) to authenticated;

create or replace view public.ior_statistics
with (security_invoker = true)
as
select
  incident.id,
  incident.hn,
  incident.record_date,
  incident.behaviors,
  incident.level,
  incident.created_at,
  patient.full_name,
  patient.gender,
  patient.smi_type
from public.ior_records as incident
left join public.patients as patient on patient.hn = incident.hn;

revoke all on public.ior_statistics from public, anon;
grant select on public.ior_statistics to authenticated;
