CREATE TABLE public.discovery_programs (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 title text NOT NULL,
 institution text NOT NULL,
 university_id uuid REFERENCES public.universities(id),
 country text NOT NULL,
 degree_level text NOT NULL,
 subject text,
 official_url text NOT NULL UNIQUE,
 identity_checked_at timestamptz,
 identity_verification text NOT NULL DEFAULT 'not_verified' CHECK (identity_verification IN ('not_verified','reviewed_official')),
 facts jsonb NOT NULL DEFAULT '{}'::jsonb,
 created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.discovery_programs TO authenticated;
GRANT ALL ON public.discovery_programs TO service_role;
ALTER TABLE public.discovery_programs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Students read catalog" ON public.discovery_programs FOR SELECT TO authenticated USING (true);
CREATE TABLE public.saved_programs (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 user_id uuid NOT NULL,
 program_id uuid NOT NULL REFERENCES public.discovery_programs(id) ON DELETE CASCADE,
 created_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(user_id, program_id)
);
GRANT SELECT, INSERT, DELETE ON public.saved_programs TO authenticated;
GRANT ALL ON public.saved_programs TO service_role;
ALTER TABLE public.saved_programs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Read own saved programs" ON public.saved_programs FOR SELECT TO authenticated USING ((SELECT auth.uid()) = user_id);
CREATE POLICY "Save own programs" ON public.saved_programs FOR INSERT TO authenticated WITH CHECK ((SELECT auth.uid()) = user_id);
CREATE POLICY "Remove own saved programs" ON public.saved_programs FOR DELETE TO authenticated USING ((SELECT auth.uid()) = user_id);
CREATE INDEX saved_programs_owner_idx ON public.saved_programs(user_id);
CREATE INDEX discovery_programs_filters_idx ON public.discovery_programs(country, degree_level);