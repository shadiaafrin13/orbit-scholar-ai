
-- research_opportunities (public)
CREATE TABLE public.research_opportunities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  host TEXT,
  country TEXT,
  type TEXT, -- Lab, RA, TA, Fellowship, Grant, Conference, Journal
  field TEXT,
  deadline DATE,
  stipend TEXT,
  link TEXT,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.research_opportunities TO anon, authenticated;
GRANT ALL ON public.research_opportunities TO service_role;
ALTER TABLE public.research_opportunities ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read research" ON public.research_opportunities FOR SELECT USING (true);

-- publications (user-owned)
CREATE TABLE public.publications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  venue TEXT,
  year INTEGER,
  doi TEXT,
  link TEXT,
  type TEXT,
  coauthors TEXT,
  citations INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.publications TO authenticated;
GRANT ALL ON public.publications TO service_role;
ALTER TABLE public.publications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own publications" ON public.publications FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER publications_set_updated_at BEFORE UPDATE ON public.publications FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- sops (user-owned)
CREATE TABLE public.sops (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  program TEXT,
  prompt TEXT,
  content TEXT,
  version INTEGER DEFAULT 1,
  ai_score INTEGER,
  ai_feedback TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sops TO authenticated;
GRANT ALL ON public.sops TO service_role;
ALTER TABLE public.sops ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own sops" ON public.sops FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER sops_set_updated_at BEFORE UPDATE ON public.sops FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- cvs (user-owned)
CREATE TABLE public.cvs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  template TEXT DEFAULT 'academic',
  headline TEXT,
  summary TEXT,
  content JSONB DEFAULT '{}'::jsonb,
  ats_score INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.cvs TO authenticated;
GRANT ALL ON public.cvs TO service_role;
ALTER TABLE public.cvs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own cvs" ON public.cvs FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER cvs_set_updated_at BEFORE UPDATE ON public.cvs FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- recommenders (user-owned)
CREATE TABLE public.recommenders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT,
  affiliation TEXT,
  relationship TEXT,
  status TEXT DEFAULT 'planned', -- planned, requested, in_progress, submitted
  requested_at DATE,
  submitted_at DATE,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.recommenders TO authenticated;
GRANT ALL ON public.recommenders TO service_role;
ALTER TABLE public.recommenders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own recommenders" ON public.recommenders FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER recommenders_set_updated_at BEFORE UPDATE ON public.recommenders FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- activities (user-owned, ECA)
CREATE TABLE public.activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  category TEXT, -- Olympiad, MUN, Hackathon, Sports, Volunteering, Leadership, Arts, Research
  role TEXT,
  organization TEXT,
  start_date DATE,
  end_date DATE,
  hours_per_week INTEGER,
  impact TEXT,
  evidence_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.activities TO authenticated;
GRANT ALL ON public.activities TO service_role;
ALTER TABLE public.activities ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own activities" ON public.activities FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER activities_set_updated_at BEFORE UPDATE ON public.activities FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
