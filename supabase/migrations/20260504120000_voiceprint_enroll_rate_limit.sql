-- Rate-limit table for /api/voice/voiceprint enrollment.
-- Mirrors the infer_role_calls pattern: lazy cleanup of rows older than the
-- rate-limit window happens from the route handler itself.

create table if not exists public.voiceprint_enroll_calls (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  called_at timestamptz not null default now()
);

create index if not exists voiceprint_enroll_calls_user_called_at_idx
  on public.voiceprint_enroll_calls (user_id, called_at desc);

alter table public.voiceprint_enroll_calls enable row level security;

-- The route uses the user-scoped client to insert/select its own records;
-- no cross-user reads are ever needed. Service role bypasses RLS as usual.
create policy "Users manage their own voiceprint enroll calls"
  on public.voiceprint_enroll_calls
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
