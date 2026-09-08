-- Count only IOR incidents above the baseline B level in the dashboard trend.
create or replace view public.dashboard_monthly_trends
with (security_invoker = true)
as
with bounds as (
  select (
    date_trunc('month', timezone('Asia/Bangkok', now()))::date
    - interval '7 months'
  )::date as first_month
), events as (
  select 'admit'::text as series, patient.admit_date as event_date
  from public.patients as patient, bounds
  where patient.admit_date >= bounds.first_month
    and patient.smi_type is not null
    and patient.smi_type <> 'ไม่เข้าข่าย SMI-V'
  union all
  select 'admit'::text, archived.admit_date
  from public.backup as archived, bounds
  where archived.admit_date >= bounds.first_month
    and archived.smi_type is not null
    and archived.smi_type <> 'ไม่เข้าข่าย SMI-V'
  union all
  select 'ior'::text, incident.record_date
  from public.ior_statistics as incident, bounds
  where incident.record_date >= bounds.first_month
    and incident.smi_type is not null
    and incident.smi_type <> 'ไม่เข้าข่าย SMI-V'
    and incident.level in ('C', 'D', 'E', 'F', 'G', 'H', 'I')
)
select
  event.series,
  date_trunc('month', event.event_date)::date as month_start,
  count(*) as event_count
from events as event
group by event.series, date_trunc('month', event.event_date)::date;

comment on view public.dashboard_monthly_trends is
  'Latest eight Bangkok calendar months; IOR includes only levels C through I.';

revoke all on public.dashboard_monthly_trends from public, anon;
grant select on public.dashboard_monthly_trends to authenticated;
