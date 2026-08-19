-- A polymorphic trigger record cannot safely reference a column that is absent
-- from one of its target tables. Read the assessment discriminator through
-- JSONB so IOR, patient, and backup writes remain valid.

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
  v_new jsonb := case when tg_op <> 'DELETE' then to_jsonb(new) else '{}'::jsonb end;
begin
  if auth.uid() is null then
    if tg_op = 'DELETE' then return old; end if;
    return new;
  end if;

  if tg_table_name = 'patients' and tg_op = 'INSERT' then
    v_event_type := 'patient.registered';
    v_target_type := 'patient';
    v_target_ref := v_new ->> 'hn';
  elsif tg_table_name = 'patients' and tg_op = 'UPDATE' then
    v_event_type := 'patient.updated';
    v_target_type := 'patient';
    v_target_ref := v_new ->> 'hn';
  elsif tg_table_name = 'backup' and tg_op = 'INSERT' then
    v_event_type := 'patient.discharged';
    v_target_type := 'patient';
    v_target_ref := v_new ->> 'hn';
  elsif tg_table_name = 'assessments' and tg_op = 'INSERT'
    and v_new ->> 'record_type' = 'shift_assessment' then
    v_event_type := 'assessment.saved';
    v_target_type := 'assessment';
    v_target_ref := v_new ->> 'hn';
  elsif tg_table_name = 'ior_records' and tg_op = 'INSERT' then
    v_event_type := 'ior.saved';
    v_target_type := 'ior';
    v_target_ref := v_new ->> 'hn';
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
