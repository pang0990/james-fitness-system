\set ON_ERROR_STOP on

-- Public edge: anonymous cannot invoke RPC; private tables have no direct grants.
do $$
begin
  if has_function_privilege('anon','public.jfs_dev_apply_session_v1(uuid,text,bigint,jsonb)','EXECUTE') then
    raise exception 'anonymous can execute sync RPC';
  end if;
  if not has_function_privilege('authenticated','public.jfs_dev_apply_session_v1(uuid,text,bigint,jsonb)','EXECUTE') then
    raise exception 'authenticated role cannot execute sync RPC';
  end if;
  if has_schema_privilege('authenticated','jfs_training_dev','USAGE') or
     has_table_privilege('authenticated','jfs_training_dev.session_projection','SELECT') or
     has_table_privilege('authenticated','jfs_training_dev.command_ledger','INSERT') then
    raise exception 'private tables are exposed to direct client access';
  end if;
end $$;

begin;
set role authenticated;
select set_config('request.jwt.claim.role','authenticated',true);
select set_config('request.jwt.claim.sub','11111111-1111-4111-8111-111111111111',true);

do $$
declare
  p jsonb := '{"id":"session-1","date":"2026-10-22","name":"Synthetic workout","status":"in_progress","createdAt":"2026-10-22T08:00:00.000Z","exercises":[]}';
  complete jsonb;
  r1 jsonb;
  r2 jsonb;
  failed boolean;
begin
  r1 := public.jfs_dev_apply_session_v1(
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1','session-1',0,p);
  if r1->>'revision' <> '1' then raise exception 'first revision not 1'; end if;
  r2 := public.jfs_dev_apply_session_v1(
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1','session-1',0,p);
  if r1 is distinct from r2 then raise exception 'retry not idempotent'; end if;

  failed := false;
  begin
    perform public.jfs_dev_apply_session_v1(
      'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1','session-1',0,
      p || '{"name":"changed request on same command"}'::jsonb);
  exception when sqlstate '22023' then failed := true; end;
  if not failed then raise exception 'reused ID with mismatched payload was accepted'; end if;

  failed := false;
  begin
    perform public.jfs_dev_apply_session_v1(
      'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2','session-1',0,p);
  exception when sqlstate '40001' then failed := true; end;
  if not failed then raise exception 'stale version was accepted'; end if;

  r2 := public.jfs_dev_apply_session_v1(
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2','session-1',1,p || '{"name":"Edited synthetic"}'::jsonb);
  if r2->>'revision' <> '2' then raise exception 'revision not advanced to 2'; end if;

  failed := false;
  begin
    perform public.jfs_dev_apply_session_v1(
      'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa3','session-1',2,
      p || '{"setDrafts":{"x":{"weight":"80"}}}'::jsonb);
  exception when sqlstate '22023' then failed := true; end;
  if not failed then raise exception 'device-only set draft was accepted'; end if;

  failed := false;
  begin
    perform public.jfs_dev_apply_session_v1(
      'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa3','session-1',2,
      p || '{"cycleCounted":true}'::jsonb);
  exception when sqlstate '22023' then failed := true; end;
  if not failed then raise exception 'client-authoritative Cycle flag was accepted'; end if;

  complete := p || '{"status":"completed"}'::jsonb;
  r2 := public.jfs_dev_apply_session_v1(
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa3','session-1',2,complete);
  if r2->>'revision' <> '3' then raise exception 'terminal update failed'; end if;
  failed := false;
  begin
    perform public.jfs_dev_apply_session_v1(
      'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa4','session-1',3,complete);
  exception when sqlstate '22023' then failed := true; end;
  if not failed then raise exception 'terminal session incorrectly mutable'; end if;
end $$;

-- Account B must never access A's projection or command ledger by replay.
select set_config('request.jwt.claim.sub','22222222-2222-4222-8222-222222222222',true);
do $$
declare
  p jsonb := '{"id":"session-1","date":"2026-10-22","name":"Second account","status":"in_progress","createdAt":"2026-10-22T08:00:00.000Z","exercises":[]}';
  r jsonb;
begin
  r := public.jfs_dev_apply_session_v1(
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1','session-1',0,p);
  if r->>'revision' <> '1' then
    raise exception 'second account saw or overwrote first account';
  end if;
end $$;

-- Real RLS negative check: ephemeral direct grants for TEST ONLY.
reset role;
grant usage on schema jfs_training_dev to authenticated;
grant select on jfs_training_dev.session_projection to authenticated;
grant select on jfs_training_dev.command_ledger to authenticated;
set role authenticated;
do $$
declare
  a bigint;
  b bigint;
begin
  perform set_config('request.jwt.claim.sub','22222222-2222-4222-8222-222222222222',true);
  select count(*) into a from jfs_training_dev.session_projection;
  select count(*) into b from jfs_training_dev.command_ledger;
  if a <> 1 or b <> 1 then raise exception 'RLS leaked a different owner (% %, expected 1/1)',a,b; end if;
  perform set_config('request.jwt.claim.sub','11111111-1111-4111-8111-111111111111',true);
  select count(*) into a from jfs_training_dev.session_projection;
  select count(*) into b from jfs_training_dev.command_ledger;
  if a <> 1 or b <> 3 then raise exception 'owner A RLS counts mismatched (% %)',a,b; end if;
end $$;
reset role;
revoke select on jfs_training_dev.command_ledger from authenticated;
revoke select on jfs_training_dev.session_projection from authenticated;
revoke usage on schema jfs_training_dev from authenticated;
commit;

-- A failed write should never leave an extra ledger row behind.
select case when
  (select count(*) from jfs_training_dev.command_ledger) = 4
then 'PASS: tenant isolation, RLS, idempotency, stale revisions and rollback'
else (1 / 0)::text end;
