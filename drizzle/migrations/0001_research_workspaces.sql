CREATE TABLE public.research_projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  title text NOT NULL,
  research_question text,
  objectives text,
  methodology text,
  dataset text,
  stage text NOT NULL DEFAULT 'idea' CHECK (stage IN ('idea','proposal','data','analysis','paper','submission')),
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.research_projects TO authenticated;
GRANT ALL ON public.research_projects TO service_role;
ALTER TABLE public.research_projects ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Read own research projects" ON public.research_projects FOR SELECT TO authenticated USING ((SELECT auth.uid()) = user_id);
CREATE POLICY "Create own research projects" ON public.research_projects FOR INSERT TO authenticated WITH CHECK ((SELECT auth.uid()) = user_id);
CREATE POLICY "Update own research projects" ON public.research_projects FOR UPDATE TO authenticated USING ((SELECT auth.uid()) = user_id) WITH CHECK ((SELECT auth.uid()) = user_id);
CREATE POLICY "Delete own research projects" ON public.research_projects FOR DELETE TO authenticated USING ((SELECT auth.uid()) = user_id);
CREATE INDEX research_projects_owner_idx ON public.research_projects(user_id);

CREATE TABLE public.literature_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  project_id uuid REFERENCES public.research_projects(id) ON DELETE SET NULL,
  title text NOT NULL,
  authors text,
  year integer,
  venue text,
  topic text,
  method text,
  key_finding text,
  limitation text,
  gap text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.literature_items TO authenticated;
GRANT ALL ON public.literature_items TO service_role;
ALTER TABLE public.literature_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Read own literature" ON public.literature_items FOR SELECT TO authenticated USING ((SELECT auth.uid()) = user_id);
CREATE POLICY "Create own literature" ON public.literature_items FOR INSERT TO authenticated WITH CHECK ((SELECT auth.uid()) = user_id);
CREATE POLICY "Update own literature" ON public.literature_items FOR UPDATE TO authenticated USING ((SELECT auth.uid()) = user_id) WITH CHECK ((SELECT auth.uid()) = user_id);
CREATE POLICY "Delete own literature" ON public.literature_items FOR DELETE TO authenticated USING ((SELECT auth.uid()) = user_id);
CREATE INDEX literature_items_owner_idx ON public.literature_items(user_id);

CREATE TABLE public.reviewer_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  manuscript_id uuid REFERENCES public.manuscripts(id) ON DELETE CASCADE,
  comment_number integer NOT NULL DEFAULT 1,
  reviewer_comment text NOT NULL,
  author_response text,
  manuscript_change text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','partially addressed','addressed')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.reviewer_comments TO authenticated;
GRANT ALL ON public.reviewer_comments TO service_role;
ALTER TABLE public.reviewer_comments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Read own reviewer comments" ON public.reviewer_comments FOR SELECT TO authenticated USING ((SELECT auth.uid()) = user_id);
CREATE POLICY "Create own reviewer comments" ON public.reviewer_comments FOR INSERT TO authenticated WITH CHECK ((SELECT auth.uid()) = user_id);
CREATE POLICY "Update own reviewer comments" ON public.reviewer_comments FOR UPDATE TO authenticated USING ((SELECT auth.uid()) = user_id) WITH CHECK ((SELECT auth.uid()) = user_id);
CREATE POLICY "Delete own reviewer comments" ON public.reviewer_comments FOR DELETE TO authenticated USING ((SELECT auth.uid()) = user_id);
CREATE INDEX reviewer_comments_owner_idx ON public.reviewer_comments(user_id);
CREATE INDEX reviewer_comments_manuscript_idx ON public.reviewer_comments(manuscript_id);