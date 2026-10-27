\set ON_ERROR_STOP on
do $$
begin
  if has_function_privilege('anon','public.jfs_dev_read_session_v1(text)','EXECUTE') then
    raise exception 'anon can read dev Sessions';
  end if;
  if not has_function_privilege('authenticated','public.jfs_dev_read_session_v1(text)','EXECUTE') then
    raise exception 'authenticated cannot invoke scoped dev read';
  end if;
end $$;

begin;
set role authenticated;
select set_config('request.jwt.claim.role','authenticated',true);
select set_config('request.jwt.claim.sub','11111111-1111-4111-8111-111111111111',true);
do $$
declare
  payload jsonb := '{"id":"shared-session","date":"2026-10-22","name":"Dev A","status":"in_progress","createdAt":"2026-10-22T09:00:00Z","exercises":[]}';
  found jsonb;
begin
  perform public.jfs_dev_apply_session_v1(
    'aaaaaaaa-aaaa-4aaa-8aaa-000000000071','shared-session',0,payload);
  found := public.jfs_dev_read_session_v1('shared-session');
  if found->>'session_id' <> 'shared-session' or
     found->>'revision' <> '1' or
     found->'session'->>'name' <> 'Dev A' then
    raise exception 'Verified user A cannot download own Session';
  end if;
end $$;

select set_config('request.jwt.claim.sub','22222222-2222-4222-8222-222222222222',true);
do $$
declare
  payload jsonb := '{"id":"shared-session","date":"2026-10-22","name":"Dev B","status":"in_progress","createdAt":"2026-10-22T09:00:00Z","exercises":[]}';
  found jsonb;
begin
  if public.jfs_dev_read_session_v1('shared-session') is not null then
    raise exception 'account B read account A Session';
  end if;
  perform public.jfs_dev_apply_session_v1(
    'aaaaaaaa-aaaa-4aaa-8aaa-000000000071','shared-session',0,payload);
  found := public.jfs_dev_read_session_v1('shared-session');
  if found->'session'->>'name' <> 'Dev B' then
    raise exception 'account B saw A content despite same Session ID';
  end if;
end $$;

select set_config('request.jwt.claim.sub','33333333-3333-4333-8333-333333333333',true);
do $$
begin
  if public.jfs_dev_read_session_v1('shared-session') is not null then
    raise exception 'third owner read a foreign Session';
  end if;
end $$;
commit;

-- Negative read by anon; mocked role claim itself is not enough.
begin;
set role anon;
select set_config('request.jwt.claim.sub','11111111-1111-4111-8111-111111111111',true);
do $$
declare
  denied boolean := false;
begin
  begin
    perform public.jfs_dev_read_session_v1('shared-session');
  exception when insufficient_privilege then
    denied := true;
  end;
  if not denied then raise exception 'anon executed the protected read RPC'; end if;
end $$;
rollback;
