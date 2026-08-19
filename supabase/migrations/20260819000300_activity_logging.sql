-- Privacy-minimized audit trail and human-readable application activity log.
-- Authentication failures remain in Supabase Auth audit logs. Application logs
-- only record authenticated, successful actions and never duplicate clinical
-- row contents.

alter table public.audit_log
  add column if not exists record_ref text,
  add column if not exists changed_by_username text,
  add column if not exists changed_fields text[] not null default '{}'::text[],
  add column if not exists transaction_id bigint not null default txid_current();

-- Preserve only the minimum searchable references before removing historical
-- row snapshots that may contain addresses, phone numbers, or clinical notes.
update public.audit_log as audit
set record_ref = coalesce(
      audit.new_data ->> 'hn',
      audit.old_data ->> 'hn',
      audit.new_data ->> 'username',
      audit.old_data ->> 'username'
    ),
    changed_by_username = profile.username
from public.users as profile
where audit.changed_by = profile.auth_user_id
  and (audit.record_ref is null or audit.changed_by_username is null);

create or replace function public.capture_audit_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_old jsonb := case when tg_op in ('UPDATE', 'DELETE') then to_jsonb(old) else null end;
  v_new jsonb := case when tg_op in ('INSERT', 'UPDATE') then to_jsonb(new) else null end;
  v_changed_fields text[];
  v_username text;
begin
  select coalesce(array_agg(changed.key order by changed.key), '{}'::text[])
  into v_changed_fields
  from (
    select keys.key
    from jsonb_object_keys(coalesce(v_old, '{}'::jsonb) || coalesce(v_new, '{}'::jsonb)) as keys(key)
    where (v_old -> keys.key) is distinct from (v_new -> keys.key)
  ) as changed;

  select profile.username
  into v_username
  from public.users as profile
  where profile.auth_user_id = auth.uid();

  insert into public.audit_log (
    table_name,
    operation,
    record_id,
    record_ref,
    changed_by,
    changed_by_username,
    changed_role,
    changed_fields,
    transaction_id
  ) values (
    tg_table_name,
    tg_op,
    coalesce(v_new ->> 'id', v_old ->> 'id', v_new ->> 'hn', v_old ->> 'hn'),
    coalesce(
      v_new ->> 'hn',
      v_old ->> 'hn',
      v_new ->> 'username',
      v_old ->> 'username'
    ),
    auth.uid(),
    v_username,
    public.current_app_role(),
    v_changed_fields,
    txid_current()
  );

  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;

alter table public.audit_log
  drop column if exists old_data,
  drop column if exists new_data;

create index if not exists audit_log_time_idx
  on public.audit_log (changed_at desc);
create index if not exists audit_log_reference_idx
  on public.audit_log (record_ref, changed_at desc);
create index if not exists audit_log_transaction_idx
  on public.audit_log (transaction_id);

create table if not exists public.activity_log (
  id bigint generated always as identity primary key,
  event_type text not null check (event_type in (
    'auth.login',
    'auth.logout',
    'patient.registered',
    'patient.updated',
    'patient.discharged',
    'assessment.saved',
    'ior.saved',
    'report.exported'
  )),
  actor_user_id uuid references auth.users(id) on delete set null,
  actor_username text not null,
  actor_role text not null,
  target_type text,
  target_ref text,
  metadata jsonb not null default '{}'::jsonb
    check (jsonb_typeof(metadata) = 'object' and octet_length(metadata::text) <= 8192),
  request_id uuid not null default gen_random_uuid(),
  occurred_at timestamptz not null default now()
);

comment on table public.activity_log is
  'Append-only successful user activity. Clinical payloads and exported rows must never be stored here.';
comment on column public.activity_log.target_ref is
  'Minimum reference such as HN or report type; never a patient name, diagnosis, address, or phone number.';

create index if not exists activity_log_time_idx
  on public.activity_log (occurred_at desc);
create index if not exists activity_log_actor_idx
  on public.activity_log (actor_user_id, occurred_at desc);
create index if not exists activity_log_event_idx
  on public.activity_log (event_type, occurred_at desc);
create index if not exists activity_log_target_idx
  on public.activity_log (target_type, target_ref, occurred_at desc);

alter table public.activity_log enable row level security;

drop policy if exists activity_log_privileged_read on public.activity_log;
create policy activity_log_privileged_read
on public.activity_log for select to authenticated
using (public.current_app_role() in ('auditor', 'admin'));

-- Direct writes are deliberately unavailable. Events can only be written by
-- trusted trigger functions or the narrow RPC below, which derives the actor
-- from auth.uid() rather than accepting identity data from the caller.
revoke all on public.activity_log from public, anon, authenticated;
grant select on public.activity_log to authenticated;
revoke insert, update, delete on public.audit_log from public, anon, authenticated;
grant select on public.audit_log to authenticated;

create or replace function public.write_activity_event(
  p_event_type text,
  p_target_type text default null,
  p_target_ref text default null,
  p_metadata jsonb default '{}'::jsonb
)
returns bigint
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_username text;
  v_role text;
  v_id bigint;
begin
  if auth.uid() is null then
    raise exception 'authentication_required' using errcode = '42501';
  end if;

  select profile.username, profile.role
  into v_username, v_role
  from public.users as profile
  where profile.auth_user_id = auth.uid();

  if v_username is null then
    raise exception 'profile_not_found' using errcode = 'P0002';
  end if;

  insert into public.activity_log (
    event_type,
    actor_user_id,
    actor_username,
    actor_role,
    target_type,
    target_ref,
    metadata
  ) values (
    p_event_type,
    auth.uid(),
    v_username,
    v_role,
    nullif(trim(p_target_type), ''),
    nullif(trim(p_target_ref), ''),
    coalesce(p_metadata, '{}'::jsonb)
  )
  returning id into v_id;

  return v_id;
end;
$$;

revoke all on function public.write_activity_event(text, text, text, jsonb)
from public, anon, authenticated;

create or replace function public.record_app_activity(
  p_event_type text,
  p_metadata jsonb default '{}'::jsonb
)
returns bigint
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_role text := public.current_app_role();
  v_key text;
begin
  if auth.uid() is null then
    raise exception 'authentication_required' using errcode = '42501';
  end if;
  if p_event_type not in ('auth.login', 'auth.logout', 'report.exported') then
    raise exception 'unsupported_activity_event' using errcode = '22023';
  end if;
  if coalesce(jsonb_typeof(p_metadata), 'null') <> 'object'
    or octet_length(coalesce(p_metadata, '{}'::jsonb)::text) > 8192 then
    raise exception 'invalid_activity_metadata' using errcode = '22023';
  end if;

  if p_event_type in ('auth.login', 'auth.logout') and p_metadata <> '{}'::jsonb then
    raise exception 'auth_activity_metadata_not_allowed' using errcode = '22023';
  end if;

  if p_event_type = 'report.exported' then
    if v_role not in ('clinician', 'auditor', 'admin') then
      raise exception 'insufficient_privilege' using errcode = '42501';
    end if;
    if not (p_metadata ? 'report_type')
      or not (p_metadata ? 'filename')
      or jsonb_typeof(p_metadata -> 'row_count') <> 'number' then
      raise exception 'incomplete_export_metadata' using errcode = '22023';
    end if;
    for v_key in select jsonb_object_keys(p_metadata)
    loop
      if v_key not in (
        'report_type', 'filename', 'row_count', 'gender', 'month', 'year',
        'smi_filter', 'residence_filter'
      ) then
        raise exception 'unsupported_export_metadata_key' using errcode = '22023';
      end if;
    end loop;
  end if;

  return public.write_activity_event(
    p_event_type,
    case when p_event_type = 'report.exported' then 'report' else 'session' end,
    case when p_event_type = 'report.exported' then p_metadata ->> 'report_type' else null end,
    p_metadata
  );
end;
$$;

revoke all on function public.record_app_activity(text, jsonb) from public, anon;
grant execute on function public.record_app_activity(text, jsonb) to authenticated;

create or replace function public.capture_business_activity()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_event_type text;
  v_target_type text;
  v_target_ref text;
begin
  -- Service-role maintenance and migrations do not represent a signed-in app
  -- user. They remain observable through platform/Postgres logs instead.
  if auth.uid() is null then
    if tg_op = 'DELETE' then return old; end if;
    return new;
  end if;

  if tg_table_name = 'patients' and tg_op = 'INSERT' then
    v_event_type := 'patient.registered';
    v_target_type := 'patient';
    v_target_ref := new.hn;
  elsif tg_table_name = 'patients' and tg_op = 'UPDATE' then
    v_event_type := 'patient.updated';
    v_target_type := 'patient';
    v_target_ref := new.hn;
  elsif tg_table_name = 'backup' and tg_op = 'INSERT' then
    v_event_type := 'patient.discharged';
    v_target_type := 'patient';
    v_target_ref := new.hn;
  elsif tg_table_name = 'assessments' and tg_op = 'INSERT'
    and new.record_type = 'shift_assessment' then
    v_event_type := 'assessment.saved';
    v_target_type := 'assessment';
    v_target_ref := new.hn;
  elsif tg_table_name = 'ior_records' and tg_op = 'INSERT' then
    v_event_type := 'ior.saved';
    v_target_type := 'ior';
    v_target_ref := new.hn;
  else
    if tg_op = 'DELETE' then return old; end if;
    return new;
  end if;

  perform public.write_activity_event(
    v_event_type,
    v_target_type,
    v_target_ref,
    '{}'::jsonb
  );
  if tg_op = 'DELETE' then return old; end if;
  return new;
end;
$$;

revoke all on function public.capture_business_activity()
from public, anon, authenticated;

drop trigger if exists activity_patients on public.patients;
create trigger activity_patients
  after insert or update on public.patients
  for each row execute function public.capture_business_activity();

drop trigger if exists activity_backup on public.backup;
create trigger activity_backup
  after insert on public.backup
  for each row execute function public.capture_business_activity();

drop trigger if exists activity_assessments on public.assessments;
create trigger activity_assessments
  after insert on public.assessments
  for each row execute function public.capture_business_activity();

drop trigger if exists activity_ior_records on public.ior_records;
create trigger activity_ior_records
  after insert on public.ior_records
  for each row execute function public.capture_business_activity();
