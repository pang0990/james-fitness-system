-- TEST HARNESS ONLY: a disposable stock PostgreSQL instance is NOT Supabase.
-- Emulate the narrow auth.uid() contract so RLS/RPC can be tested without a real project.
do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'anon') then
    create role anon nologin;
  end if;
  if not exists (select 1 from pg_roles where rolname = 'authenticated') then
    create role authenticated nologin;
  end if;
end $$;
create schema if not exists auth;
create or replace function auth.uid() returns uuid
  language sql stable set search_path = ''
  as $$
    select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid
  $$;
