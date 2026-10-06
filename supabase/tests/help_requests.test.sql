-- Runnable check for the duplicate-call guard, the simulated call timeline and profile ownership: `npm run test:db`.
begin;
create extension if not exists pgtap with schema extensions;
select plan(41);

insert into auth.users (id, email) values
  ('11111111-1111-4111-8111-111111111111', 'tester@test.local'),
  ('22222222-2222-4222-8222-222222222222', 'no-profile@test.local'),
  ('33333333-3333-4333-8333-333333333333', 'other@test.local');
insert into public.profiles (id, user_id, data) values
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', '11111111-1111-4111-8111-111111111111', '{"caregiver":{"name":"করিম"}}'),
  ('cccccccc-cccc-4ccc-8ccc-cccccccccccc', '33333333-3333-4333-8333-333333333333', '{}');

-- Act as the tester with a profile. The functions only read auth.uid() from the claims, so the assertions below
-- run as postgres (to inspect and backdate rows); grants are checked separately at the end.
select set_config('request.jwt.claims', '{"sub":"11111111-1111-4111-8111-111111111111","role":"authenticated"}', true);

-- Duplicate guard
select is((select status from public.request_help('k1')), 'requested', 'a new request starts as requested');
select is((select idempotency_key from public.request_help('k1')), 'k1', 'the same key returns the same request');
select is((select idempotency_key from public.request_help('k2')), 'k1', 'a new key while one is open returns the open request');
select is((select count(*)::int from public.help_requests where profile_id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'), 1, 'repeated events created exactly one request');
select is((select caregiver_name from public.help_requests where idempotency_key = 'k1'), 'করিম', 'the request remembers who was called');

-- Simulated timeline, answered outcome
select is((select status from public.sync_help_request()), 'dialing', 'sync starts dialing');
update public.help_requests set created_at = now() - interval '7 seconds' where idempotency_key = 'k1';
select is((select status from public.sync_help_request()), 'answered', 'answered after 6 s');
update public.help_requests set created_at = now() - interval '27 seconds' where idempotency_key = 'k1';
select is((select status from public.sync_help_request()), 'ended', 'ended after 26 s');
update public.help_requests set created_at = now() - interval '2 seconds' where idempotency_key = 'k1';
select is((select status from public.sync_help_request()), 'ended', 'a final status never moves backwards');
update public.help_requests set status = 'answered' where idempotency_key = 'k1';
select is((select status from public.sync_help_request()), 'answered', 'an open status never moves backwards either');
update public.help_requests set status = 'ended' where idempotency_key = 'k1';

-- Replay guard: a different key within a minute of the last request does not place another call
update public.help_requests set created_at = now() - interval '30 seconds' where idempotency_key = 'k1';
select is((select idempotency_key from public.request_help('k3')), 'k1', 'a new key within a minute returns the recent request');
update public.help_requests set created_at = now() - interval '2 minutes' where idempotency_key = 'k1';
select is((select idempotency_key from public.request_help('k3')), 'k3', 'after a minute a new request is created');
select is((select count(*)::int from public.help_requests where profile_id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'), 2, 'two requests in total');

-- no_answer outcome
update public.help_requests set status = 'ended', created_at = now() - interval '2 minutes' where idempotency_key = 'k3';
select is((select sim_outcome from public.request_help('k4', 'no_answer')), 'no_answer', 'no_answer request created');
select is((select status from public.sync_help_request()), 'dialing', 'no_answer rings first');
update public.help_requests set created_at = now() - interval '21 seconds' where idempotency_key = 'k4';
select is((select status from public.sync_help_request()), 'failed', 'no_answer fails after 20 s');

-- error outcome
update public.help_requests set created_at = now() - interval '2 minutes' where idempotency_key = 'k4';
select is((select idempotency_key from public.request_help('k5', 'error')), 'k5', 'error request created');
select is((select status from public.sync_help_request()), 'failed', 'a provider error fails at once');

-- timeout outcome: ambiguous, so it blocks further calls until reviewed
update public.help_requests set created_at = now() - interval '2 minutes' where idempotency_key = 'k5';
select is((select idempotency_key from public.request_help('k6', 'timeout')), 'k6', 'timeout request created');
select is((select status from public.sync_help_request()), 'needs_review', 'a timeout needs review');
update public.help_requests set created_at = now() - interval '2 minutes' where idempotency_key = 'k6';
select is((select idempotency_key from public.request_help('k7')), 'k6', 'needs_review blocks a new request');
update public.help_requests set status = 'failed' where idempotency_key = 'k6'; -- the README's admin resolve
select is((select idempotency_key from public.request_help('k7')), 'k7', 'after review a new request is created');

-- Input validation
select throws_ok($$select public.request_help('')$$, '22023', null, 'an empty key is rejected');
select throws_ok(format('select public.request_help(%L)', repeat('x', 201)), '22023', null, 'a 201-character key is rejected');

-- Profile resolution comes from the JWT only
select set_config('request.jwt.claims', '{"sub":"22222222-2222-4222-8222-222222222222","role":"authenticated"}', true);
select throws_ok($$select public.request_help('u1')$$, 'PT403', null, 'a user without a profile cannot request help');
select throws_ok($$select public.sync_help_request()$$, 'PT403', null, 'a user without a profile cannot read status');
select set_config('request.jwt.claims', '{"sub":"33333333-3333-4333-8333-333333333333","role":"authenticated"}', true);
select is_empty($$select * from public.sync_help_request()$$, 'another tester sees none of these requests');

-- Grants: testers reach help_requests only through the functions; anon reaches nothing
set local role authenticated;
select is((select count(*)::int from public.profiles), 1, 'a tester sees only their own profile');
select throws_ok($$select * from public.help_requests$$, '42501', null, 'testers cannot read help_requests directly');
select lives_ok($$select public.sync_help_request()$$, 'testers can call the status function');
select set_config('request.jwt.claims', '{"sub":"22222222-2222-4222-8222-222222222222","role":"authenticated"}', true);
select throws_ok($$update public.profiles set user_id = auth.uid()$$, '42501', null, 'a user cannot claim someone else''s profile');
select throws_ok(
  $$insert into public.help_requests (profile_id, idempotency_key, sim_outcome) values ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'x', 'answered')$$,
  '42501', null, 'testers cannot write help_requests directly');
reset role;
set local role anon;
select throws_ok($$select public.request_help('a1')$$, '42501', null, 'anon cannot call request_help');
select throws_ok($$select public.sync_help_request()$$, '42501', null, 'anon cannot call sync_help_request');
select throws_ok($$select public.save_my_profile('{}')$$, '42501', null, 'anon cannot call save_my_profile');
reset role;

-- Onboarding: a user creates and edits only their own profile
select set_config('request.jwt.claims', '{"sub":"22222222-2222-4222-8222-222222222222","role":"authenticated"}', true);
select public.save_my_profile('{"preferred_name":"A"}');
select public.save_my_profile('{"preferred_name":"B"}');
select is((select count(*)::int from public.profiles where user_id = '22222222-2222-4222-8222-222222222222'), 1, 'saving twice keeps one profile');
select is((select data->>'preferred_name' from public.profiles where user_id = '22222222-2222-4222-8222-222222222222'), 'B', 'the second save updates it');
select is((select data->>'preferred_name' from public.profiles where user_id = '33333333-3333-4333-8333-333333333333'), null, 'another user''s profile is untouched');
select throws_ok($$select public.save_my_profile('[1,2]')$$, '22023', null, 'a profile must be a JSON object');
select throws_ok(format('select public.save_my_profile(%L)', json_build_object('x', repeat('x', 20001))), '22023', null, 'oversized profiles are rejected');
select set_config('request.jwt.claims', '', true);
select throws_ok($$select public.save_my_profile('{}')$$, 'PT401', null, 'saving needs a signed-in user');

select * from finish();
rollback;
