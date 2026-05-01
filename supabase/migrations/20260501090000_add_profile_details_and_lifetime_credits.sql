-- Add editable personal profile fields used by the settings page.
alter table public.profiles
  add column if not exists age integer,
  add column if not exists gender text,
  add column if not exists phone text,
  add column if not exists company text,
  add column if not exists job_title text,
  add column if not exists country text,
  add column if not exists timezone text;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'profiles_age_range_check'
  ) then
    alter table public.profiles
      add constraint profiles_age_range_check
      check (age is null or (age >= 18 and age <= 120));
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'profiles_gender_check'
  ) then
    alter table public.profiles
      add constraint profiles_gender_check
      check (
        gender is null or gender in (
          'female',
          'male',
          'non_binary',
          'prefer_not_to_say',
          'self_describe'
        )
      );
  end if;
end $$;

-- user_credits now represents either a lifetime free-credit pool or monthly pro credits.
alter table public.user_credits
  add column if not exists credit_scope text not null default 'monthly';

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'user_credits_credit_scope_check'
  ) then
    alter table public.user_credits
      add constraint user_credits_credit_scope_check
      check (credit_scope in ('lifetime', 'monthly'));
  end if;
end $$;
