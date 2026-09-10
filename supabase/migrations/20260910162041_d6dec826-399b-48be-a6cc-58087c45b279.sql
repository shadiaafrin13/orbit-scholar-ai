
CREATE TABLE public.documents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  category TEXT NOT NULL DEFAULT 'Academic',
  doc_type TEXT NOT NULL,
  title TEXT NOT NULL,
  file_path TEXT,
  file_name TEXT,
  file_size INTEGER,
  mime_type TEXT,
  version INTEGER NOT NULL DEFAULT 1,
  issue_date DATE,
  expiry_date DATE,
  tags TEXT[] DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'uploaded',
  notes TEXT,
  ai_flags JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.documents TO authenticated;
GRANT ALL ON public.documents TO service_role;
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own documents" ON public.documents FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE public.application_documents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  application_id UUID NOT NULL REFERENCES public.applications ON DELETE CASCADE,
  document_id UUID REFERENCES public.documents ON DELETE SET NULL,
  requirement TEXT NOT NULL,
  requirement_level TEXT NOT NULL DEFAULT 'required',
  status TEXT NOT NULL DEFAULT 'missing',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.application_documents TO authenticated;
GRANT ALL ON public.application_documents TO service_role;
ALTER TABLE public.application_documents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own application documents" ON public.application_documents FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE public.offers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  application_id UUID REFERENCES public.applications ON DELETE SET NULL,
  university_name TEXT NOT NULL,
  program TEXT,
  country TEXT,
  tuition_usd NUMERIC,
  scholarship_usd NUMERIC,
  living_cost_usd NUMERIC,
  deposit_usd NUMERIC,
  reply_deadline DATE,
  conditions TEXT,
  work_rights TEXT,
  ranking INTEGER,
  decision TEXT NOT NULL DEFAULT 'pending',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.offers TO authenticated;
GRANT ALL ON public.offers TO service_role;
ALTER TABLE public.offers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own offers" ON public.offers FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE public.communications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  application_id UUID REFERENCES public.applications ON DELETE SET NULL,
  contact_name TEXT NOT NULL,
  organization TEXT,
  contact_type TEXT NOT NULL DEFAULT 'university',
  channel TEXT NOT NULL DEFAULT 'email',
  subject TEXT,
  body TEXT,
  sent_at DATE,
  follow_up_date DATE,
  response_status TEXT NOT NULL DEFAULT 'sent',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.communications TO authenticated;
GRANT ALL ON public.communications TO service_role;
ALTER TABLE public.communications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own communications" ON public.communications FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

ALTER TABLE public.applications
  ADD COLUMN IF NOT EXISTS portal TEXT,
  ADD COLUMN IF NOT EXISTS intake TEXT,
  ADD COLUMN IF NOT EXISTS application_fee NUMERIC,
  ADD COLUMN IF NOT EXISTS fee_paid BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS priority INTEGER,
  ADD COLUMN IF NOT EXISTS health_score INTEGER,
  ADD COLUMN IF NOT EXISTS readiness_notes TEXT,
  ADD COLUMN IF NOT EXISTS band TEXT;

CREATE TRIGGER trg_documents_updated BEFORE UPDATE ON public.documents FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_appdocs_updated BEFORE UPDATE ON public.application_documents FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_offers_updated BEFORE UPDATE ON public.offers FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_comms_updated BEFORE UPDATE ON public.communications FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
