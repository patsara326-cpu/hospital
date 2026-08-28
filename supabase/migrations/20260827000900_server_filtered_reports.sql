-- Server-filterable report dates and compact year options for paginated reports.
-- Invalid legacy dates remain visible when no date filter is selected, but receive
-- a NULL report_date so a malformed historical value can never abort a query.

create or replace function public.try_report_date(value text)
returns date
language plpgsql
immutable
strict
set search_path = ''
as $$
begin
  if value ~ '^\d{4}-\d{2}-\d{2}$' then
    return value::date;
  end if;

  if value ~ '^\d{4}-\d{2}-\d{2}[T ]' then
    return (value::timestamptz at time zone 'Asia/Bangkok')::date;
  end if;

  return null;
exception
  when others then
    return null;
end;
$$;

revoke all on function public.try_report_date(text) from public, anon;
grant execute on function public.try_report_date(text) to authenticated, service_role;

create or replace view public.admission_statistics_rows
with (security_invoker = true)
as
with assessment_candidates as (
  select
    assessment.id,
    coalesce(nullif(assessment.raw_data ->> 'hn', ''), assessment.hn) as hn,
    coalesce(
      nullif(assessment.raw_data ->> 'admission_date', ''),
      nullif(assessment.raw_data ->> 'admit_date', '')
    ) as admission_date,
    nullif(assessment.raw_data ->> 'gender', '') as gender,
    nullif(assessment.raw_data ->> 'first_name', '') as first_name,
    nullif(assessment.raw_data ->> 'last_name', '') as last_name,
    nullif(assessment.raw_data ->> 'full_name', '') as full_name,
    nullif(assessment.raw_data ->> 'diagnosis', '') as diagnosis,
    nullif(assessment.raw_data ->> 'smi_v_result', '') as smi_v_result,
    nullif(assessment.raw_data ->> 'substance_type', '') as substance_type,
    nullif(assessment.raw_data ->> 'admitting_doctor', '') as admitting_doctor,
    nullif(assessment.raw_data ->> 'residence_type', '') as residence_type,
    nullif(assessment.raw_data ->> 'residence_district', '') as residence_district,
    nullif(assessment.raw_data ->> 'residence_details', '') as residence_details,
    public.try_report_date(coalesce(
      nullif(assessment.raw_data ->> 'admission_date', ''),
      nullif(assessment.raw_data ->> 'admit_date', '')
    )) as report_date,
    row_number() over (
      partition by
        coalesce(nullif(assessment.raw_data ->> 'hn', ''), assessment.hn, ''),
        coalesce(
          nullif(assessment.raw_data ->> 'admission_date', ''),
          nullif(assessment.raw_data ->> 'admit_date', '')
        )
      order by assessment.created_at desc, assessment.id desc
    ) as admission_rank
  from public.assessments as assessment
  where jsonb_typeof(assessment.raw_data) = 'object'
    and coalesce(
      nullif(assessment.raw_data ->> 'admission_date', ''),
      nullif(assessment.raw_data ->> 'admit_date', '')
    ) is not null
),
assessment_rows as (
  select
    'assessment-' || candidate.id::text as id,
    candidate.hn,
    candidate.admission_date,
    candidate.gender,
    candidate.first_name,
    candidate.last_name,
    candidate.full_name,
    candidate.diagnosis,
    candidate.smi_v_result,
    candidate.substance_type,
    candidate.admitting_doctor,
    candidate.residence_type,
    candidate.residence_district,
    candidate.residence_details,
    candidate.report_date
  from assessment_candidates as candidate
  where candidate.admission_rank = 1
),
backup_rows as (
  select
    'backup-' || archived.id::text as id,
    coalesce(nullif(archived.raw_data ->> 'hn', ''), archived.hn) as hn,
    coalesce(
      nullif(archived.raw_data ->> 'admission_date', ''),
      nullif(archived.raw_data ->> 'admit_date', ''),
      archived.admit_date::text
    ) as admission_date,
    coalesce(nullif(archived.raw_data ->> 'gender', ''), archived.gender) as gender,
    nullif(archived.raw_data ->> 'first_name', '') as first_name,
    nullif(archived.raw_data ->> 'last_name', '') as last_name,
    coalesce(nullif(archived.raw_data ->> 'full_name', ''), archived.full_name) as full_name,
    nullif(archived.raw_data ->> 'diagnosis', '') as diagnosis,
    coalesce(nullif(archived.raw_data ->> 'smi_v_result', ''), archived.smi_type) as smi_v_result,
    nullif(archived.raw_data ->> 'substance_type', '') as substance_type,
    coalesce(nullif(archived.raw_data ->> 'admitting_doctor', ''), archived.admitting_doctor) as admitting_doctor,
    nullif(archived.raw_data ->> 'residence_type', '') as residence_type,
    nullif(archived.raw_data ->> 'residence_district', '') as residence_district,
    nullif(archived.raw_data ->> 'residence_details', '') as residence_details,
    public.try_report_date(coalesce(
      nullif(archived.raw_data ->> 'admission_date', ''),
      nullif(archived.raw_data ->> 'admit_date', ''),
      archived.admit_date::text
    )) as report_date
  from public.backup as archived
  where jsonb_typeof(archived.raw_data) = 'object'
    and coalesce(
      nullif(archived.raw_data ->> 'admission_date', ''),
      nullif(archived.raw_data ->> 'admit_date', ''),
      archived.admit_date::text
    ) is not null
)
select
  report.*,
  extract(year from report.report_date)::integer as report_year,
  extract(month from report.report_date)::integer as report_month
from (
  select * from assessment_rows
  union all
  select * from backup_rows
) as report;

comment on view public.admission_statistics_rows is
  'RLS-preserving admission projection with a safe server-filterable report date.';

create or replace view public.discharge_statistics_rows
with (security_invoker = true)
as
select
  archived.id::text as id,
  archived.hn,
  archived.full_name,
  archived.gender,
  archived.discharge_date,
  archived.discharge_type,
  archived.last_diagnosis,
  archived.smi_type,
  archived.admitting_doctor,
  nullif(archived.raw_data ->> 'first_name', '') as first_name,
  nullif(archived.raw_data ->> 'last_name', '') as last_name,
  nullif(archived.raw_data ->> 'substance_type', '') as substance_type,
  nullif(archived.raw_data ->> 'residence_type', '') as residence_type,
  nullif(archived.raw_data ->> 'residence_district', '') as residence_district,
  nullif(archived.raw_data ->> 'residence_details', '') as residence_details,
  archived.discharge_date as report_date,
  extract(year from archived.discharge_date)::integer as report_year,
  extract(month from archived.discharge_date)::integer as report_month
from public.backup as archived
where archived.discharge_date is not null;

comment on view public.discharge_statistics_rows is
  'RLS-preserving discharge projection with a server-filterable report date.';

create or replace view public.statistics_report_years
with (security_invoker = true)
as
select
  'admission'::text as report_type,
  report.gender,
  report.report_year
from public.admission_statistics_rows as report
where report.report_year is not null
group by report.gender, report.report_year
union all
select
  'discharge'::text as report_type,
  report.gender,
  report.report_year
from public.discharge_statistics_rows as report
where report.report_year is not null
group by report.gender, report.report_year;

comment on view public.statistics_report_years is
  'Compact year options for server-filtered admission and discharge reports.';

create index if not exists assessments_admission_report_filter_idx
  on public.assessments (
    ((raw_data ->> 'gender')),
    (public.try_report_date(coalesce(
      nullif(raw_data ->> 'admission_date', ''),
      nullif(raw_data ->> 'admit_date', '')
    )))
  )
  where jsonb_typeof(raw_data) = 'object';

create index if not exists backup_admission_report_filter_idx
  on public.backup (
    ((raw_data ->> 'gender')),
    (public.try_report_date(coalesce(
      nullif(raw_data ->> 'admission_date', ''),
      nullif(raw_data ->> 'admit_date', '')
    )))
  )
  where jsonb_typeof(raw_data) = 'object'
    and coalesce(
      nullif(raw_data ->> 'admission_date', ''),
      nullif(raw_data ->> 'admit_date', '')
    ) is not null;

create index if not exists backup_gender_admit_date_idx
  on public.backup (gender, admit_date desc)
  where admit_date is not null;

revoke all on public.admission_statistics_rows from public, anon;
revoke all on public.discharge_statistics_rows from public, anon;
revoke all on public.statistics_report_years from public, anon;

grant select on public.admission_statistics_rows to authenticated;
grant select on public.discharge_statistics_rows to authenticated;
grant select on public.statistics_report_years to authenticated;
