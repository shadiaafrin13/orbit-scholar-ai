ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS masters_pathway text;

CREATE TABLE public.professor_contacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  university text,
  department text,
  research_area text,
  email text,
  lab text,
  status text NOT NULL DEFAULT 'identified',
  compatibility integer,
  notes text,
  contacted_at date,
  replied_at date,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.professor_contacts TO authenticated;
GRANT ALL ON public.professor_contacts TO service_role;

ALTER TABLE public.professor_contacts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own professor contacts read" ON public.professor_contacts FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "own professor contacts insert" ON public.professor_contacts FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own professor contacts update" ON public.professor_contacts FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own professor contacts delete" ON public.professor_contacts FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE TRIGGER professor_contacts_set_updated_at BEFORE UPDATE ON public.professor_contacts
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();