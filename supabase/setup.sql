-- Dinner Planner: one-time database setup for Supabase.
-- Paste this whole file into Supabase > SQL Editor > New query, then press Run.
--
-- How it stays private: the table has row level security switched on and NO policies, so nobody can read
-- or write it directly, even with the public anon key. The only way in is through the two functions below,
-- and both need your secret household code. Without the code, there is nothing to see.

create table if not exists public.kv (
  household  text        not null,
  key        text        not null,
  value      jsonb       not null,
  ts         bigint      not null,
  seq        bigint      not null default 0,
  primary key (household, key)
);

create sequence if not exists public.kv_seq;
alter table public.kv alter column seq set default nextval('public.kv_seq');

create index if not exists kv_household_seq on public.kv (household, seq);

alter table public.kv enable row level security;
revoke all on public.kv from anon, authenticated;
revoke all on sequence public.kv_seq from anon, authenticated;

-- Save a batch of rows. Newer changes win.
create or replace function public.dp_push(h text, rows jsonb)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare r jsonb;
begin
  if h is null or length(h) < 12 then raise exception 'household code too short'; end if;
  for r in select * from jsonb_array_elements(rows) loop
    insert into public.kv (household, key, value, ts, seq)
    values (h, r->>'key', r->'value', (r->>'ts')::bigint, nextval('public.kv_seq'))
    on conflict (household, key) do update
      set value = excluded.value, ts = excluded.ts, seq = nextval('public.kv_seq')
      where public.kv.ts <= excluded.ts;
  end loop;
end;
$$;

-- Fetch everything that changed since the last time this phone asked.
create or replace function public.dp_pull(h text, since bigint)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare result jsonb; top bigint;
begin
  if h is null or length(h) < 12 then raise exception 'household code too short'; end if;
  select coalesce(jsonb_agg(jsonb_build_object('key', t.key, 'value', t.value, 'ts', t.ts, 'seq', t.seq) order by t.seq), '[]'::jsonb),
         coalesce(max(t.seq), since)
    into result, top
  from (select key, value, ts, seq from public.kv where household = h and seq > since order by seq limit 300) t;
  return jsonb_build_object('rows', result, 'max', top);
end;
$$;

grant execute on function public.dp_push(text, jsonb) to anon;
grant execute on function public.dp_pull(text, bigint) to anon;
