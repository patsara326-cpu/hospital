-- New registrations are immediately usable as clinical staff.
-- Keep `pending` only as the deny-by-default result of current_app_role() when
-- an authenticated account has no valid profile; it is no longer assigned by
-- the registration trigger or exposed as an approval workflow.

alter table public.users
  alter column role set default 'clinician';

update public.users
set role = 'clinician'
where role = 'pending';

create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_username text := coalesce(new.raw_user_meta_data ->> 'username', split_part(new.email, '@', 1));
begin
  insert into public.users (auth_user_id, username, prefix, first_name, last_name, role)
  values (
    new.id,
    v_username,
    nullif(new.raw_user_meta_data ->> 'prefix', ''),
    coalesce(nullif(new.raw_user_meta_data ->> 'first_name', ''), v_username),
    coalesce(nullif(new.raw_user_meta_data ->> 'last_name', ''), '-'),
    'clinician'
  )
  on conflict (username) do update
    set auth_user_id = excluded.auth_user_id,
        prefix = coalesce(excluded.prefix, public.users.prefix),
        first_name = excluded.first_name,
        last_name = excluded.last_name,
        role = case
          when public.users.role = 'pending' then 'clinician'
          else public.users.role
        end;
  return new;
end;
$$;

revoke all on function public.handle_new_auth_user() from public, anon, authenticated;

drop policy if exists users_insert_own_pending on public.users;
drop policy if exists users_insert_own_clinician on public.users;
create policy users_insert_own_clinician on public.users for insert to authenticated
with check (auth_user_id = (select auth.uid()) and role = 'clinician');

comment on column public.users.role is
  'New profiles are clinicians; auditor/admin are privileged roles; pending is reserved as a deny-by-default sentinel.';
