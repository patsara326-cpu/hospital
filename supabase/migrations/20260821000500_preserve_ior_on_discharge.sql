-- `patients` contains only active admissions. IOR records are clinical history
-- and must remain available after the matching patient row moves to `backup`.
alter table public.ior_records
  drop constraint if exists ior_records_hn_fkey;

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
  coalesce(active_patient.full_name, archived_patient.full_name) as full_name,
  coalesce(active_patient.gender, archived_patient.gender) as gender,
  coalesce(active_patient.smi_type, archived_patient.smi_type) as smi_type
from public.ior_records as incident
left join public.patients as active_patient
  on active_patient.hn = incident.hn
  and (
    active_patient.admit_date is null
    or active_patient.admit_date <= incident.record_date
  )
left join lateral (
  select
    archived.full_name,
    archived.gender,
    archived.smi_type
  from public.backup as archived
  where archived.hn = incident.hn
  order by
    case
      when (
        archived.admit_date is null
        or archived.admit_date <= incident.record_date
      ) and (
        archived.discharge_date is null
        or incident.record_date <= archived.discharge_date
      ) then 0
      else 1
    end,
    archived.discharge_date desc nulls last,
    archived.discharged_at desc
  limit 1
) as archived_patient on active_patient.hn is null;

revoke all on public.ior_statistics from public, anon;
grant select on public.ior_statistics to authenticated;
