-- Read-optimized projections for the routes that currently transfer whole
-- raw_data documents. The source JSON remains intact for legacy compatibility;
-- these views only reduce the result payload sent through PostgREST.

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
    candidate.residence_details
  from assessment_candidates as candidate
  where candidate.admission_rank = 1
),
backup_rows as (
  select
    'backup-' || archived.id::text as id,
    nullif(archived.raw_data ->> 'hn', '') as hn,
    coalesce(
      nullif(archived.raw_data ->> 'admission_date', ''),
      nullif(archived.raw_data ->> 'admit_date', '')
    ) as admission_date,
    nullif(archived.raw_data ->> 'gender', '') as gender,
    nullif(archived.raw_data ->> 'first_name', '') as first_name,
    nullif(archived.raw_data ->> 'last_name', '') as last_name,
    nullif(archived.raw_data ->> 'full_name', '') as full_name,
    nullif(archived.raw_data ->> 'diagnosis', '') as diagnosis,
    nullif(archived.raw_data ->> 'smi_v_result', '') as smi_v_result,
    nullif(archived.raw_data ->> 'substance_type', '') as substance_type,
    nullif(archived.raw_data ->> 'admitting_doctor', '') as admitting_doctor,
    nullif(archived.raw_data ->> 'residence_type', '') as residence_type,
    nullif(archived.raw_data ->> 'residence_district', '') as residence_district,
    nullif(archived.raw_data ->> 'residence_details', '') as residence_details
  from public.backup as archived
  where jsonb_typeof(archived.raw_data) = 'object'
    and coalesce(
      nullif(archived.raw_data ->> 'admission_date', ''),
      nullif(archived.raw_data ->> 'admit_date', '')
    ) is not null
)
select * from assessment_rows
union all
select * from backup_rows;

comment on view public.admission_statistics_rows is
  'RLS-preserving admission projection that avoids transferring complete legacy raw_data documents.';

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
  nullif(archived.raw_data ->> 'residence_details', '') as residence_details
from public.backup as archived
where archived.discharge_date is not null;

comment on view public.discharge_statistics_rows is
  'RLS-preserving discharge projection that exposes only report fields.';

create or replace view public.current_ipd_rows
with (security_invoker = true)
as
select
  patient.id,
  patient.hn,
  patient.prefix,
  patient.full_name,
  merged.data ->> 'first_name' as first_name,
  merged.data ->> 'last_name' as last_name,
  patient.gender,
  patient.age,
  patient.smi_type,
  coalesce(
    nullif(patient.smi_type, ''),
    merged.data ->> 'smi_v_result'
  ) as smi_v_result,
  patient.substance,
  merged.data ->> 'substance_use' as substance_use,
  merged.data ->> 'substance_type' as substance_type,
  patient.admit_date as admission_date,
  patient.admitting_doctor,
  merged.data ->> 'diagnosis' as diagnosis,
  merged.data ->> 'admission_source' as admission_source,
  patient.oas_score,
  patient.oas_risk,
  merged.data ->> 'oas_risk_level' as oas_risk_level,
  merged.data ->> 'aggressive_behavior' as aggressive_behavior,
  merged.data ->> 'residence_type' as residence_type,
  merged.data ->> 'residence_district' as residence_district,
  merged.data ->> 'residence_subdistrict' as residence_subdistrict,
  merged.data ->> 'residence_details' as residence_details,
  merged.data ->> 'caregiver_status' as caregiver_status,
  merged.data ->> 'caregiver_name' as caregiver_name,
  merged.data ->> 'caregiver_relation' as caregiver_relation,
  merged.data ->> 'caregiver_phone' as caregiver_phone,
  merged.data ->> 'patient_phone' as patient_phone,
  merged.data -> 'is_smi_v' as is_smi_v,
  assessment_admission.admission_date as assessment_admit_date,
  merged.data - array[
    'id', 'hn', 'prefix', 'full_name', 'first_name', 'last_name', 'gender',
    'age', 'smi_type', 'smi_v_result', 'substance', 'substance_use',
    'substance_type', 'admit_date', 'admission_date', 'admitting_doctor',
    'diagnosis', 'admission_source', 'oas_score', 'oas_risk',
    'oas_risk_level', 'aggressive_behavior', 'residence_type',
    'residence_district', 'residence_subdistrict', 'residence_details',
    'caregiver_status', 'caregiver_name', 'caregiver_relation',
    'caregiver_phone', 'patient_phone', 'is_smi_v'
  ]::text[] as extra_data,
  patient.created_at
from public.patients as patient
left join lateral (
  select assessment.raw_data
  from public.assessments as assessment
  where assessment.hn = patient.hn
    and assessment.record_type = 'smi-v_admission'
    and jsonb_typeof(assessment.raw_data) = 'object'
  order by
    assessment.assess_date desc nulls last,
    assessment.created_at desc,
    assessment.id desc
  limit 1
) as latest_admission on true
cross join lateral (
  select
    case when jsonb_typeof(patient.raw_data) = 'object'
      then patient.raw_data else '{}'::jsonb end
    ||
    case when jsonb_typeof(latest_admission.raw_data) = 'object'
      then latest_admission.raw_data else '{}'::jsonb end as data
) as merged
left join lateral (
  select nullif(assessment.raw_data ->> 'admission_date', '') as admission_date
  from public.assessments as assessment
  where assessment.hn = patient.hn
    and jsonb_typeof(assessment.raw_data) = 'object'
    and nullif(assessment.raw_data ->> 'admission_date', '') is not null
  order by assessment.created_at desc, assessment.id desc
  limit 1
) as assessment_admission on true;

comment on view public.current_ipd_rows is
  'RLS-preserving current inpatient projection with deterministic latest admission assessment.';

create or replace view public.dashboard_patient_groups
with (security_invoker = true)
as
select
  patient.gender,
  patient.smi_type,
  patient.oas_score,
  patient.admitting_doctor,
  count(*) as patient_count
from public.patients as patient
group by
  patient.gender,
  patient.smi_type,
  patient.oas_score,
  patient.admitting_doctor;

comment on view public.dashboard_patient_groups is
  'RLS-preserving grouped patient counts for the dashboard.';

revoke all on public.admission_statistics_rows from public, anon;
revoke all on public.discharge_statistics_rows from public, anon;
revoke all on public.current_ipd_rows from public, anon;
revoke all on public.dashboard_patient_groups from public, anon;

grant select on public.admission_statistics_rows to authenticated;
grant select on public.discharge_statistics_rows to authenticated;
grant select on public.current_ipd_rows to authenticated;
grant select on public.dashboard_patient_groups to authenticated;
