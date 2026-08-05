
-- ============ Module 5: academic planner ============
CREATE TABLE public.courses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  term text,
  year integer,
  name text NOT NULL,
  code text,
  credits numeric DEFAULT 3,
  grade text,
  grade_points numeric,
  target_grade_points numeric,
  attendance_pct numeric,
  status text NOT NULL DEFAULT 'in_progress',
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.courses TO authenticated;
GRANT ALL ON public.courses TO service_role;
ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own courses" ON public.courses FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER courses_set_updated_at BEFORE UPDATE ON public.courses FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.study_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  subject text,
  kind text NOT NULL DEFAULT 'focus',
  minutes integer NOT NULL DEFAULT 25,
  focus_score integer,
  notes text,
  occurred_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.study_sessions TO authenticated;
GRANT ALL ON public.study_sessions TO service_role;
ALTER TABLE public.study_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own study sessions" ON public.study_sessions FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE public.habits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  target_per_week integer NOT NULL DEFAULT 5,
  log jsonb NOT NULL DEFAULT '[]'::jsonb,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.habits TO authenticated;
GRANT ALL ON public.habits TO service_role;
ALTER TABLE public.habits ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own habits" ON public.habits FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER habits_set_updated_at BEFORE UPDATE ON public.habits FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.achievements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  kind text,
  issuer text,
  level text,
  awarded_on date,
  hours numeric,
  description text,
  evidence_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.achievements TO authenticated;
GRANT ALL ON public.achievements TO service_role;
ALTER TABLE public.achievements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own achievements" ON public.achievements FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER achievements_set_updated_at BEFORE UPDATE ON public.achievements FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.eca_opportunities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  organizer text,
  category text,
  type text,
  country text,
  mode text,
  level text,
  age_range text,
  deadline date,
  event_date date,
  funding text,
  fee text,
  link text,
  description text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.eca_opportunities TO anon, authenticated;
GRANT ALL ON public.eca_opportunities TO service_role;
ALTER TABLE public.eca_opportunities ENABLE ROW LEVEL SECURITY;
CREATE POLICY "eca opportunities are public" ON public.eca_opportunities FOR SELECT TO anon, authenticated USING (true);

-- ============ Module 6: test prep ============
CREATE TABLE public.test_targets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  exam text NOT NULL,
  target_score numeric,
  current_score numeric,
  test_date date,
  registered boolean NOT NULL DEFAULT false,
  center text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.test_targets TO authenticated;
GRANT ALL ON public.test_targets TO service_role;
ALTER TABLE public.test_targets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own test targets" ON public.test_targets FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER test_targets_set_updated_at BEFORE UPDATE ON public.test_targets FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.practice_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  exam text NOT NULL,
  section text,
  score numeric,
  max_score numeric,
  minutes integer,
  notes text,
  taken_at date NOT NULL DEFAULT current_date,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.practice_attempts TO authenticated;
GRANT ALL ON public.practice_attempts TO service_role;
ALTER TABLE public.practice_attempts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own practice attempts" ON public.practice_attempts FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE public.exam_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  exam text NOT NULL,
  event_type text NOT NULL,
  country text,
  event_date date,
  note text,
  link text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.exam_events TO anon, authenticated;
GRANT ALL ON public.exam_events TO service_role;
ALTER TABLE public.exam_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "exam events are public" ON public.exam_events FOR SELECT TO anon, authenticated USING (true);

-- ============ Module 7: SOP builder ============
ALTER TABLE public.sops
  ADD COLUMN IF NOT EXISTS doc_type text DEFAULT 'sop',
  ADD COLUMN IF NOT EXISTS country text,
  ADD COLUMN IF NOT EXISTS university text,
  ADD COLUMN IF NOT EXISTS word_limit integer,
  ADD COLUMN IF NOT EXISTS authenticity_score integer,
  ADD COLUMN IF NOT EXISTS outline jsonb;

CREATE TABLE public.sop_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  sop_id uuid NOT NULL REFERENCES public.sops(id) ON DELETE CASCADE,
  version integer NOT NULL DEFAULT 1,
  content text,
  ai_score integer,
  label text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sop_versions TO authenticated;
GRANT ALL ON public.sop_versions TO service_role;
ALTER TABLE public.sop_versions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own sop versions" ON public.sop_versions FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ============ seed: ECA opportunities ============
INSERT INTO public.eca_opportunities (name, organizer, category, type, country, mode, level, age_range, deadline, funding, fee, link, description) VALUES
('International Mathematical Olympiad (IMO)','IMO Foundation','Academic Competitions','Olympiad','Global','Offline','High School','Under 20','2026-03-15','Fully funded via national team','Free via national selection','https://www.imo-official.org','The premier pre-university mathematics competition; entry is through your national olympiad.'),
('International Physics Olympiad (IPhO)','IPhO','Academic Competitions','Olympiad','Global','Offline','High School','Under 20','2026-03-01','National team funded','Free','https://ipho-unofficial.org','Two five-hour exams in theory and experiment; national selection required.'),
('International Olympiad in Informatics (IOI)','IOI','Technology','Olympiad','Global','Offline','High School','Under 20','2026-03-20','National team funded','Free','https://ioinformatics.org','Algorithmic programming olympiad for secondary school students.'),
('International Chemistry Olympiad (IChO)','IChO','Academic Competitions','Olympiad','Global','Offline','High School','Under 20','2026-03-10','National team funded','Free','https://www.ichosc.org','Theoretical and practical chemistry competition.'),
('International Biology Olympiad (IBO)','IBO','Academic Competitions','Olympiad','Global','Offline','High School','Under 20','2026-03-10','National team funded','Free','https://www.ibo-info.org','Global biology competition with theory and lab practicals.'),
('Regeneron International Science and Engineering Fair (ISEF)','Society for Science','Academic Competitions','Science Fair','USA','Offline','High School','14-18','2026-02-15','USD 9M+ in prizes','Free via affiliated fair','https://www.societyforscience.org/isef/','The world''s largest pre-college STEM research competition.'),
('Harvard Model United Nations (HMUN)','Harvard University','Academic Competitions','MUN','USA','Offline','High School','15-18','2026-11-15','Partial scholarships','~USD 150','https://www.harvardmun.org','Four-day MUN conference in Boston with 3,000+ delegates.'),
('World Scholar''s Cup Tournament of Champions','World Scholar''s Cup','Academic Competitions','Debate','USA','Offline','High School','10-18','2026-08-01','Merit scholarships','Registration fee','https://www.scholarscup.org','Global academic team tournament with debate, writing and quiz rounds.'),
('MIT THINK Scholars Program','MIT','Research','Research Program','USA','Online','High School','Under 19','2026-01-01','Up to USD 1,000 project funding + mentorship','Free','https://think.mit.edu','Funds and mentors high-school students to build their own STEM research project.'),
('Research Science Institute (RSI)','CEE & MIT','Research','Summer Research','USA','Offline','High School','16-18','2026-01-11','Fully funded','Free','https://www.cee.org/programs/research-science-institute','Six-week fully funded summer research program at MIT.'),
('Google Summer of Code','Google','Technology','Open Source','Global','Online','Undergraduate','18+','2026-04-08','USD 1,500-6,600 stipend','Free','https://summerofcode.withgoogle.com','Paid open-source contribution program with mentoring organisations.'),
('MLH Global Hack Week','Major League Hacking','Technology','Hackathon','Global','Online','All levels','13+','2026-06-01','Prizes and swag','Free','https://mlh.io','Week-long global online hackathon events run year-round.'),
('NASA Space Apps Challenge','NASA','Technology','Hackathon','Global','Hybrid','All levels','All ages','2026-09-20','Global awards + NASA visit','Free','https://www.spaceappschallenge.org','48-hour hackathon solving challenges with NASA open data.'),
('FIRST Robotics Competition','FIRST','Technology','Robotics','Global','Offline','High School','14-18','2026-01-08','USD 80M+ in scholarships','Team registration fee','https://www.firstinspires.org/robotics/frc','International robotics competition for high-school teams.'),
('Kaggle Community Competitions','Kaggle','Technology','Data Science','Global','Online','All levels','All ages',NULL,'Cash prizes on featured comps','Free','https://www.kaggle.com/competitions','Continuous machine-learning competitions with public leaderboards.'),
('Diana Award','The Diana Award','Community Service','Leadership Award','UK','Hybrid','High School','9-25','2026-02-28','Award and mentoring','Free','https://diana-award.org.uk','The highest accolade a young person can receive for social action.'),
('UN Youth Volunteers Programme','United Nations Volunteers','Community Service','Volunteering','Global','Hybrid','Undergraduate','18-29','2026-05-31','Living allowance provided','Free','https://www.unv.org','UN placements for young volunteers in development projects worldwide.'),
('Global Citizen Year Academy','Global Citizen Year','Community Service','Leadership Program','Global','Online','High School','16-22','2026-03-15','Need-based scholarships','Varies','https://globalcitizenyear.org','Global leadership and social-impact fellowship for young people.'),
('Yale Young Global Scholars (YYGS)','Yale University','Leadership','Summer School','USA','Offline','High School','16-18','2026-01-10','Full need-based aid','USD 6,500','https://globalscholars.yale.edu','Two-week academic summer program on Yale''s campus.'),
('LSE Summer School','London School of Economics','Leadership','Summer School','UK','Hybrid','Undergraduate','18+','2026-05-01','Some scholarships','From GBP 2,700','https://www.lse.ac.uk/study-at-lse/summer-schools','University-level courses in economics, law, management and more.'),
('Oxford UNIQ Summer School','University of Oxford','Leadership','Summer School','UK','Offline','High School','16-18','2026-01-20','Free for UK state-school students','Free','https://www.uniq.ox.ac.uk','Free Oxford summer school for academically able UK students.'),
('Hult Prize','Hult Prize Foundation','Entrepreneurship','Business Competition','Global','Hybrid','Undergraduate','18+','2026-01-31','USD 1M seed prize','Free','https://www.hultprize.org','The world''s largest student social-entrepreneurship competition.'),
('Y Combinator Startup School','Y Combinator','Entrepreneurship','Incubator','Global','Online','All levels','18+',NULL,'Free curriculum + deals','Free','https://www.startupschool.org','Free online course and community for early-stage founders.'),
('Global Student Entrepreneur Awards','EO','Entrepreneurship','Business Competition','Global','Hybrid','Undergraduate','18+','2026-09-30','USD 50,000+ prizes','Free','https://gsea.org','Premier global competition for students who own and run businesses.'),
('Conrad Challenge','Conrad Foundation','Entrepreneurship','Innovation Challenge','Global','Hybrid','High School','13-18','2026-11-01','Scholarships and patent support','Free entry round','https://www.conradchallenge.org','Innovation and entrepreneurship competition solving global problems.'),
('Scholastic Art & Writing Awards','Alliance for Young Artists & Writers','Arts & Creativity','Arts Competition','USA','Online','High School','13-18','2026-01-10','Up to USD 12,500 scholarships','Entry fee, waivers available','https://www.artandwriting.org','The longest-running recognition program for creative teens in the US.'),
('International Youth Film Festival','Various','Arts & Creativity','Arts Competition','Global','Hybrid','High School','13-21','2026-04-30','Prizes and screenings','Small entry fee','https://www.filmfreeway.com','Youth-focused film festivals accepting short films worldwide.'),
('Youth Olympic Games Qualifiers','International Olympic Committee','Sports','International Competition','Global','Offline','High School','15-18','2026-04-01','National federation funded','Free via federation','https://olympics.com/ioc/youth-olympic-games','Elite multi-sport competition for young athletes.'),
('Microsoft Imagine Cup','Microsoft','Technology','Innovation Challenge','Global','Online','Undergraduate','16+','2026-01-20','USD 100,000 grand prize','Free','https://imaginecup.microsoft.com','Global student technology innovation competition.'),
('Global Undergraduate Awards','The Undergraduate Awards','Research','Research Competition','Global','Online','Undergraduate','18+','2026-06-10','Summit attendance funded','Free','https://undergraduateawards.com','The world''s largest academic awards programme for undergraduate coursework.');

-- ============ seed: exam calendar ============
INSERT INTO public.exam_events (exam, event_type, country, event_date, note, link) VALUES
('IELTS Academic','Test date','Global','2026-08-15','Paper and computer-delivered sittings; multiple dates monthly','https://ielts.org/take-a-test/book-a-test'),
('IELTS Academic','Test date','Global','2026-09-05','Computer-delivered, results in 3-5 days','https://ielts.org/take-a-test/book-a-test'),
('IELTS Academic','Score release','Global','2026-08-28','Paper-based results 13 days after the test','https://ielts.org/take-a-test/results'),
('IELTS UKVI','Test date','Global','2026-08-22','UKVI sittings at approved centres only','https://ielts.org/take-a-test/test-types/ielts-for-ukvi'),
('TOEFL iBT','Test date','Global','2026-08-08','Home Edition available 24/7 in most countries','https://www.ets.org/toefl/test-takers/ibt/register.html'),
('TOEFL iBT','Score release','Global','2026-08-14','Scores posted 4-8 days after the test','https://www.ets.org/toefl/test-takers/ibt/scores.html'),
('PTE Academic','Test date','Global','2026-08-12','Sittings almost daily; results typically within 48 hours','https://www.pearsonpte.com/book-now'),
('Duolingo English Test','Test date','Global','2026-08-01','On-demand from home; results within 2 days','https://englishtest.duolingo.com'),
('Cambridge C1 Advanced','Registration deadline','Global','2026-09-18','Register through a local Cambridge exam centre','https://www.cambridgeenglish.org/exams-and-tests/advanced/'),
('SAT','Registration deadline','Global','2026-08-14','Deadline for the August digital SAT','https://satsuite.collegeboard.org/sat/registration'),
('SAT','Test date','Global','2026-09-12','Digital SAT international administration','https://satsuite.collegeboard.org/sat/registration/dates-deadlines'),
('SAT','Score release','Global','2026-09-26','Digital SAT scores released about two weeks after test day','https://satsuite.collegeboard.org/sat/scores'),
('ACT','Test date','Global','2026-09-12','September national ACT test date','https://www.act.org/content/act/en/products-and-services/the-act/registration.html'),
('AP Examinations','Test date','Global','2027-05-03','AP exams run over two weeks each May','https://apstudents.collegeboard.org/exam-calendar'),
('GRE General Test','Test date','Global','2026-08-20','Test at home or at a centre year-round','https://www.ets.org/gre/test-takers/general-test/register.html'),
('GRE General Test','Score release','Global','2026-09-08','Official scores available 8-10 days after the test','https://www.ets.org/gre/test-takers/general-test/scores.html'),
('GMAT Focus Edition','Test date','Global','2026-08-18','Appointments available year-round, online or at a centre','https://www.mba.com/exams/gmat-exam/schedule-a-gmat-exam'),
('JLPT','Registration deadline','Japan','2026-08-28','December sitting registration closes late August','https://www.jlpt.jp/e/'),
('JLPT','Test date','Global','2026-12-06','December JLPT administration worldwide','https://www.jlpt.jp/e/'),
('TOPIK','Test date','Global','2026-10-18','Overseas TOPIK administration','https://www.topik.go.kr'),
('TestAS','Test date','Global','2026-10-24','Core and subject modules for German university admission','https://www.testas.de'),
('DELF / DALF','Registration deadline','Global','2026-09-15','Register via your local Institut francais or Alliance francaise','https://www.france-education-international.fr/en/diplomes-tests'),
('Goethe-Zertifikat','Test date','Global','2026-09-26','Dates vary by Goethe-Institut location','https://www.goethe.de/en/spr/prf.html'),
('DELE','Registration deadline','Global','2026-09-11','November DELE session registration deadline','https://examenes.cervantes.es');
