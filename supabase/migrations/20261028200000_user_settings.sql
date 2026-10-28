-- PowerSave Session 7: synced settings for signed-in users.
-- Apply on the dedicated PowerSave Supabase project only.

create table if not exists public.user_settings (
  user_id uuid primary key references auth.users (id) on delete cascade,
  plan text not null check (plan in ('TOU', 'ULO', 'TIERED')),
  chores jsonb not null default '[]'::jsonb,
  quiet_hours boolean not null default false,
  units text not null default 'cents' check (units in ('cents', 'dollars')),
  theme text check (theme is null or theme in ('light', 'dark')),
  updated_at timestamptz not null default now()
);

alter table public.user_settings enable row level security;

create policy "Users can select own settings"
  on public.user_settings
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy "Users can insert own settings"
  on public.user_settings
  for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

create policy "Users can update own settings"
  on public.user_settings
  for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "Users can delete own settings"
  on public.user_settings
  for delete
  to authenticated
  using ((select auth.uid()) = user_id);

-- Account deletion: remove auth user (cascades user_settings).
-- Kept as a single SECURITY DEFINER function; only callable by the signed-in user.
create or replace function public.delete_own_account()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then
    raise exception 'Not authenticated';
  end if;
  delete from public.user_settings where user_id = uid;
  delete from auth.users where id = uid;
end;
$$;

revoke all on function public.delete_own_account() from public;
grant execute on function public.delete_own_account() to authenticated;
