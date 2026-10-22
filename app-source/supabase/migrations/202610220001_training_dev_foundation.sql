-- JFS Training-first: DEV-ONLY cloud foundation, NOT applied to production.
-- Run only in an explicitly isolated Supabase development project.
-- Separate schema is intentionally NOT added to PostgREST exposed schemas.
begin;

create schema if not exists jfs_training_dev;
revoke all on schema jfs_training_dev from public, anon, authenticated;

create table if not exists jfs_training_dev.session_projection (
  owner_id uuid not null,
  session_id text not null check (length(session_id) between 1 and 128),
  revision bigint not null default 1 check (revision >= 1),
  payload jsonb not null check (jsonb_typeof(payload) = 'object'),
  written_at timestamptz not null default now(),
  primary key (owner_id, session_id)
);
create index if not exists jfs_training_dev_session_updated
  on jfs_training_dev.session_projection(owner_id, written_at desc, session_id);

create table if not exists jfs_training_dev.command_ledger (
  owner_id uuid not null,
  command_id uuid not null,
  request jsonb not null,
  response jsonb not null,
  applied_at timestamptz not null default now(),
  primary key (owner_id, command_id)
);
create index if not exists jfs_training_dev_command_applied
  on jfs_training_dev.command_ledger(owner_id, applied_at desc);

alter table jfs_training_dev.session_projection enable row level security;
alter table jfs_training_dev.command_ledger enable row level security;
alter table jfs_training_dev.session_projection force row level security;
alter table jfs_training_dev.command_ledger force row level security;

drop policy if exists session_projection_account on jfs_training_dev.session_projection;
create policy session_projection_account on jfs_training_dev.session_projection
  for all to authenticated
  using (owner_id = (select auth.uid()))
  with check (owner_id = (select auth.uid()));
drop policy if exists command_ledger_account on jfs_training_dev.command_ledger;
create policy command_ledger_account on jfs_training_dev.command_ledger
  for all to authenticated
  using (owner_id = (select auth.uid()))
  with check (owner_id = (select auth.uid()));

-- Never allow a browser client to SELECT/INSERT/UPDATE private tables directly.
revoke all on all tables in schema jfs_training_dev from public, anon, authenticated;

-- Dev-only, narrowly scoped RPC. This stores an account-owned Session projection.
-- This is NOT yet server-authoritative Cycle advancement or a full Sync API.
-- IDempotency is by (verified JWT owner, command UUID), including exact payload.
create or replace function public.jfs_dev_apply_session_v1(
  p_command_id uuid,
  p_session_id text,
  p_expected_revision bigint,
  p_session jsonb
) returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_owner uuid := auth.uid();
  v_request jsonb;
  v_prior jfs_training_dev.command_ledger%rowtype;
  v_existing jfs_training_dev.session_projection%rowtype;
  v_new_revision bigint;
  v_response jsonb;
begin
  if v_owner is null or current_setting('request.jwt.claim.role', true) is distinct from 'authenticated' then
    raise exception 'Verified authenticated identity required' using errcode = '42501';
  end if;
  if p_command_id is null or p_session_id is null or
     length(p_session_id) not between 1 and 128 or
     p_expected_revision is null or p_expected_revision < 0 then
    raise exception 'Invalid training command identifiers or revision' using errcode = '22023';
  end if;
  if p_session is null or jsonb_typeof(p_session) <> 'object' or
     pg_column_size(p_session) > 131072 or
     p_session->>'id' is distinct from p_session_id or
     coalesce(length(p_session->>'name'), 0) not between 1 and 160 or
     (p_session->>'status') not in ('in_progress','completed','discarded') or
     coalesce(p_session->>'date','') !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' or
     jsonb_typeof(p_session->'exercises') is distinct from 'array' or
     jsonb_array_length(p_session->'exercises') > 100 or
     coalesce(length(p_session->>'createdAt'),0) not between 10 and 100 or
     p_session ? 'setDrafts' or
     p_session->>'cycleCounted' = 'true' then
    raise exception 'Invalid or not-yet-syncable Session payload' using errcode = '22023';
  end if;

  v_request := jsonb_build_object(
    'session_id', p_session_id,
    'expected_revision', p_expected_revision,
    'session', p_session
  );

  -- Serialize all writes by account to make retries and version checks atomic.
  perform pg_advisory_xact_lock(hashtextextended(v_owner::text, 6139));
  select * into v_prior
    from jfs_training_dev.command_ledger
    where owner_id = v_owner and command_id = p_command_id;
  if found then
    if v_prior.request is distinct from v_request then
      raise exception 'Command ID reused with different payload' using errcode = '22023';
    end if;
    return v_prior.response;
  end if;

  select * into v_existing
    from jfs_training_dev.session_projection
    where owner_id = v_owner and session_id = p_session_id for update;
  if found then
    if v_existing.revision <> p_expected_revision then
      raise exception 'TRAINING_VERSION_CONFLICT' using errcode = '40001';
    end if;
    if v_existing.payload->>'status' in ('completed','discarded') then
      raise exception 'Terminal Session is immutable in dev sync v1' using errcode = '22023';
    end if;
    v_new_revision := v_existing.revision + 1;
    update jfs_training_dev.session_projection
       set payload = p_session, revision = v_new_revision, written_at = now()
     where owner_id = v_owner and session_id = p_session_id;
  else
    if p_expected_revision <> 0 then
      raise exception 'TRAINING_VERSION_CONFLICT' using errcode = '40001';
    end if;
    v_new_revision := 1;
    insert into jfs_training_dev.session_projection(
      owner_id, session_id, revision, payload
    ) values (v_owner, p_session_id, v_new_revision, p_session);
  end if;

  v_response := jsonb_build_object(
    'command_id', p_command_id,
    'session_id', p_session_id,
    'revision', v_new_revision,
    'outcome', 'applied'
  );
  insert into jfs_training_dev.command_ledger(owner_id, command_id, request, response)
    values(v_owner, p_command_id, v_request, v_response);
  return v_response;
end;
$$;

revoke all on function public.jfs_dev_apply_session_v1(uuid,text,bigint,jsonb)
  from public, anon, authenticated;
grant execute on function public.jfs_dev_apply_session_v1(uuid,text,bigint,jsonb)
  to authenticated;
comment on function public.jfs_dev_apply_session_v1(uuid,text,bigint,jsonb)
  is 'Development-only, per-verified-account idempotent Session projection. NO authoritative Cycle transitions; do not enable in production.';

commit;
