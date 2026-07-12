-- GAM ANALYTICS WEB — BANCO DE DADOS V0.1
-- Execute este arquivo no SQL Editor do Supabase.

create extension if not exists pgcrypto;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'officer_role') then
    create type public.officer_role as enum ('Oficial GAM', 'Estagiário');
  end if;

  if not exists (select 1 from pg_type where typname = 'officer_status') then
    create type public.officer_status as enum ('Ativo', 'Inativo');
  end if;
end $$;

create table if not exists public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default 'Administrador GAM',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.officers (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  registration text not null,
  name text not null,
  role public.officer_role not null,
  status public.officer_status not null default 'Ativo',
  prison_goal integer not null check (prison_goal >= 0),
  pursuit_goal integer not null check (pursuit_goal >= 0),
  photo_url text,
  photo_path text,
  discord_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (owner_id, registration)
);

create table if not exists public.weekly_entries (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  officer_id uuid not null references public.officers(id) on delete restrict,
  year integer not null check (year between 2020 and 2100),
  month integer not null check (month between 1 and 12),
  week integer not null check (week between 1 and 5),
  prisons integer not null default 0 check (prisons >= 0),
  pursuits integer not null default 0 check (pursuits >= 0),
  note text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (owner_id, officer_id, year, month, week)
);

create table if not exists public.monthly_closures (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  year integer not null check (year between 2020 and 2100),
  month integer not null check (month between 1 and 12),
  snapshot jsonb not null,
  integrity_hash text not null,
  closed_at timestamptz not null default now(),
  unique (owner_id, year, month)
);

create table if not exists public.audit_logs (
  id bigint generated always as identity primary key,
  owner_id uuid not null references auth.users(id) on delete cascade,
  entity text not null,
  entity_id text not null,
  action text not null,
  old_data jsonb,
  new_data jsonb,
  created_at timestamptz not null default now()
);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists officers_set_updated_at on public.officers;
create trigger officers_set_updated_at
before update on public.officers
for each row execute function public.set_updated_at();

drop trigger if exists entries_set_updated_at on public.weekly_entries;
create trigger entries_set_updated_at
before update on public.weekly_entries
for each row execute function public.set_updated_at();

create or replace function public.create_profile_for_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (user_id, display_name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'display_name', 'Administrador GAM')
  )
  on conflict (user_id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.create_profile_for_new_user();

create or replace function public.write_audit_log()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_owner uuid;
  v_entity_id text;
begin
  v_owner := coalesce(new.owner_id, old.owner_id);
  v_entity_id := coalesce(new.id, old.id)::text;

  insert into public.audit_logs (
    owner_id,
    entity,
    entity_id,
    action,
    old_data,
    new_data
  )
  values (
    v_owner,
    tg_table_name,
    v_entity_id,
    tg_op,
    case when tg_op in ('UPDATE', 'DELETE') then to_jsonb(old) end,
    case when tg_op in ('INSERT', 'UPDATE') then to_jsonb(new) end
  );

  return coalesce(new, old);
end;
$$;

drop trigger if exists officers_audit on public.officers;
create trigger officers_audit
after insert or update or delete on public.officers
for each row execute function public.write_audit_log();

drop trigger if exists entries_audit on public.weekly_entries;
create trigger entries_audit
after insert or update or delete on public.weekly_entries
for each row execute function public.write_audit_log();

create or replace function public.close_month(p_year integer, p_month integer)
returns setof public.monthly_closures
language plpgsql
security definer
set search_path = public
as $$
declare
  v_owner uuid := auth.uid();
  v_snapshot jsonb;
  v_hash text;
begin
  if v_owner is null then
    raise exception 'Usuário não autenticado';
  end if;

  if p_month not between 1 and 12 then
    raise exception 'Mês inválido';
  end if;

  select jsonb_build_object(
    'year', p_year,
    'month', p_month,
    'generated_at', now(),
    'officers', coalesce((
      select jsonb_agg(to_jsonb(o) order by o.registration)
      from public.officers o
      where o.owner_id = v_owner
    ), '[]'::jsonb),
    'entries', coalesce((
      select jsonb_agg(to_jsonb(e) order by e.week, e.created_at)
      from public.weekly_entries e
      where e.owner_id = v_owner
        and e.year = p_year
        and e.month = p_month
    ), '[]'::jsonb)
  )
  into v_snapshot;

  v_hash := encode(digest(v_snapshot::text, 'sha256'), 'hex');

  return query
  insert into public.monthly_closures (
    owner_id,
    year,
    month,
    snapshot,
    integrity_hash,
    closed_at
  )
  values (
    v_owner,
    p_year,
    p_month,
    v_snapshot,
    v_hash,
    now()
  )
  on conflict (owner_id, year, month)
  do update set
    snapshot = excluded.snapshot,
    integrity_hash = excluded.integrity_hash,
    closed_at = excluded.closed_at
  returning *;
end;
$$;

alter table public.profiles enable row level security;
alter table public.officers enable row level security;
alter table public.weekly_entries enable row level security;
alter table public.monthly_closures enable row level security;
alter table public.audit_logs enable row level security;

drop policy if exists "profiles_owner_all" on public.profiles;
create policy "profiles_owner_all"
on public.profiles
for all
using (user_id = auth.uid())
with check (user_id = auth.uid());

drop policy if exists "officers_owner_all" on public.officers;
create policy "officers_owner_all"
on public.officers
for all
using (owner_id = auth.uid())
with check (owner_id = auth.uid());

drop policy if exists "entries_owner_all" on public.weekly_entries;
create policy "entries_owner_all"
on public.weekly_entries
for all
using (owner_id = auth.uid())
with check (owner_id = auth.uid());

drop policy if exists "closures_owner_select" on public.monthly_closures;
create policy "closures_owner_select"
on public.monthly_closures
for select
using (owner_id = auth.uid());

drop policy if exists "closures_owner_insert" on public.monthly_closures;
create policy "closures_owner_insert"
on public.monthly_closures
for insert
with check (owner_id = auth.uid());

drop policy if exists "closures_owner_update" on public.monthly_closures;
create policy "closures_owner_update"
on public.monthly_closures
for update
using (owner_id = auth.uid())
with check (owner_id = auth.uid());

drop policy if exists "audit_owner_select" on public.audit_logs;
create policy "audit_owner_select"
on public.audit_logs
for select
using (owner_id = auth.uid());

grant execute on function public.close_month(integer, integer) to authenticated;
