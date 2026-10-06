-- Bhaijaan MVP: one profile per user (filled in at onboarding) and durable caregiver-help requests.

create table public.profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users (id) on delete cascade,
  data jsonb not null
);

create table public.help_requests (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles (id) on delete cascade,
  idempotency_key text not null check (length(idempotency_key) between 1 and 200),
  sim_outcome text not null check (sim_outcome in ('answered', 'no_answer', 'error', 'timeout')),
  status text not null default 'requested'
    check (status in ('requested', 'dialing', 'answered', 'ended', 'failed', 'needs_review')),
  caregiver_name text not null default '', -- who was called, even if the profile changes later
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (profile_id, idempotency_key)
);

-- At most one unresolved request per profile. An ambiguous outcome (needs_review) also blocks new calls.
-- ponytail: review is manual SQL (README); real telephony should reconcile with the provider instead.
create unique index help_requests_one_open on public.help_requests (profile_id)
  where status in ('requested', 'dialing', 'answered', 'needs_review');

revoke all on public.profiles, public.help_requests from anon, authenticated;
grant select on public.profiles to authenticated;

alter table public.profiles enable row level security;
alter table public.help_requests enable row level security; -- no policy: reachable only via the functions below

create policy "read own profile" on public.profiles
  for select to authenticated using ((select auth.uid()) = user_id);

-- Creates a help request for the caller's profile, or returns the one that already covers it.
-- The caller never chooses the profile: it comes from the verified JWT.
create function public.request_help(p_key text, p_sim_outcome text default 'answered')
returns setof public.help_requests
language plpgsql
security definer
set search_path = ''
as $$
declare
  pid uuid;
  who text;
  r public.help_requests;
begin
  select p.id, coalesce(p.data -> 'caregiver' ->> 'name', '') into pid, who
    from public.profiles p where p.user_id = (select auth.uid());
  if not found then
    raise exception 'no_profile' using errcode = 'PT403';
  end if;
  if p_key is null or length(p_key) not between 1 and 200 then
    raise exception 'invalid_key' using errcode = '22023';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(pid::text, 0)); -- serialize callers per profile

  -- Same key (a retried event), anything unresolved, or anything from the last minute
  -- (a resumed Gemini session can replay the call with a new id) means: do not place another call.
  select h.* into r from public.help_requests h
   where h.profile_id = pid
     and (h.idempotency_key = p_key
          or h.status in ('requested', 'dialing', 'answered', 'needs_review')
          or h.created_at > now() - interval '1 minute')
   order by (h.idempotency_key = p_key) desc, h.created_at desc
   limit 1;
  if not found then
    -- ponytail: the simulated outcome is caller-chosen; harmless while no real call is placed.
    insert into public.help_requests (profile_id, idempotency_key, sim_outcome, caregiver_name)
    values (pid, p_key, p_sim_outcome, who)
    returning * into r;
  end if;
  return next r;
end;
$$;

-- Advances the caller's unresolved request and returns their latest request (0 rows if none).
-- ponytail: simulated provider — status is a function of time since the request, and an update only ever
-- moves it forward (re-checked against the locked row, so racing polls cannot step back).
-- Real telephony replaces this with signed provider status callbacks driving the same states.
create function public.sync_help_request()
returns setof public.help_requests
language plpgsql
security definer
set search_path = ''
as $$
declare
  pid uuid;
begin
  select p.id into pid from public.profiles p where p.user_id = (select auth.uid());
  if not found then
    raise exception 'no_profile' using errcode = 'PT403';
  end if;

  update public.help_requests h
     set status = t.target, updated_at = now()
    from (
      select o.id,
             case o.sim_outcome
               when 'error' then 'failed'
               when 'timeout' then 'needs_review'
               when 'no_answer' then
                 case when now() - o.created_at >= interval '20 seconds' then 'failed' else 'dialing' end
               else
                 case when now() - o.created_at >= interval '26 seconds' then 'ended'
                      when now() - o.created_at >= interval '6 seconds' then 'answered'
                      else 'dialing' end
             end as target
        from public.help_requests o
       where o.profile_id = pid and o.status in ('requested', 'dialing', 'answered')
    ) t
   where h.id = t.id
     and h.status in ('requested', 'dialing', 'answered')
     and array_position(array['requested', 'dialing', 'answered', 'ended', 'failed', 'needs_review'], t.target)
       > array_position(array['requested', 'dialing', 'answered', 'ended', 'failed', 'needs_review'], h.status);

  return query
    select h.* from public.help_requests h
     where h.profile_id = pid
     order by h.created_at desc
     limit 1;
end;
$$;

-- Creates or replaces the caller's own profile (onboarding, edits, the demo's sample profile).
-- The app shapes the fields; here only the owner, the type and a size cap are enforced.
create function public.save_my_profile(p_data jsonb)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := (select auth.uid());
begin
  if uid is null then
    raise exception 'not_signed_in' using errcode = 'PT401';
  end if;
  if p_data is null or jsonb_typeof(p_data) <> 'object' or length(p_data::text) > 20000 then
    raise exception 'invalid_profile' using errcode = '22023';
  end if;
  insert into public.profiles (user_id, data) values (uid, p_data)
  on conflict (user_id) do update set data = excluded.data;
end;
$$;

revoke execute on function public.request_help(text, text), public.sync_help_request(), public.save_my_profile(jsonb)
  from public, anon;
grant execute on function public.request_help(text, text), public.sync_help_request(), public.save_my_profile(jsonb)
  to authenticated;
