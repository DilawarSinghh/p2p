-- ============================================================================
-- Row-Level Security & RBAC policies
-- Roles: admin, warden, technician, student
-- ============================================================================

alter table public.buildings           enable row level security;
alter table public.calendar            enable row level security;
alter table public.daily_summary       enable row level security;
alter table public.hourly_streams      enable row level security;
alter table public.manual_logs         enable row level security;
alter table public.waste_events_train  enable row level security;
alter table public.waste_events_test   enable row level security;
alter table public.green_credits       enable row level security;
alter table public.profiles            enable row level security;

-- Helper: current user's role from profiles.
create or replace function public.current_role()
returns varchar
language sql stable
as $$
  select role from public.profiles where id = auth.uid();
$$;

-- Reference / telemetry tables: readable by any authenticated user.
do $$
declare t text;
begin
  foreach t in array array[
    'buildings','calendar','daily_summary','hourly_streams',
    'waste_events_train','waste_events_test','green_credits'
  ] loop
    execute format(
      'drop policy if exists %I on public.%I;', t || '_read', t);
    execute format(
      'create policy %I on public.%I for select to authenticated using (true);',
      t || '_read', t);
  end loop;
end $$;

-- profiles: a user can read/update only their own row.
drop policy if exists profiles_self_read on public.profiles;
create policy profiles_self_read on public.profiles
  for select to authenticated using (id = auth.uid());
drop policy if exists profiles_self_upsert on public.profiles;
create policy profiles_self_upsert on public.profiles
  for insert to authenticated with check (id = auth.uid());
drop policy if exists profiles_self_update on public.profiles;
create policy profiles_self_update on public.profiles
  for update to authenticated using (id = auth.uid());

-- manual_logs: read for all authenticated.
drop policy if exists manual_logs_read on public.manual_logs;
create policy manual_logs_read on public.manual_logs
  for select to authenticated using (true);

-- manual_logs write:
--   admin       -> any building
--   technician  -> any building (facility / sensor calibration)
--   warden      -> only B05, B06, B07 (hostels + mess)
drop policy if exists manual_logs_write on public.manual_logs;
create policy manual_logs_write on public.manual_logs
  for insert to authenticated
  with check (
    public.current_role() in ('admin','technician')
    or (public.current_role() = 'warden'
        and normalized_building_id in ('B05','B06','B07'))
  );

-- admin may modify reference data / trigger config writes.
drop policy if exists buildings_admin_write on public.buildings;
create policy buildings_admin_write on public.buildings
  for all to authenticated
  using (public.current_role() = 'admin')
  with check (public.current_role() = 'admin');

-- Auto-create a profile row on signup.
create or replace function public.handle_new_user()
returns trigger
language plpgsql security definer
as $$
begin
  insert into public.profiles (id, email, role)
  values (new.id, new.email, 'student')
  on conflict (id) do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
