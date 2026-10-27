-- DEV-ONLY follow-on to 202610220001_training_dev_foundation.sql.
-- Read path for a newly paired synthetic device. Never expose private schema.
begin;
create or replace function public.jfs_dev_read_session_v1(p_session_id text)
returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare
  v_owner uuid := auth.uid();
  v_response jsonb;
begin
  if v_owner is null or
     current_setting('request.jwt.claim.role', true) is distinct from 'authenticated'
  then
    raise exception 'Verified authenticated identity required' using errcode = '42501';
  end if;
  if p_session_id is null or length(p_session_id) not between 1 and 128
  then
    raise exception 'Invalid Session identifier' using errcode = '22023';
  end if;
  select jsonb_build_object(
    'session_id', s.session_id,
    'revision', s.revision,
    'session', s.payload,
    'written_at', s.written_at
  )
  into v_response
  from jfs_training_dev.session_projection as s
  where s.owner_id = v_owner and s.session_id = p_session_id;
  -- Missing OR not-owned: identical null response, no enumeration.
  return v_response;
end;
$$;
revoke all on function public.jfs_dev_read_session_v1(text) from public, anon, authenticated;
grant execute on function public.jfs_dev_read_session_v1(text) to authenticated;
comment on function public.jfs_dev_read_session_v1(text) is
'DEV ONLY account-bound read for synthetic Training Session; not a production or complete change-feed sync API.';
commit;
