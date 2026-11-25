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
  if has_function_privilege('anon','public.jfs_save_account_snapshot(bigint,jsonb)','EXECUTE') or
     not has_function_privilege('authenticated','public.jfs_save_account_snapshot(bigint,jsonb)','EXECUTE') then
    raise exception 'Sync RPC permissions are not restricted to signed-in users';
  end if;
end $$;
