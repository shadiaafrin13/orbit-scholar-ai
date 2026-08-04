
-- Extend catalogs
ALTER TABLE public.research_opportunities
  ADD COLUMN IF NOT EXISTS category text,
  ADD COLUMN IF NOT EXISTS level text,
  ADD COLUMN IF NOT EXISTS mode text,
  ADD COLUMN IF NOT EXISTS duration text,
  ADD COLUMN IF NOT EXISTS eligibility text,
  ADD COLUMN IF NOT EXISTS funded boolean NOT NULL DEFAULT false;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS scholar_url text,
  ADD COLUMN IF NOT EXISTS researchgate_url text;

CREATE TABLE IF NOT EXISTS public.journals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  publisher text,
  scope text,
  field text,
  impact_factor numeric,
  citescore numeric,
  quartile text,
  indexing text[] DEFAULT '{}',
  apc_usd integer,
  acceptance_rate numeric,
  review_weeks integer,
  publication_weeks integer,
  open_access text,
  guidelines_url text,
  link text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.journals TO anon, authenticated;
GRANT ALL ON public.journals TO service_role;
ALTER TABLE public.journals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "journals public read" ON public.journals FOR SELECT TO anon, authenticated USING (true);

CREATE TABLE IF NOT EXISTS public.conferences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  organizer text,
  field text,
  topics text[] DEFAULT '{}',
  location text,
  country text,
  format text,
  start_date date,
  paper_deadline date,
  registration_fee text,
  acceptance_rate numeric,
  proceedings text,
  awards text,
  travel_grants boolean DEFAULT false,
  student_discount boolean DEFAULT false,
  link text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.conferences TO anon, authenticated;
GRANT ALL ON public.conferences TO service_role;
ALTER TABLE public.conferences ENABLE ROW LEVEL SECURITY;
CREATE POLICY "conferences public read" ON public.conferences FOR SELECT TO anon, authenticated USING (true);

CREATE TABLE IF NOT EXISTS public.professors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  university text,
  department text,
  country text,
  title text,
  research_areas text[] DEFAULT '{}',
  keywords text[] DEFAULT '{}',
  bio text,
  citations integer,
  h_index integer,
  orcid text,
  scholar_url text,
  website text,
  lab_name text,
  current_projects text,
  grants text,
  open_positions boolean DEFAULT false,
  accepting_students boolean DEFAULT false,
  collaboration_open boolean DEFAULT false,
  email text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.professors TO anon, authenticated;
GRANT ALL ON public.professors TO service_role;
ALTER TABLE public.professors ENABLE ROW LEVEL SECURITY;
CREATE POLICY "professors public read" ON public.professors FOR SELECT TO anon, authenticated USING (true);

CREATE TABLE IF NOT EXISTS public.research_grants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  funder text,
  type text,
  country text,
  amount text,
  duration text,
  eligibility text,
  fields text[] DEFAULT '{}',
  deadline date,
  link text,
  description text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.research_grants TO anon, authenticated;
GRANT ALL ON public.research_grants TO service_role;
ALTER TABLE public.research_grants ENABLE ROW LEVEL SECURITY;
CREATE POLICY "research grants public read" ON public.research_grants FOR SELECT TO anon, authenticated USING (true);

CREATE TABLE IF NOT EXISTS public.manuscripts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  target_venue text,
  venue_type text DEFAULT 'journal',
  stage text NOT NULL DEFAULT 'drafting',
  submitted_at date,
  decision_at date,
  revision_round integer DEFAULT 0,
  doi text,
  reviewer_notes text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.manuscripts TO authenticated;
GRANT ALL ON public.manuscripts TO service_role;
ALTER TABLE public.manuscripts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own manuscripts read" ON public.manuscripts FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "own manuscripts insert" ON public.manuscripts FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own manuscripts update" ON public.manuscripts FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own manuscripts delete" ON public.manuscripts FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE TRIGGER manuscripts_set_updated_at BEFORE UPDATE ON public.manuscripts FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Seeds
INSERT INTO public.journals (name, publisher, scope, field, impact_factor, citescore, quartile, indexing, apc_usd, acceptance_rate, review_weeks, publication_weeks, open_access, link) VALUES
('Nature','Nature Portfolio','Multidisciplinary science of outstanding significance','Multidisciplinary',50.5,90.0,'Q1','{Scopus,"Web of Science",SCIE}',12290,8,8,12,'Hybrid','https://www.nature.com/nature/'),
('Science','AAAS','High-impact original research across all sciences','Multidisciplinary',44.7,72.0,'Q1','{Scopus,"Web of Science",SCIE}',4500,7,6,10,'Hybrid','https://www.science.org/journal/science'),
('Nature Communications','Nature Portfolio','Open-access multidisciplinary research','Multidisciplinary',14.7,24.9,'Q1','{Scopus,SCIE}',6790,8,14,20,'Full OA','https://www.nature.com/ncomms/'),
('IEEE Transactions on Pattern Analysis and Machine Intelligence','IEEE','Computer vision, pattern recognition, machine learning','Computer Science',20.8,45.0,'Q1','{Scopus,SCIE,IEEE}',2445,17,26,40,'Hybrid','https://www.computer.org/csdl/journal/tp'),
('IEEE Access','IEEE','Multidisciplinary rapid-review open access','Engineering',3.4,9.0,'Q2','{Scopus,SCIE,IEEE}',1995,30,4,6,'Full OA','https://ieeeaccess.ieee.org/'),
('ACM Computing Surveys','ACM','Comprehensive computing surveys','Computer Science',23.8,33.0,'Q1','{Scopus,SCIE,ACM}',1800,15,20,30,'Hybrid','https://dl.acm.org/journal/csur'),
('Journal of Machine Learning Research','JMLR','Machine learning theory and practice','Computer Science',6.0,18.0,'Q1','{Scopus,SCIE}',0,18,20,24,'Full OA (free)','https://www.jmlr.org/'),
('The Lancet','Elsevier','Clinical medicine and global health','Medicine',98.4,110.0,'Q1','{Scopus,SCIE,PubMed}',6830,5,6,10,'Hybrid','https://www.thelancet.com/'),
('Cell','Elsevier','Molecular and cell biology','Life Sciences',45.5,60.0,'Q1','{Scopus,SCIE,PubMed}',9900,10,8,14,'Hybrid','https://www.cell.com/cell/home'),
('PLOS ONE','PLOS','Rigorous multidisciplinary open access','Multidisciplinary',2.9,7.3,'Q2','{Scopus,SCIE,PubMed}',1805,45,12,18,'Full OA','https://journals.plos.org/plosone/'),
('Scientific Reports','Nature Portfolio','Natural sciences, medicine, engineering','Multidisciplinary',3.8,7.7,'Q2','{Scopus,SCIE}',2290,48,14,20,'Full OA','https://www.nature.com/srep/'),
('Sensors','MDPI','Sensor science and IoT systems','Engineering',3.4,7.3,'Q2','{Scopus,SCIE}',2600,42,3,5,'Full OA','https://www.mdpi.com/journal/sensors'),
('Sustainability','MDPI','Environmental, social and economic sustainability','Environment',3.3,6.8,'Q2','{Scopus,SSCI,SCIE}',2800,38,3,5,'Full OA','https://www.mdpi.com/journal/sustainability'),
('Frontiers in Psychology','Frontiers','Psychology across all subfields','Psychology',2.6,5.3,'Q2','{Scopus,SSCI}',3195,42,10,14,'Full OA','https://www.frontiersin.org/journals/psychology'),
('Advanced Materials','Wiley','Materials science and nanotechnology','Materials',27.4,44.0,'Q1','{Scopus,SCIE}',6390,18,8,12,'Hybrid','https://onlinelibrary.wiley.com/journal/15214095'),
('Journal of Cleaner Production','Elsevier','Cleaner production and sustainability','Environment',9.7,20.4,'Q1','{Scopus,SCIE}',3670,20,12,18,'Hybrid','https://www.sciencedirect.com/journal/journal-of-cleaner-production'),
('Studies in Higher Education','Taylor & Francis','Higher education research and policy','Education',4.5,8.5,'Q1','{Scopus,SSCI}',3395,15,16,24,'Hybrid','https://www.tandfonline.com/journals/cshe20'),
('Journal of Management','SAGE','Management theory and empirical work','Business',11.8,20.0,'Q1','{Scopus,SSCI}',3500,7,20,30,'Hybrid','https://journals.sagepub.com/home/jom'),
('The Economic Journal','Oxford University Press','Economics research','Economics',3.9,7.0,'Q1','{Scopus,SSCI}',3500,8,24,36,'Hybrid','https://academic.oup.com/ej'),
('Journal of Fluid Mechanics','Cambridge University Press','Theoretical and applied fluid mechanics','Engineering',3.6,7.3,'Q1','{Scopus,SCIE}',3145,25,16,22,'Hybrid','https://www.cambridge.org/core/journals/journal-of-fluid-mechanics'),
('Emerald Insight: Internet Research','Emerald','Digital and internet-based research','Information Systems',6.3,15.0,'Q1','{Scopus,SSCI}',3300,12,16,22,'Hybrid','https://www.emerald.com/insight/publication/issn/1066-2243'),
('Springer Nature: Machine Learning','Springer','Machine learning research','Computer Science',4.3,11.0,'Q1','{Scopus,SCIE}',3290,20,20,28,'Hybrid','https://link.springer.com/journal/10994')
ON CONFLICT DO NOTHING;

INSERT INTO public.conferences (name, organizer, field, topics, location, country, format, start_date, paper_deadline, registration_fee, acceptance_rate, proceedings, awards, travel_grants, student_discount, link) VALUES
('NeurIPS 2026','NeurIPS Foundation','Machine Learning','{"Deep learning","Optimization","Generative models"}','San Diego','USA','Hybrid','2026-12-06','2026-05-15','USD 1,100',25,'PMLR','Best Paper, Datasets Track',true,true,'https://neurips.cc/'),
('ICML 2026','IMLS','Machine Learning','{"Learning theory","RL","LLMs"}','Seoul','South Korea','In-person','2026-07-12','2026-01-28','USD 950',27,'PMLR','Best Paper',true,true,'https://icml.cc/'),
('ICLR 2026','ICLR','Machine Learning','{"Representation learning","Foundation models"}','Rio de Janeiro','Brazil','Hybrid','2026-04-24','2025-09-24','USD 800',31,'OpenReview','Outstanding Paper',true,true,'https://iclr.cc/'),
('CVPR 2026','IEEE/CVF','Computer Vision','{"3D vision","Multimodal","Video"}','Denver','USA','In-person','2026-06-14','2025-11-14','USD 1,050',23,'IEEE Xplore','Best Paper Award',true,true,'https://cvpr.thecvf.com/'),
('ACL 2026','ACL','NLP','{"LLMs","Multilinguality","Evaluation"}','Vienna','Austria','Hybrid','2026-07-26','2026-02-15','EUR 700',21,'ACL Anthology','Best Long Paper',true,true,'https://www.aclweb.org/'),
('SIGCHI CHI 2026','ACM','Human-Computer Interaction','{"UX","Accessibility","AI interfaces"}','Barcelona','Spain','Hybrid','2026-04-18','2025-09-11','EUR 850',26,'ACM DL','Best Paper, Honorable Mention',true,true,'https://chi2026.acm.org/'),
('SIGGRAPH 2026','ACM','Graphics','{"Rendering","Simulation","Neural graphics"}','Los Angeles','USA','Hybrid','2026-08-09','2026-01-22','USD 1,200',20,'ACM TOG','Best Paper',false,true,'https://s2026.siggraph.org/'),
('IEEE ICRA 2026','IEEE RAS','Robotics','{"Manipulation","SLAM","Human-robot interaction"}','Vienna','Austria','In-person','2026-06-01','2025-09-15','EUR 780',43,'IEEE Xplore','Best Student Paper',true,true,'https://www.ieee-ras.org/conferences-workshops/fully-sponsored/icra'),
('IEEE INFOCOM 2026','IEEE','Networking','{"5G/6G","Edge computing","Network security"}','Tokyo','Japan','In-person','2026-05-11','2025-07-31','USD 850',19,'IEEE Xplore','Best Paper',false,true,'https://infocom2026.ieee-infocom.org/'),
('ACM SIGCOMM 2026','ACM','Networking','{"Internet architecture","Datacenter networks"}','Coimbra','Portugal','In-person','2026-08-17','2026-01-30','EUR 700',17,'ACM DL','Best Paper',true,true,'https://conferences.sigcomm.org/sigcomm/'),
('ESWC 2026','Springer','Semantic Web','{"Knowledge graphs","Ontologies","LLM+KG"}','Crete','Greece','Hybrid','2026-05-31','2025-12-04','EUR 600',28,'Springer LNCS','Best Research Paper',true,true,'https://eswc-conferences.org/'),
('AAAI 2026','AAAI','Artificial Intelligence','{"Reasoning","Planning","AI ethics"}','Singapore','Singapore','Hybrid','2026-01-20','2025-08-07','USD 900',23,'AAAI Press','Outstanding Paper',true,true,'https://aaai.org/conference/aaai/'),
('AGU Fall Meeting 2026','American Geophysical Union','Earth Science','{"Climate","Geophysics","Hydrology"}','New Orleans','USA','Hybrid','2026-12-14','2026-08-05','USD 750',null,'AGU Abstracts','Outstanding Student Presentation',true,true,'https://www.agu.org/fall-meeting'),
('Society for Neuroscience 2026','SfN','Neuroscience','{"Systems neuroscience","Neuroimaging"}','Chicago','USA','In-person','2026-10-17','2026-05-05','USD 560',null,'SfN Abstracts','Trainee Awards',true,true,'https://www.sfn.org/meetings/neuroscience-2026'),
('APS March Meeting 2026','American Physical Society','Physics','{"Condensed matter","Quantum information"}','Denver','USA','Hybrid','2026-03-02','2025-10-31','USD 700',null,'APS Abstracts','Student Travel Awards',true,true,'https://www.aps.org/meetings/march/'),
('ECCB 2026','Springer','Bioinformatics','{"Genomics","Structural biology","ML in biology"}','Copenhagen','Denmark','In-person','2026-09-13','2026-04-10','EUR 650',30,'Bioinformatics (OUP)','Best Poster',true,true,'https://eccb2026.org/'),
('WWW (The Web Conference) 2026','ACM/IW3C2','Web & Data Mining','{"Search","Recommendation","Social computing"}','Dubai','UAE','Hybrid','2026-04-13','2025-10-14','USD 800',20,'ACM DL','Best Paper',true,true,'https://www2026.thewebconf.org/'),
('Elsevier ICSC 2026','Elsevier','Sustainable Computing','{"Green computing","Energy systems"}','Amsterdam','Netherlands','Hybrid','2026-09-21','2026-03-15','EUR 550',35,'Elsevier Procedia','Best Student Paper',false,true,'https://www.elsevier.com/events')
ON CONFLICT DO NOTHING;

INSERT INTO public.professors (name, university, department, country, title, research_areas, keywords, bio, citations, h_index, orcid, scholar_url, website, lab_name, current_projects, grants, open_positions, accepting_students, collaboration_open, email) VALUES
('Yoshua Bengio','Université de Montréal / Mila','Computer Science','Canada','Full Professor','{"Deep learning","AI safety"}','{"representation learning","GFlowNets","AI risk"}','Turing Award laureate; founder of Mila, focused on deep learning and AI safety.',700000,230,'0000-0002-9322-3515','https://scholar.google.com/citations?user=kukA0LcAAAAJ','https://yoshuabengio.org/','Mila','GFlowNets for scientific discovery; AI safety governance','CIFAR, NSERC Discovery',true,true,true,'admissions@mila.quebec'),
('Fei-Fei Li','Stanford University','Computer Science','USA','Professor','{"Computer vision","Human-centered AI"}','{"ImageNet","embodied AI","healthcare AI"}','Co-director of Stanford HAI; pioneer of large-scale visual recognition.',280000,150,'0000-0002-1801-1497','https://scholar.google.com/citations?user=rDfyQnIAAAAJ','https://profiles.stanford.edu/fei-fei-li','Stanford Vision & Learning Lab','Ambient intelligence in healthcare; embodied agents','NIH, NSF',true,true,true,'admissions@cs.stanford.edu'),
('Regina Barzilay','MIT','EECS','USA','Professor','{"NLP","AI for healthcare"}','{"drug discovery","clinical NLP","molecular ML"}','MacArthur Fellow working on machine learning for oncology and drug design.',60000,95,'0000-0002-1965-4842','https://scholar.google.com/citations?user=IqQQp8IAAAAJ','https://www.regina.csail.mit.edu/','MIT Jameel Clinic','AI-driven antibiotic discovery; breast cancer risk models','NIH, DARPA',true,true,true,'phd-admissions@csail.mit.edu'),
('Zoubin Ghahramani','University of Cambridge','Engineering','UK','Professor','{"Probabilistic ML","Bayesian methods"}','{"Gaussian processes","automatic statistician"}','Leading researcher in Bayesian machine learning and probabilistic programming.',95000,120,'0000-0003-0570-3141','https://scholar.google.com/citations?user=0uTu7fYAAAAJ','https://mlg.eng.cam.ac.uk/zoubin/','Cambridge MLG','Probabilistic foundation models','EPSRC, ERC',false,true,true,'graduate.enquiries@eng.cam.ac.uk'),
('Andrew Blake','University of Oxford','Engineering Science','UK','Professor','{"Computer vision","Probabilistic inference"}','{"segmentation","tracking"}','Vision researcher; former director of Microsoft Research Cambridge.',60000,90,null,'https://scholar.google.com/','https://www.ox.ac.uk/','Oxford VGG-adjacent','Real-time scene understanding','EPSRC',false,true,true,'graduate.studies@eng.ox.ac.uk'),
('Thomas Hofmann','ETH Zurich','Computer Science','Switzerland','Professor','{"Data analytics","Deep learning"}','{"LLMs","optimization","information retrieval"}','Leads the Data Analytics Lab at ETH; works on large language models.',45000,72,null,'https://scholar.google.com/citations?user=T3hAyLkAAAAJ','https://da.inf.ethz.ch/','Data Analytics Lab','Efficient LLM training; Swiss AI initiative','SNSF, ETH Grants',true,true,true,'phd-applications@inf.ethz.ch'),
('Bernhard Schölkopf','Max Planck Institute for Intelligent Systems','Empirical Inference','Germany','Director','{"Causal inference","Kernel methods"}','{"causality","representation learning"}','Director at MPI-IS; foundational work on kernel methods and causality.',200000,160,'0000-0002-8177-0925','https://scholar.google.com/citations?user=DZ-fHPgAAAAJ','https://www.is.mpg.de/~bs','Empirical Inference Department','Causal representation learning for science','ERC Advanced Grant',true,true,true,'office-bs@tuebingen.mpg.de'),
('Jitendra Malik','UC Berkeley','EECS','USA','Professor','{"Computer vision","Robotics"}','{"perception","embodied learning"}','Pioneer of modern computer vision and robot learning.',350000,180,null,'https://scholar.google.com/citations?user=oY9R5YQAAAAJ','https://people.eecs.berkeley.edu/~malik/','Malik Group','Embodied perception and legged locomotion','NSF, ONR',true,true,true,'eecs-grad@berkeley.edu'),
('Daphne Koller','Stanford University','Computer Science','USA','Adjunct Professor','{"Probabilistic models","Computational biology"}','{"graphical models","drug discovery"}','Founder of insitro; work spans graphical models and machine learning for biology.',120000,130,null,'https://scholar.google.com/','https://ai.stanford.edu/~koller/','Koller Lab','ML-driven drug discovery','NIH',false,false,true,'koller-lab@stanford.edu'),
('Michael Jordan','UC Berkeley','Statistics & EECS','USA','Professor','{"Statistical ML","Optimization"}','{"variational inference","decision-making"}','One of the most cited researchers in statistics and machine learning.',300000,190,null,'https://scholar.google.com/citations?user=yxUduqMAAAAJ','https://people.eecs.berkeley.edu/~jordan/','SAIL-Berkeley','Statistical decision-making in markets','NSF, ONR',true,true,true,'stat-grad@berkeley.edu'),
('Kate Crawford','USC Annenberg','Communication','USA','Research Professor','{"AI ethics","Society and technology"}','{"AI policy","data justice"}','Author of Atlas of AI; researches the social implications of AI systems.',30000,55,null,'https://scholar.google.com/','https://katecrawford.net/','AI Now-affiliated','Planetary costs of AI infrastructure','Mellon Foundation',false,true,true,'annenberg.phd@usc.edu'),
('Hiroshi Ishiguro','Osaka University','Systems Innovation','Japan','Professor','{"Robotics","Human-robot interaction"}','{"androids","social robotics"}','Known worldwide for humanoid android research.',40000,80,null,'https://scholar.google.com/','https://www.irl.sys.es.osaka-u.ac.jp/','Intelligent Robotics Laboratory','Android avatars for remote presence','JST Moonshot',true,true,true,'irl-contact@osaka-u.ac.jp'),
('Yi Ma','University of Hong Kong','Data Science','Hong Kong','Chair Professor','{"Computer vision","High-dimensional data"}','{"sparse representation","white-box deep learning"}','Works on principled, interpretable deep networks.',80000,100,null,'https://scholar.google.com/','https://www.eecs.berkeley.edu/~yima/','HKU Data Science Lab','White-box transformers','RGC Hong Kong',true,true,true,'datascience@hku.hk'),
('Anima Anandkumar','Caltech','Computing + Mathematical Sciences','USA','Bren Professor','{"AI for science","Tensor methods"}','{"neural operators","climate modeling"}','Works on neural operators for physics and climate simulation.',50000,80,'0000-0002-6974-6797','https://scholar.google.com/citations?user=bEcLezcAAAAJ','http://tensorlab.cms.caltech.edu/users/anima/','Tensorlab','FourCastNet climate emulation','NSF, DOE',true,true,true,'cms-admissions@caltech.edu'),
('Emmanuelle Charpentier','Max Planck Unit for the Science of Pathogens','Microbiology','Germany','Director','{"CRISPR","Microbiology"}','{"gene editing","bacterial regulation"}','Nobel laureate for CRISPR-Cas9 genome editing.',120000,90,null,'https://scholar.google.com/','https://www.mpusp.mpg.de/','Charpentier Lab','RNA-mediated regulation in pathogens','ERC, Max Planck',true,true,true,'office@mpusp.mpg.de'),
('Jennifer Doudna','UC Berkeley','Molecular & Cell Biology','USA','Professor','{"Genome editing","Biochemistry"}','{"CRISPR","RNA biology"}','Nobel laureate; leads the Innovative Genomics Institute.',180000,140,null,'https://scholar.google.com/','https://doudnalab.org/','Doudna Lab','Next-generation genome editors','NIH, HHMI',true,true,true,'igi@berkeley.edu'),
('Klaus Schulten Group (successor)','University of Illinois Urbana-Champaign','Physics','USA','Group','{"Computational biophysics"}','{"molecular dynamics","NAMD"}','Computational biophysics group behind NAMD and VMD.',90000,110,null,'https://scholar.google.com/','https://www.ks.uiuc.edu/','Theoretical and Computational Biophysics Group','Large-scale molecular simulation','NIH, NSF',true,true,true,'tcbg@ks.uiuc.edu'),
('Sabine Hossenfelder','Munich Center for Mathematical Philosophy','Physics','Germany','Research Fellow','{"Theoretical physics","Foundations of physics"}','{"quantum gravity","philosophy of science"}','Theoretical physicist and science communicator.',6000,35,null,'https://scholar.google.com/','http://sabinehossenfelder.com/','MCMP','Superdeterminism and quantum foundations','VW Foundation',false,true,true,'info@mcmp.lmu.de'),
('Cordelia Schmid','Inria / Google DeepMind','Computer Vision','France','Research Director','{"Computer vision","Video understanding"}','{"action recognition","vision-language"}','Leads the WILLOW/THOTH-adjacent vision research at Inria.',110000,130,null,'https://scholar.google.com/citations?user=IvqCXP4AAAAJ','https://cordeliaschmid.github.io/','Inria Vision','Video-language models','ERC, ANR',true,true,true,'phd@inria.fr'),
('Marta Kwiatkowska','University of Oxford','Computer Science','UK','Professor','{"Formal verification","Safe AI"}','{"probabilistic model checking","robustness"}','Leads verification research for autonomous and AI systems.',35000,75,'0000-0001-9022-7599','https://scholar.google.com/','https://www.cs.ox.ac.uk/people/marta.kwiatkowska/','Oxford FMG','Verification of neural networks','ERC Advanced, EPSRC',true,true,true,'graduate.admissions@cs.ox.ac.uk'),
('Tanja Schultz','University of Bremen','Cognitive Systems','Germany','Professor','{"Speech processing","Biosignals"}','{"silent speech","BCI"}','Works on speech and biosignal-based human-machine interaction.',20000,55,null,'https://scholar.google.com/','https://www.uni-bremen.de/csl','Cognitive Systems Lab','Brain-to-speech interfaces','DFG, BMBF',true,true,true,'csl@uni-bremen.de'),
('Chris Bishop','Microsoft Research / University of Cambridge','AI for Science','UK','Technical Fellow','{"Machine learning","AI for science"}','{"pattern recognition","simulation"}','Author of Pattern Recognition and Machine Learning; leads AI4Science.',90000,80,null,'https://scholar.google.com/','https://www.microsoft.com/en-us/research/people/cmbishop/','MSR AI4Science','Foundation models for molecular simulation','Microsoft Research',true,true,true,'ai4science@microsoft.com'),
('Nadia Magnenat Thalmann','University of Geneva / NTU','Computer Graphics','Switzerland','Professor','{"Virtual humans","Social robotics"}','{"avatars","simulation"}','Pioneer of virtual human simulation and social robots.',30000,70,null,'https://scholar.google.com/','https://www.miralab.ch/','MIRALab','Realistic virtual humans','SNSF, EU Horizon',true,true,true,'miralab@unige.ch'),
('Yizhou Sun','UCLA','Computer Science','USA','Professor','{"Graph mining","Machine learning"}','{"heterogeneous networks","GNNs"}','Works on graph neural networks and heterogeneous information networks.',35000,65,null,'https://scholar.google.com/','http://web.cs.ucla.edu/~yzsun/','UCLA ScAi Lab','Graph foundation models','NSF, DARPA',true,true,true,'gradadmissions@cs.ucla.edu')
ON CONFLICT DO NOTHING;

INSERT INTO public.research_grants (name, funder, type, country, amount, duration, eligibility, fields, deadline, link, description) VALUES
('NSF Graduate Research Fellowship','National Science Foundation','Government','USA','USD 37,000/yr + tuition','3 years','US citizens/permanent residents in STEM','{STEM}','2026-10-19','https://www.nsfgrfp.org/','Premier US fellowship for early-stage graduate researchers.'),
('ERC Starting Grant','European Research Council','Government','EU','Up to EUR 1.5M','5 years','2-7 years post-PhD','{"All fields"}','2026-10-15','https://erc.europa.eu/apply-grant/starting-grant','Flagship EU grant for independent early-career researchers.'),
('Marie Skłodowska-Curie Postdoctoral Fellowship','European Commission','Government','EU','~EUR 90,000/yr','1-3 years','PhD holders; mobility rule applies','{"All fields"}','2026-09-10','https://marie-sklodowska-curie-actions.ec.europa.eu/','Mobility-based postdoctoral funding across Europe.'),
('Wellcome Trust Early-Career Awards','Wellcome Trust','Foundation','UK','Up to GBP 400,000','5 years','Early-career health researchers','{Health,"Life Sciences"}','2026-05-12','https://wellcome.org/grant-funding','Support for health researchers building independence.'),
('DFG Research Grant (Sachbeihilfe)','Deutsche Forschungsgemeinschaft','Government','Germany','Project-based','2-3 years','Researchers at German institutions','{"All fields"}',null,'https://www.dfg.de/en','Rolling German project funding for individual researchers.'),
('Humboldt Research Fellowship','Alexander von Humboldt Foundation','Foundation','Germany','EUR 2,700-3,200/month','6-24 months','Postdocs and experienced researchers','{"All fields"}',null,'https://www.humboldt-foundation.de/','Rolling fellowship for research stays in Germany.'),
('JSPS Postdoctoral Fellowship','Japan Society for the Promotion of Science','Government','Japan','JPY 362,000/month','12-24 months','Postdocs from partner countries','{"All fields"}','2026-05-08','https://www.jsps.go.jp/english/','Research stays at Japanese universities.'),
('Gates Foundation Grand Challenges','Gates Foundation','Foundation','Global','USD 100,000 seed','18 months','Global health and development innovators','{Health,Development}','2026-06-30','https://gcgh.grandchallenges.org/','Seed funding for bold global-health ideas.'),
('Google PhD Fellowship','Google','Industry','Global','Full tuition + stipend','2-3 years','Nominated PhD students','{"Computer Science"}','2026-05-15','https://research.google/programs-and-events/phd-fellowship/','Industry fellowship for outstanding CS doctoral research.'),
('Microsoft Research PhD Fellowship','Microsoft','Industry','Global','USD 42,000/yr + tuition','2 years','PhD students in computing','{"Computer Science"}','2026-09-30','https://www.microsoft.com/en-us/research/academic-program/phd-fellowship/','Fellowship plus internship opportunity.'),
('NIH R01 Research Project Grant','National Institutes of Health','Government','USA','USD 250,000+/yr','3-5 years','Independent investigators','{Health,Biomedicine}','2026-10-05','https://grants.nih.gov/','Core NIH funding for health-related research projects.'),
('Horizon Europe Collaborative Grants','European Commission','Government','EU','EUR 2-10M consortium','3-4 years','Multi-country consortia','{"All fields"}','2026-09-17','https://ec.europa.eu/info/funding-tenders/','Large collaborative research and innovation projects.'),
('UKRI Future Leaders Fellowship','UK Research and Innovation','Government','UK','GBP 1.5M','4+3 years','Early-career researchers and innovators','{"All fields"}','2026-07-08','https://www.ukri.org/','Flexible long-term support for emerging leaders.'),
('Schmidt Science Fellows','Schmidt Futures','Foundation','Global','USD 110,000/yr','1-2 years','New PhDs pivoting disciplines','{STEM}','2026-06-15','https://schmidtsciencefellows.org/','Interdisciplinary postdoctoral pivot fellowship.'),
('Simons Foundation Collaboration Grants','Simons Foundation','Foundation','USA','USD 42,000','5 years','Mathematicians and theorists','{Mathematics,Physics}','2026-01-31','https://www.simonsfoundation.org/','Travel and collaboration support for theorists.'),
('SNSF Ambizione','Swiss National Science Foundation','Government','Switzerland','CHF 900,000','4 years','Early postdocs in Switzerland','{"All fields"}','2026-11-01','https://www.snf.ch/en','Independent project funding for young researchers.'),
('Australian Research Council DECRA','ARC','Government','Australia','AUD 500,000','3 years','Within 5 years of PhD','{"All fields"}','2026-03-04','https://www.arc.gov.au/','Discovery Early Career Researcher Award.'),
('NSERC Discovery Grant','NSERC','Government','Canada','CAD 25,000-70,000/yr','5 years','Faculty at Canadian institutions','{STEM}','2026-11-01','https://www.nserc-crsng.gc.ca/','Long-term support for Canadian research programs.'),
('MIT Solve Global Challenges','MIT Solve','Innovation Competition','Global','USD 10,000-100,000','1 year','Social-impact innovators and startups','{Innovation,Development}','2026-04-24','https://solve.mit.edu/','Innovation prize funding for tech-driven solutions.'),
('Y Combinator Research / Startup Seed','Y Combinator','Startup','Global','USD 500,000','3 months','Research-driven startup founders','{Innovation,Technology}',null,'https://www.ycombinator.com/','Seed funding and acceleration for research spinouts.')
ON CONFLICT DO NOTHING;

INSERT INTO public.research_opportunities (title, host, country, type, category, level, mode, duration, eligibility, funded, field, deadline, stipend, link, description) VALUES
('MIT UROP','MIT','USA','Undergraduate Research','Undergraduate Research','Undergraduate','On-campus','Semester or summer','MIT and visiting undergraduates',true,'All fields','2026-04-15','USD 15/hour','https://urop.mit.edu/','Year-round undergraduate research placements across MIT labs.'),
('Caltech SURF','Caltech','USA','Summer Research','Summer Research Programs','Undergraduate','On-campus','10 weeks','Undergraduates worldwide',true,'STEM','2026-02-22','USD 7,000','https://sfp.caltech.edu/programs/surf','Summer Undergraduate Research Fellowships at Caltech.'),
('DAAD RISE Germany','DAAD','Germany','Summer Research','Summer Research Programs','Undergraduate','On-site','2-3 months','Undergrads in North America, UK, Ireland',true,'STEM','2025-12-15','EUR 934/month','https://www.daad.de/rise/en/','Summer research internships in German labs.'),
('Amgen Scholars Europe','Amgen Foundation','Multiple','Summer Research','Summer Research Programs','Undergraduate','On-site','8-10 weeks','Undergraduates in science/biotech',true,'Life Sciences','2026-02-02','Full stipend + housing','https://amgenscholars.com/','Biotech-focused summer research at top European universities.'),
('CERN Summer Student Programme','CERN','Switzerland','Summer Research','Summer Research Programs','Undergraduate','On-site','8-13 weeks','Physics/CS/engineering undergrads',true,'Physics','2026-01-29','CHF 90/day','https://careers.cern/summer','Work alongside CERN researchers on particle physics.'),
('Winter Research Internship – IIT Bombay','IIT Bombay','India','Winter Research','Winter Research Programs','Undergraduate','On-site','6-8 weeks','Engineering undergrads',true,'Engineering','2026-10-31','INR 12,000/month','https://www.iitb.ac.in/','Short winter research projects in IITB labs.'),
('NUS Winter Research Attachment','National University of Singapore','Singapore','Winter Research','Winter Research Programs','Undergraduate','On-site','6 weeks','International undergraduates',true,'STEM','2026-09-30','SGD 1,000/month','https://nus.edu.sg/','Winter research attachment across NUS faculties.'),
('Google Research Internship','Google','Global','Research Internship','Research Internships','Graduate','Hybrid','12-14 weeks','MS/PhD students',true,'Computer Science','2026-01-15','Competitive salary','https://www.google.com/about/careers/','Industrial research internships with Google Research teams.'),
('Microsoft Research Internship','Microsoft','Global','Research Internship','Research Internships','Graduate','Hybrid','12 weeks','PhD students',true,'Computer Science','2026-01-31','Competitive salary','https://www.microsoft.com/en-us/research/internship/','Publish-focused internships with MSR researchers.'),
('Max Planck Research Apprenticeship','Max Planck Society','Germany','Apprenticeship','Research Apprenticeships','Undergraduate','On-site','3-6 months','Advanced undergrads',true,'Sciences','2026-03-31','EUR 800/month','https://www.mpg.de/en','Hands-on apprenticeship in Max Planck institutes.'),
('Oxford Honours Research Placement','University of Oxford','UK','Honors Research','Honors Research','Undergraduate','On-campus','8 weeks','Final-year honours students',true,'All fields','2026-03-01','GBP 250/week','https://www.ox.ac.uk/','Summer honours research placements at Oxford departments.'),
('Capstone Industry Project – TU Delft','TU Delft','Netherlands','Capstone','Capstone Projects','Undergraduate','Hybrid','1 semester','Bachelor final-year students',false,'Engineering',null,'Unpaid / credit','https://www.tudelft.nl/','Industry-sponsored capstone engineering projects.'),
('ETH Zurich Master Thesis Programme','ETH Zurich','Switzerland','Master Research','Master''s Research','Masters','On-site','6 months','Master students worldwide',true,'STEM',null,'CHF 1,800/month','https://ethz.ch/','External master thesis projects hosted by ETH labs.'),
('KTH Degree Project Abroad','KTH Royal Institute of Technology','Sweden','Thesis','Thesis Opportunities','Masters','On-site','20 weeks','Master students',true,'Engineering','2026-04-30','SEK 10,000/month','https://www.kth.se/','Master thesis positions with Swedish research groups.'),
('Marie Curie Doctoral Network Positions','European Commission','EU','PhD Research','Doctoral Networks','PhD','On-site','36 months','Early-stage researchers',true,'All fields','2026-11-27','EUR 3,400/month','https://marie-sklodowska-curie-actions.ec.europa.eu/','Structured EU doctoral training networks.'),
('Research Assistant – Stanford AI Lab','Stanford University','USA','Research Assistant','Research Assistant (RA)','Graduate','On-campus','Academic year','Enrolled graduate students',true,'Computer Science',null,'USD 4,000/month','https://ai.stanford.edu/','RA appointments across Stanford AI Lab projects.'),
('Teaching Assistant – University of Toronto','University of Toronto','Canada','Teaching Assistant','Teaching Assistant (TA)','Graduate','On-campus','Per term','Registered graduate students',true,'All fields',null,'CAD 47/hour','https://www.utoronto.ca/','Unionized TA positions across departments.'),
('Graduate Assistantship – University of Texas','UT Austin','USA','Graduate Assistant','Graduate Assistant','Graduate','On-campus','Academic year','Admitted graduate students',true,'All fields',null,'USD 2,200/month + tuition waiver','https://www.utexas.edu/','GA roles combining research and administrative work.'),
('Lab Assistant – Karolinska Institutet','Karolinska Institutet','Sweden','Lab Assistant','Lab Assistant','Undergraduate','On-site','3-12 months','Life-science students',true,'Life Sciences',null,'SEK 22,000/month','https://ki.se/en','Wet-lab support roles in biomedical research groups.'),
('Clinical Research Fellowship – Mayo Clinic','Mayo Clinic','USA','Clinical Research','Clinical Research','Graduate','On-site','1-2 years','Medical graduates and PhD students',true,'Medicine','2026-05-31','USD 55,000/yr','https://www.mayo.edu/research','Clinical and translational research fellowships.'),
('Samsung Advanced Institute of Technology Research','Samsung','South Korea','Industrial Research','Industrial Research','Graduate','On-site','6-12 months','MS/PhD in engineering',true,'Engineering','2026-03-15','KRW 3,000,000/month','https://www.sait.samsung.co.kr/','Applied industrial research in semiconductors and AI.'),
('NASA Pathways Research Internship','NASA','USA','Government Research','Government Research','Undergraduate','On-site','Semester','US citizens enrolled in STEM',true,'Aerospace','2026-02-28','USD 3,500/month','https://intern.nasa.gov/','Government research internships across NASA centers.'),
('UNDP Research Fellowship','United Nations Development Programme','Global','NGO Research','NGO Research','Graduate','Hybrid','6 months','Graduate students in development',true,'Development','2026-04-20','USD 1,500/month','https://www.undp.org/careers','Policy-oriented research with UNDP country offices.'),
('Remote Research Assistantship – Polymath Jr.','Polymath Jr. REU','Global','Remote Research','Remote Research','Undergraduate','Remote','8 weeks','Undergraduates in mathematics',true,'Mathematics','2026-03-15','USD 1,000','https://geometrynyc.wixsite.com/polymathreu','Fully remote collaborative mathematics research.'),
('Visiting Researcher – University of Tokyo','University of Tokyo','Japan','Visiting Research','Visiting Research','PhD','On-site','3-12 months','PhD candidates and postdocs',true,'All fields','2026-06-30','JPY 200,000/month','https://www.u-tokyo.ac.jp/en/','Visiting research placements hosted by UTokyo faculty.')
ON CONFLICT DO NOTHING;
