-- Add new call type for pitch practice and persist structured pitch briefing per session.
ALTER TYPE public.call_type ADD VALUE IF NOT EXISTS 'pitch';

ALTER TABLE public.sessions
  ADD COLUMN IF NOT EXISTS pitch_briefing jsonb;
