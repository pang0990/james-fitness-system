-- James Fitness System cloud state v1
create table if not exists public.user_states (
  user_id uuid primary key references auth.users(id) on delete cascade,
  state jsonb not null default '{}'::jsonb,
  revision bigint not null default 0,
  updated_at timestamptz not null default now()
);

alter table public.user_states enable row level security;

drop policy if exists "user_states_select_own" on public.user_states;
create policy "user_states_select_own"
on public.user_states for select
using (auth.uid() = user_id);

drop policy if exists "user_states_insert_own" on public.user_states;
create policy "user_states_insert_own"
on public.user_states for insert
with check (auth.uid() = user_id);

drop policy if exists "user_states_update_own" on public.user_states;
create policy "user_states_update_own"
on public.user_states for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "user_states_delete_own" on public.user_states;
create policy "user_states_delete_own"
on public.user_states for delete
using (auth.uid() = user_id);
