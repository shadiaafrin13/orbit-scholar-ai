CREATE TABLE public.country_education_profiles (
  country text PRIMARY KEY,
  facts jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.country_education_profiles TO authenticated;
GRANT ALL ON public.country_education_profiles TO service_role;
ALTER TABLE public.country_education_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users read country education profiles"
  ON public.country_education_profiles
  FOR SELECT
  TO authenticated
  USING (true);