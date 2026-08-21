-- Normalize activity and audit rows for the privileged admin log viewer.
-- The view stores no additional personal or clinical data: staff names are
-- resolved from the current profile at read time and underlying RLS remains in force.
create or replace view public.admin_log_entries
with (security_invoker = true)
as
select
  'activity'::text as source,
  'activity:' || activity.id::text as entry_id,
  activity.occurred_at,
  activity.actor_user_id,
  activity.actor_username,
  nullif(trim(concat_ws(
    ' ',
    nullif(profile.prefix, ''),
    nullif(profile.first_name, ''),
    nullif(profile.last_name, '')
  )), '') as actor_display_name,
  activity.actor_role,
  activity.event_type as event_code,
  activity.target_type,
  activity.target_ref,
  activity.metadata,
  '{}'::text[] as changed_fields,
  null::bigint as transaction_id,
  lower(concat_ws(
    ' ',
    activity.actor_username,
    profile.prefix,
    profile.first_name,
    profile.last_name,
    activity.event_type,
    activity.target_type,
    activity.target_ref
  )) as search_text
from public.activity_log as activity
left join public.users as profile
  on profile.auth_user_id = activity.actor_user_id

union all

select
  'audit'::text as source,
  'audit:' || audit.id::text as entry_id,
  audit.changed_at as occurred_at,
  audit.changed_by as actor_user_id,
  audit.changed_by_username as actor_username,
  nullif(trim(concat_ws(
    ' ',
    nullif(profile.prefix, ''),
    nullif(profile.first_name, ''),
    nullif(profile.last_name, '')
  )), '') as actor_display_name,
  audit.changed_role as actor_role,
  lower(audit.table_name) || '.' || lower(audit.operation) as event_code,
  audit.table_name as target_type,
  audit.record_ref as target_ref,
  '{}'::jsonb as metadata,
  audit.changed_fields,
  audit.transaction_id,
  lower(concat_ws(
    ' ',
    audit.changed_by_username,
    profile.prefix,
    profile.first_name,
    profile.last_name,
    audit.table_name,
    audit.operation,
    audit.record_ref,
    array_to_string(audit.changed_fields, ' ')
  )) as search_text
from public.audit_log as audit
left join public.users as profile
  on profile.auth_user_id = audit.changed_by;

comment on view public.admin_log_entries is
  'Privileged, privacy-minimized union of activity and audit logs with current staff display names.';

revoke all on public.admin_log_entries from public, anon;
grant select on public.admin_log_entries to authenticated;

create index if not exists activity_log_role_time_idx
  on public.activity_log (actor_role, occurred_at desc);
create index if not exists audit_log_role_time_idx
  on public.audit_log (changed_role, changed_at desc);
create index if not exists audit_log_event_time_idx
  on public.audit_log (table_name, operation, changed_at desc);
