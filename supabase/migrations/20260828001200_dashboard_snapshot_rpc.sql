-- Return all dashboard aggregates in one authenticated PostgREST round trip.
-- The function remains SECURITY INVOKER so source-table RLS continues to apply.

create or replace function public.get_dashboard_snapshot()
returns table (
  patient_groups jsonb,
  monthly_trends jsonb
)
language sql
stable
security invoker
set search_path = ''
as $$
  select
    coalesce(
      (
        select jsonb_agg(
          jsonb_build_object(
            'gender', patient_group.gender,
            'smi_type', patient_group.smi_type,
            'oas_score', patient_group.oas_score,
            'admitting_doctor', patient_group.admitting_doctor,
            'patient_count', patient_group.patient_count
          )
          order by
            patient_group.gender nulls last,
            patient_group.smi_type nulls last,
            patient_group.oas_score nulls last,
            patient_group.admitting_doctor nulls last
        )
        from public.dashboard_patient_groups as patient_group
      ),
      '[]'::jsonb
    ) as patient_groups,
    coalesce(
      (
        select jsonb_agg(
          jsonb_build_object(
            'series', trend.series,
            'month_start', trend.month_start,
            'event_count', trend.event_count
          )
          order by trend.series, trend.month_start
        )
        from public.dashboard_monthly_trends as trend
      ),
      '[]'::jsonb
    ) as monthly_trends;
$$;

comment on function public.get_dashboard_snapshot() is
  'RLS-preserving dashboard aggregate snapshot returned in one Data API response.';

revoke all on function public.get_dashboard_snapshot() from public, anon;
grant execute on function public.get_dashboard_snapshot() to authenticated;
