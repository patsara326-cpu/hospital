-- Do not create audit entries for data mutations that are unavailable in the app.
-- Existing audit history is intentionally retained.
create or replace function public.capture_audit_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_old jsonb;
  v_new jsonb;
  v_changed_fields text[];
  v_username text;
begin
  if (tg_table_name = 'users' and tg_op in ('UPDATE', 'DELETE'))
    or (tg_table_name = 'patients' and tg_op = 'DELETE')
    or (tg_table_name = 'ior_records' and tg_op in ('UPDATE', 'DELETE'))
    or (tg_table_name = 'backup' and tg_op in ('UPDATE', 'DELETE'))
  then
    if tg_op = 'DELETE' then
      return old;
    end if;
    return new;
  end if;

  v_old := case when tg_op in ('UPDATE', 'DELETE') then to_jsonb(old) else null end;
  v_new := case when tg_op in ('INSERT', 'UPDATE') then to_jsonb(new) else null end;

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

revoke all on function public.capture_audit_change() from public, anon, authenticated;
