-- Expose the IOR behavior choices in the read-optimized incident report view.
-- The new column is appended so CREATE OR REPLACE VIEW remains compatible with
-- the existing view and its dependent statistics_report_years view.
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
  extract(month from incident.record_date)::integer as report_month,
  incident.behaviors
from public.ior_statistics as incident;

comment on view public.incident_statistics_rows is
  'RLS-preserving IOR projection with server-filterable date fields and behavior choices.';

revoke all on public.incident_statistics_rows from public, anon;
grant select on public.incident_statistics_rows to authenticated;
