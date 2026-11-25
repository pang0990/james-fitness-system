-- JFS account synchronization, first production-safe slice.
-- All app domains travel as a validated, versioned snapshot during the
-- transition to normalized per-domain tables; never expose service_role.
begin;

create table if not exists public.jfs_account_snapshots (
  owner_id uuid primary key references auth.users(id) on delete cascade,
  cloud_revision bigint not null check (cloud_revision > 0),
  state jsonb not null check (jsonb_typeof(state) = 'object'),
  updated_at timestamptz not null default now()
);

alter table public.jfs_account_snapshots enable row level security;
revoke all on public.jfs_account_snapshots from public, anon, authenticated;
-- Browser clients can only SELECT their row. All writes must use the CAS RPC.
grant select on public.jfs_account_snapshots to authenticated;

create policy "jfs_account_snapshots_read_own"
  on public.jfs_account_snapshots for select to authenticated
  using (owner_id = (select auth.uid()));

-- Compare-and-swap saves: no last-writer-wins overwrite on two devices.
-- SECURITY DEFINER allows this one narrow CAS write without granting
-- clients direct UPDATE/INSERT (which would bypass revision protection).
create or replace function public.jfs_save_account_snapshot(
  p_expected_revision bigint,
  p_state jsonb
) returns bigint
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_owner uuid := (select auth.uid());
  v_revision bigint;
begin
  if v_owner is null or
     current_setting('request.jwt.claim.role', true) is distinct from 'authenticated'
  then raise exception 'JFS_AUTH_REQUIRED'; end if;
  if p_expected_revision is null or p_expected_revision < 0
     or jsonb_typeof(p_state) <> 'object'
     or jsonb_typeof(p_state->'revision') <> 'number'
     or octet_length(p_state::text) > 8388608 then
    raise exception 'JFS_INVALID_SNAPSHOT';
  end if;

  if p_expected_revision = 0 then
    insert into public.jfs_account_snapshots (owner_id, cloud_revision, state)
    values (v_owner, 1, p_state)
    on conflict (owner_id) do nothing
    returning cloud_revision into v_revision;
  else
    update public.jfs_account_snapshots
      set cloud_revision = cloud_revision + 1,
          state = p_state,
          updated_at = now()
    where owner_id = v_owner and cloud_revision = p_expected_revision
    returning cloud_revision into v_revision;
  end if;

  if v_revision is null then raise exception 'JFS_SYNC_CONFLICT'; end if;
  return v_revision;
end;
$$;

revoke all on function public.jfs_save_account_snapshot(bigint, jsonb)
  from public, anon, authenticated;
grant execute on function public.jfs_save_account_snapshot(bigint, jsonb) to authenticated;
commit;
