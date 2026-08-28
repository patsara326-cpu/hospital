-- Bound dashboard, IPD, and incident payloads while preserving source-table RLS.

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
)
select
  event.series,
  date_trunc('month', event.event_date)::date as month_start,
  count(*) as event_count
from events as event
group by event.series, date_trunc('month', event.event_date)::date;

comment on view public.dashboard_monthly_trends is
  'At most sixteen aggregate rows for the latest eight Bangkok calendar months.';

create or replace view public.current_ipd_list_rows
with (security_invoker = true)
as
select
  inpatient.id,
  inpatient.hn,
  inpatient.prefix,
  inpatient.full_name,
  inpatient.first_name,
  inpatient.last_name,
  inpatient.gender,
  inpatient.smi_v_result,
  case
    when inpatient.smi_v_result = 'ไม่เข้าข่าย SMI-V' then 'nonsmiv'
    else 'smiv'
  end as patient_group,
  inpatient.admission_date,
  inpatient.admitting_doctor,
  inpatient.created_at
from public.current_ipd_rows as inpatient;

comment on view public.current_ipd_list_rows is
  'Small current-IPD list projection; full clinical details are loaded on demand.';

create or replace view public.incident_statistics_rows
with (security_invoker = true)
as
select
  incident.id,
  incident.hn,
  incident.record_date,
  incident.level,
  incident.full_name,
  incident.gender,
  incident.smi_type,
  incident.record_date as report_date,
  extract(year from incident.record_date)::integer as report_year,
  extract(month from incident.record_date)::integer as report_month
from public.ior_statistics as incident;

comment on view public.incident_statistics_rows is
  'RLS-preserving IOR projection with server-filterable date fields.';

create or replace view public.statistics_report_years
with (security_invoker = true)
as
select 'admission'::text as report_type, report.gender, report.report_year
from public.admission_statistics_rows as report
where report.report_year is not null
group by report.gender, report.report_year
union all
select 'discharge'::text, report.gender, report.report_year
from public.discharge_statistics_rows as report
where report.report_year is not null
group by report.gender, report.report_year
union all
select 'incidents'::text, report.gender, report.report_year
from public.incident_statistics_rows as report
where report.report_year is not null
group by report.gender, report.report_year;

comment on view public.statistics_report_years is
  'Compact year options for server-filtered admission, discharge, and incident reports.';

create index if not exists patients_smiv_admit_date_idx
  on public.patients (admit_date desc)
  where admit_date is not null
    and smi_type is not null
    and smi_type <> 'ไม่เข้าข่าย SMI-V';

create index if not exists backup_smiv_admit_date_idx
  on public.backup (admit_date desc)
  where admit_date is not null
    and smi_type is not null
    and smi_type <> 'ไม่เข้าข่าย SMI-V';

create index if not exists ior_records_record_date_id_idx
  on public.ior_records (record_date desc, id)
  where record_date is not null;

revoke all on public.dashboard_monthly_trends from public, anon;
revoke all on public.current_ipd_list_rows from public, anon;
revoke all on public.incident_statistics_rows from public, anon;
revoke all on public.statistics_report_years from public, anon;

grant select on public.dashboard_monthly_trends to authenticated;
grant select on public.current_ipd_list_rows to authenticated;
grant select on public.incident_statistics_rows to authenticated;
grant select on public.statistics_report_years to authenticated;
