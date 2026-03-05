-- Persist audio recording metadata for each session and enforce private access.

CREATE TABLE IF NOT EXISTS public.session_recordings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL UNIQUE REFERENCES public.sessions(id) ON DELETE CASCADE,
  provider text NOT NULL,
  provider_recording_id text,
  status text NOT NULL,
  storage_bucket text NOT NULL,
  storage_path text NOT NULL,
  mime_type text,
  duration_seconds integer,
  started_at timestamptz,
  completed_at timestamptz,
  expires_at timestamptz,
  error_message text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT session_recordings_status_check
    CHECK (status IN ('recording', 'processing', 'ready', 'failed', 'expired'))
);

CREATE INDEX IF NOT EXISTS idx_session_recordings_expires_at
  ON public.session_recordings (expires_at);

CREATE INDEX IF NOT EXISTS idx_session_recordings_status_expires_at
  ON public.session_recordings (status, expires_at);

ALTER TABLE public.session_recordings ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'session_recordings'
      AND policyname = 'session_recordings_select_own'
  ) THEN
    CREATE POLICY session_recordings_select_own
      ON public.session_recordings
      FOR SELECT
      TO authenticated
      USING (
        EXISTS (
          SELECT 1
          FROM public.sessions s
          WHERE s.id = session_recordings.session_id
            AND s.user_id = auth.uid()
        )
      );
  END IF;
END $$;

INSERT INTO storage.buckets (id, name, public)
VALUES ('session-recordings', 'session-recordings', false)
ON CONFLICT (id) DO NOTHING;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND policyname = 'session_recordings_bucket_select_own'
  ) THEN
    CREATE POLICY session_recordings_bucket_select_own
      ON storage.objects
      FOR SELECT
      TO authenticated
      USING (
        bucket_id = 'session-recordings'
        AND split_part(name, '/', 1) = auth.uid()::text
      );
  END IF;
END $$;
