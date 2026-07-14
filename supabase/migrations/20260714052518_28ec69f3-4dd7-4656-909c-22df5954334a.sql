
-- 1) Extend profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS avatar_url text,
  ADD COLUMN IF NOT EXISTS phone text,
  ADD COLUMN IF NOT EXISTS date_of_birth date,
  ADD COLUMN IF NOT EXISTS gender text,
  ADD COLUMN IF NOT EXISTS school_name text,
  ADD COLUMN IF NOT EXISTS graduation_year integer,
  ADD COLUMN IF NOT EXISTS city text,
  ADD COLUMN IF NOT EXISTS bio text,
  ADD COLUMN IF NOT EXISTS languages text[] DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS linkedin_url text,
  ADD COLUMN IF NOT EXISTS github_url text,
  ADD COLUMN IF NOT EXISTS orcid text,
  ADD COLUMN IF NOT EXISTS website_url text,
  ADD COLUMN IF NOT EXISTS work_experience text,
  ADD COLUMN IF NOT EXISTS honors text,
  ADD COLUMN IF NOT EXISTS publications text,
  ADD COLUMN IF NOT EXISTS target_level text,
  ADD COLUMN IF NOT EXISTS intake_year integer;

-- 2) Tasks
CREATE TABLE IF NOT EXISTS public.tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  title text NOT NULL,
  category text,
  due_date date,
  priority text NOT NULL DEFAULT 'normal',
  notes text,
  completed boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tasks TO authenticated;
GRANT ALL ON public.tasks TO service_role;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own tasks read"   ON public.tasks FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "own tasks insert" ON public.tasks FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own tasks update" ON public.tasks FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own tasks delete" ON public.tasks FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE TRIGGER tasks_set_updated_at BEFORE UPDATE ON public.tasks FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 3) Universities (public read)
CREATE TABLE IF NOT EXISTS public.universities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  country text NOT NULL,
  city text,
  world_rank integer,
  tuition_usd integer,
  acceptance_rate numeric,
  programs text[] DEFAULT '{}'::text[],
  levels text[] DEFAULT '{}'::text[],
  language text,
  website text,
  description text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.universities TO anon, authenticated;
GRANT ALL ON public.universities TO service_role;
ALTER TABLE public.universities ENABLE ROW LEVEL SECURITY;
CREATE POLICY "universities public read" ON public.universities FOR SELECT TO anon, authenticated USING (true);

-- 4) Scholarships (public read)
CREATE TABLE IF NOT EXISTS public.scholarships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  provider text,
  country text,
  level text,
  amount text,
  deadline date,
  eligibility text,
  fields text[] DEFAULT '{}'::text[],
  link text,
  fully_funded boolean NOT NULL DEFAULT false,
  description text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.scholarships TO anon, authenticated;
GRANT ALL ON public.scholarships TO service_role;
ALTER TABLE public.scholarships ENABLE ROW LEVEL SECURITY;
CREATE POLICY "scholarships public read" ON public.scholarships FOR SELECT TO anon, authenticated USING (true);

-- 5) Saved items (user bookmarks)
CREATE TABLE IF NOT EXISTS public.saved_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  item_type text NOT NULL CHECK (item_type IN ('university','scholarship')),
  item_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, item_type, item_id)
);
GRANT SELECT, INSERT, DELETE ON public.saved_items TO authenticated;
GRANT ALL ON public.saved_items TO service_role;
ALTER TABLE public.saved_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own saved read"   ON public.saved_items FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "own saved insert" ON public.saved_items FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own saved delete" ON public.saved_items FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- 6) Seed universities
INSERT INTO public.universities (name, country, city, world_rank, tuition_usd, acceptance_rate, programs, levels, language, website, description) VALUES
('Massachusetts Institute of Technology', 'USA', 'Cambridge', 1, 57986, 4.0, ARRAY['Computer Science','Electrical Engineering','Physics','Mathematics','Mechanical Engineering'], ARRAY['UG','Masters','PhD'], 'English', 'https://mit.edu', 'World-leading STEM research university.'),
('Stanford University', 'USA', 'Stanford', 3, 61731, 3.9, ARRAY['Computer Science','Business','Medicine','Engineering'], ARRAY['UG','Masters','PhD'], 'English', 'https://stanford.edu', 'Silicon Valley''s research powerhouse.'),
('Harvard University', 'USA', 'Cambridge', 4, 57261, 3.4, ARRAY['Law','Business','Medicine','Computer Science','Humanities'], ARRAY['UG','Masters','PhD'], 'English', 'https://harvard.edu', 'Oldest university in the United States.'),
('University of Oxford', 'UK', 'Oxford', 2, 40000, 17.5, ARRAY['PPE','Computer Science','Medicine','Humanities'], ARRAY['UG','Masters','PhD'], 'English', 'https://ox.ac.uk', 'Historic collegiate research university.'),
('University of Cambridge', 'UK', 'Cambridge', 5, 39000, 21.0, ARRAY['Mathematics','Physics','Engineering','Medicine'], ARRAY['UG','Masters','PhD'], 'English', 'https://cam.ac.uk', 'Renowned for mathematics and the sciences.'),
('ETH Zurich', 'Switzerland', 'Zurich', 7, 1600, 27.0, ARRAY['Computer Science','Engineering','Physics'], ARRAY['UG','Masters','PhD'], 'English/German', 'https://ethz.ch', 'Top European technical university.'),
('Technical University of Munich', 'Germany', 'Munich', 37, 300, 8.0, ARRAY['Engineering','Computer Science','Physics'], ARRAY['UG','Masters','PhD'], 'German/English', 'https://tum.de', 'Public research university with minimal tuition.'),
('University of Toronto', 'Canada', 'Toronto', 21, 45000, 43.0, ARRAY['Computer Science','Medicine','Business'], ARRAY['UG','Masters','PhD'], 'English', 'https://utoronto.ca', 'Canada''s top research university.'),
('University of Melbourne', 'Australia', 'Melbourne', 14, 33000, 70.0, ARRAY['Medicine','Law','Business'], ARRAY['UG','Masters','PhD'], 'English', 'https://unimelb.edu.au', 'Australian Group of Eight member.'),
('National University of Singapore', 'Singapore', 'Singapore', 8, 30000, 5.0, ARRAY['Computer Science','Business','Engineering'], ARRAY['UG','Masters','PhD'], 'English', 'https://nus.edu.sg', 'Asia''s top-ranked university.'),
('University of Tokyo', 'Japan', 'Tokyo', 28, 4800, 34.0, ARRAY['Physics','Engineering','Medicine'], ARRAY['UG','Masters','PhD'], 'Japanese/English', 'https://u-tokyo.ac.jp', 'Japan''s flagship research university.'),
('KAIST', 'South Korea', 'Daejeon', 53, 6000, 30.0, ARRAY['Computer Science','Engineering','AI'], ARRAY['UG','Masters','PhD'], 'English/Korean', 'https://kaist.ac.kr', 'Leading Korean STEM institution.'),
('Sciences Po', 'France', 'Paris', 260, 15000, 20.0, ARRAY['Politics','International Relations','Economics'], ARRAY['UG','Masters'], 'French/English', 'https://sciencespo.fr', 'Political science and social sciences.'),
('KU Leuven', 'Belgium', 'Leuven', 60, 5500, 30.0, ARRAY['Engineering','Medicine','Humanities'], ARRAY['UG','Masters','PhD'], 'English/Dutch', 'https://kuleuven.be', 'Oldest Catholic university in continuous operation.'),
('IIT Bombay', 'India', 'Mumbai', 149, 3000, 2.0, ARRAY['Computer Science','Engineering'], ARRAY['UG','Masters','PhD'], 'English', 'https://iitb.ac.in', 'Premier Indian technical institute.');

-- 7) Seed scholarships
INSERT INTO public.scholarships (name, provider, country, level, amount, deadline, eligibility, fields, link, fully_funded, description) VALUES
('Fulbright Foreign Student Program', 'US Government', 'USA', 'Masters/PhD', 'Full tuition + stipend', '2026-10-15', 'Non-US citizens with a bachelor''s degree', ARRAY['Any'], 'https://foreign.fulbrightonline.org', true, 'Prestigious US graduate scholarship.'),
('Chevening Scholarship', 'UK Government', 'UK', 'Masters', 'Full tuition + living', '2026-11-01', 'Leadership potential, 2+ years work experience', ARRAY['Any'], 'https://chevening.org', true, 'Fully funded one-year Master''s in the UK.'),
('DAAD Scholarship', 'German Government', 'Germany', 'Masters/PhD', '€1,200/month + tuition', '2026-10-31', 'Bachelor''s degree, strong academics', ARRAY['Any'], 'https://daad.de', true, 'German government scholarships.'),
('MEXT Scholarship', 'Japanese Government', 'Japan', 'UG/Masters/PhD', 'Full tuition + ¥143k/month', '2026-06-01', 'Under 35, strong academics', ARRAY['Any'], 'https://mext.go.jp', true, 'Study in Japan fully funded.'),
('Erasmus Mundus Joint Masters', 'European Union', 'EU', 'Masters', '€1,400/month + travel', '2027-01-15', 'Bachelor''s degree, English proficiency', ARRAY['Any'], 'https://erasmus-plus.ec.europa.eu', true, 'Study in multiple EU countries.'),
('Rhodes Scholarship', 'Rhodes Trust', 'UK', 'Masters/PhD', 'Full Oxford tuition + stipend', '2026-08-01', 'Age 18–24, exceptional academics + leadership', ARRAY['Any'], 'https://rhodeshouse.ox.ac.uk', true, 'Oxford''s most prestigious scholarship.'),
('Gates Cambridge', 'Gates Foundation', 'UK', 'Masters/PhD', 'Full tuition + £18k/year', '2026-12-03', 'Outstanding academics and leadership', ARRAY['Any'], 'https://gatescambridge.org', true, 'Full postgraduate scholarships at Cambridge.'),
('Knight-Hennessy Scholars', 'Stanford University', 'USA', 'Masters/PhD', 'Full tuition + stipend', '2026-10-09', 'Applicants to Stanford graduate programs', ARRAY['Any'], 'https://knight-hennessy.stanford.edu', true, 'Stanford graduate leadership program.'),
('Australia Awards', 'Australian Government', 'Australia', 'UG/Masters', 'Full tuition + living', '2026-04-30', 'Citizens of eligible developing countries', ARRAY['Development','Health','Education'], 'https://australiaawards.gov.au', true, 'Development-focused scholarships.'),
('Vanier CGS', 'Government of Canada', 'Canada', 'PhD', 'CA$50,000/year × 3 years', '2026-11-01', 'Doctoral students at Canadian universities', ARRAY['Any'], 'https://vanier.gc.ca', true, 'Top Canadian PhD scholarship.'),
('Swiss Government Excellence', 'Swiss Government', 'Switzerland', 'Masters/PhD', 'CHF 1,920/month + tuition', '2026-12-01', 'Advanced students & researchers', ARRAY['Any'], 'https://sbfi.admin.ch', true, 'For research or postgrad in Switzerland.'),
('Singapore International Graduate Award', 'Singapore Government', 'Singapore', 'PhD', 'Full tuition + S$2,500/month', '2026-06-01', 'International students pursuing PhD in Singapore', ARRAY['STEM'], 'https://a-star.edu.sg/Scholarships', true, 'Fully funded PhD in Singapore.');
