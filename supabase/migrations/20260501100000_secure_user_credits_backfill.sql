-- Credit balances are server-managed. Users may read their own balance, but
-- client-scoped requests must not be able to create or mutate credits.
drop policy if exists "user can update own credits" on public.user_credits;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'user_credits'
      and policyname = 'user can read own credits'
  ) then
    create policy "user can read own credits"
      on public.user_credits
      for select
      using (auth.uid() = user_id);
  end if;
end $$;

insert into public.user_credits (
  user_id,
  monthly_limit_seconds,
  credits_used_seconds,
  credit_scope,
  period_start,
  period_end
)
select
  p.id,
  case when p.plan_type = 'pro' then 30000 else 600 end,
  0,
  case when p.plan_type = 'pro' then 'monthly' else 'lifetime' end,
  case
    when p.plan_type = 'pro' then date_trunc('month', now())
    else now()
  end,
  case
    when p.plan_type = 'pro' then date_trunc('month', now()) + interval '1 month'
    else '9999-12-31T00:00:00.000Z'::timestamptz
  end
from public.profiles p
where not exists (
  select 1
  from public.user_credits uc
  where uc.user_id = p.id
);
