alter table public.sessions
  add column if not exists credits_charged_seconds integer;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'sessions_credits_charged_seconds_check'
  ) then
    alter table public.sessions
      add constraint sessions_credits_charged_seconds_check
      check (credits_charged_seconds is null or credits_charged_seconds >= 0);
  end if;
end $$;

create or replace function public.complete_session_with_credits(
  p_session_id uuid,
  p_ended_at timestamptz default null
)
returns table (
  session_id uuid,
  duration_seconds integer,
  credits_charged_seconds integer,
  credits_used_seconds integer,
  credits_remaining integer,
  already_charged boolean
)
language plpgsql
as $$
declare
  v_session record;
  v_ended_at timestamptz;
  v_duration_seconds integer := 0;
  v_charge_seconds integer := 0;
  v_credit_user_id uuid := null;
  v_credit_used_seconds integer := null;
  v_credit_limit_seconds integer := null;
  v_used_seconds integer := null;
  v_remaining_seconds integer := null;
begin
  select
    s.id,
    s.user_id,
    s.started_at,
    s.ended_at,
    s.duration_seconds,
    s.credits_charged_seconds
  into v_session
  from public.sessions s
  where s.id = p_session_id
  for update;

  if not found then
    raise exception 'Session % not found', p_session_id using errcode = 'P0002';
  end if;

  select
    uc.user_id,
    uc.credits_used_seconds,
    uc.monthly_limit_seconds
  into
    v_credit_user_id,
    v_credit_used_seconds,
    v_credit_limit_seconds
  from public.user_credits uc
  where uc.user_id = v_session.user_id
  for update;

  if v_session.credits_charged_seconds is not null then
    session_id := v_session.id;
    duration_seconds := coalesce(v_session.duration_seconds, 0);
    credits_charged_seconds := v_session.credits_charged_seconds;
    credits_used_seconds := v_credit_used_seconds;
    credits_remaining := greatest(0, v_credit_limit_seconds - v_credit_used_seconds);
    already_charged := true;
    return next;
    return;
  end if;

  v_ended_at := coalesce(p_ended_at, v_session.ended_at, now());

  if v_session.started_at is not null then
    v_duration_seconds := greatest(
      0,
      ceil(extract(epoch from (v_ended_at - v_session.started_at)))::integer
    );
  end if;

  if v_credit_user_id is not null and v_duration_seconds > 0 then
    v_charge_seconds := least(
      v_duration_seconds,
      greatest(0, v_credit_limit_seconds - v_credit_used_seconds)
    );

    update public.user_credits
    set
      credits_used_seconds = credits_used_seconds + v_charge_seconds,
      updated_at = now()
    where user_id = v_session.user_id
    returning
      user_credits.credits_used_seconds,
      greatest(0, user_credits.monthly_limit_seconds - user_credits.credits_used_seconds)
    into v_used_seconds, v_remaining_seconds;
  elsif v_credit_user_id is not null then
    v_used_seconds := v_credit_used_seconds;
    v_remaining_seconds := greatest(0, v_credit_limit_seconds - v_credit_used_seconds);
  end if;

  update public.sessions
  set
    status = 'completed',
    ended_at = v_ended_at,
    duration_seconds = v_duration_seconds,
    credits_charged_seconds = v_charge_seconds,
    updated_at = now()
  where id = v_session.id;

  session_id := v_session.id;
  duration_seconds := v_duration_seconds;
  credits_charged_seconds := v_charge_seconds;
  credits_used_seconds := v_used_seconds;
  credits_remaining := v_remaining_seconds;
  already_charged := false;
  return next;
end;
$$;

revoke all on function public.complete_session_with_credits(uuid, timestamptz) from public;
revoke all on function public.complete_session_with_credits(uuid, timestamptz) from anon;
revoke all on function public.complete_session_with_credits(uuid, timestamptz) from authenticated;
grant execute on function public.complete_session_with_credits(uuid, timestamptz) to service_role;
