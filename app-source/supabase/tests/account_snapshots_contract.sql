\set ON_ERROR_STOP on

-- Run after the migration on a disposable Supabase test database.
-- The following are structural negative assertions; two-real-account RPC
-- and RLS data isolation must additionally be tested in an isolated project.
do $$
begin
  if not (select relrowsecurity from pg_class where oid = 'public.jfs_account_snapshots'::regclass) then
    raise exception 'Account snapshot RLS is disabled';
  end if;
  if has_table_privilege('anon','public.jfs_account_snapshots','SELECT') or
     has_table_privilege('anon','public.jfs_account_snapshots','INSERT') or
     has_table_privilege('anon','public.jfs_account_snapshots','UPDATE') then
    raise exception 'Anonymous role can access account data';
  end if;
  if has_table_privilege('authenticated','public.jfs_account_snapshots','INSERT') or
     has_table_privilege('authenticated','public.jfs_account_snapshots','UPDATE') or
     has_table_privilege('authenticated','public.jfs_account_snapshots','DELETE') then
    raise exception 'Browser role can bypass compare-and-swap writes';
  end if;
  if not has_table_privilege('authenticated','public.jfs_account_snapshots','SELECT') then
    raise exception 'Authenticated account cannot read own snapshot';
  end if;
  if exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'jfs_account_snapshots'
      and cmd in ('INSERT', 'UPDATE', 'ALL')
  ) then
    raise exception 'Account snapshot must have no direct-write policies';
  end if;
  if has_function_privilege('anon','public.jfs_save_account_snapshot(bigint,jsonb)','EXECUTE') or
     not has_function_privilege('authenticated','public.jfs_save_account_snapshot(bigint,jsonb)','EXECUTE') then
    raise exception 'Sync RPC permissions are not restricted to signed-in users';
  end if;
end $$;

-- Execute on a disposable test database whose auth.users shim is installed.
begin;
insert into auth.users (id) values
  ('11111111-1111-4111-8111-111111111111'),
  ('22222222-2222-4222-8222-222222222222');
set role authenticated;
select set_config('request.jwt.claim.role','authenticated',true);
select set_config('request.jwt.claim.sub','11111111-1111-4111-8111-111111111111',true);

do $$
declare
  v_revision bigint;
  v_count integer;
begin
  v_revision := public.jfs_save_account_snapshot(0, '{"revision":0,"sessions":[]}'::jsonb);
  if v_revision <> 1 then raise exception 'Owner A first revision invalid'; end if;
  select count(*) into v_count from public.jfs_account_snapshots;
  if v_count <> 1 then raise exception 'Owner A cannot read own row'; end if;
  begin
    perform public.jfs_save_account_snapshot(0, '{"revision":1,"sessions":[]}'::jsonb);
    raise exception 'Stale version silently overwrote owner A data';
  exception when raise_exception then
    if sqlerrm <> 'JFS_SYNC_CONFLICT' then raise; end if;
  end;
end $$;

select set_config('request.jwt.claim.sub','22222222-2222-4222-8222-222222222222',true);
do $$
declare
  v_count integer;
begin
  select count(*) into v_count from public.jfs_account_snapshots;
  if v_count <> 0 then raise exception 'RLS exposed owner A row to owner B'; end if;
  if public.jfs_save_account_snapshot(0,'{"revision":0,"sessions":[]}'::jsonb) <> 1 then
    raise exception 'Owner B initial revision invalid';
  end if;
  select count(*) into v_count from public.jfs_account_snapshots;
  if v_count <> 1 then raise exception 'Owner B cannot read own row'; end if;
end $$;

select set_config('request.jwt.claim.sub','11111111-1111-4111-8111-111111111111',true);
do $$
declare
  v_revision bigint;
begin
  v_revision := public.jfs_save_account_snapshot(1, '{"revision":1,"sessions":[]}'::jsonb);
  if v_revision <> 2 then raise exception 'Owner A CAS revision invalid'; end if;
end $$;
rollback;
