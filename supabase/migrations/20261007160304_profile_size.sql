-- Room for the fuller profile (structured medicines, several contacts, routine and needs): a full one is
-- about 35,000 characters, so the cap goes from 20,000 to 50,000. Otherwise unchanged.
create or replace function public.save_my_profile(p_data jsonb)
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
  if p_data is null or jsonb_typeof(p_data) <> 'object' or length(p_data::text) > 50000 then
    raise exception 'invalid_profile' using errcode = '22023';
  end if;
  insert into public.profiles (user_id, data) values (uid, p_data)
  on conflict (user_id) do update set data = excluded.data;
end;
$$;
