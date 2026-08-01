ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS ug_pathway text;

CREATE TABLE public.applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  university_id uuid REFERENCES public.universities(id) ON DELETE SET NULL,
  university_name text NOT NULL,
  program text,
  level text DEFAULT 'UG',
  platform text,
  round text,
  status text NOT NULL DEFAULT 'planning',
  deadline date,
  missing_documents text[] DEFAULT '{}'::text[],
  interview_date date,
  decision text,
  aid_status text,
  visa_status text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.applications TO authenticated;
GRANT ALL ON public.applications TO service_role;

ALTER TABLE public.applications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own applications read" ON public.applications FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "own applications insert" ON public.applications FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own applications update" ON public.applications FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own applications delete" ON public.applications FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE TRIGGER applications_set_updated_at BEFORE UPDATE ON public.applications
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();