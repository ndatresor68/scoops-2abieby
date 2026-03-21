create extension if not exists pgcrypto;

create table if not exists public.user_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  device_id text not null,
  created_at timestamptz not null default timezone('utc', now()),
  last_active timestamptz not null default timezone('utc', now()),
  is_active boolean not null default true,
  status text not null default 'active',
  grace_until timestamptz null
);

create unique index if not exists idx_user_sessions_user_device
  on public.user_sessions (user_id, device_id);

create index if not exists idx_user_sessions_user_active
  on public.user_sessions (user_id, is_active, last_active desc);

alter table public.user_sessions enable row level security;

create policy "Users can read their own sessions"
on public.user_sessions
for select
to authenticated
using (auth.uid() = user_id);

create policy "Users can insert their own sessions"
on public.user_sessions
for insert
to authenticated
with check (auth.uid() = user_id);

create policy "Users can update their own sessions"
on public.user_sessions
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);
