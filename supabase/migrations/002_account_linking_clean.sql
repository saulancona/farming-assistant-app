-- =====================================================
-- Clean Account Linking Migration
-- Run this if 001 keeps failing
-- =====================================================

-- STEP 1: Complete cleanup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS user_profiles_updated_at ON public.user_profiles;
DROP TRIGGER IF EXISTS account_links_updated_at ON public.account_links;

DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;
DROP FUNCTION IF EXISTS public.handle_updated_at() CASCADE;
DROP FUNCTION IF EXISTS public.get_user_with_linked_accounts(uuid) CASCADE;
DROP FUNCTION IF EXISTS public.link_account(uuid, text, text, text) CASCADE;

DROP TABLE IF EXISTS public.linking_requests CASCADE;
DROP TABLE IF EXISTS public.account_links CASCADE;
DROP TABLE IF EXISTS public.user_profiles CASCADE;

-- STEP 2: Create tables (without triggers first)
CREATE TABLE public.user_profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text,
  phone_number text,
  full_name text,
  farm_name text,
  profile_image_url text,
  village text,
  district text,
  country text,
  latitude real,
  longitude real,
  farm_size numeric,
  soil_type text,
  preferred_language text DEFAULT 'en',
  currency text DEFAULT 'USD',
  voice_enabled boolean DEFAULT true,
  speech_rate real DEFAULT 1.0,
  speech_pitch real DEFAULT 1.0,
  speech_volume real DEFAULT 1.0,
  primary_app text DEFAULT 'agroafrica',
  last_app_used text,
  last_active_at timestamptz,
  role text DEFAULT 'farmer',
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE public.account_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  auth_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  auth_method text NOT NULL,
  auth_identifier text NOT NULL,
  is_verified boolean DEFAULT false,
  verified_at timestamptz,
  linked_at timestamptz DEFAULT now(),
  linked_from text,
  is_primary boolean DEFAULT false,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(auth_user_id, auth_method)
);

CREATE TABLE public.linking_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  primary_user_id uuid NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  primary_auth_method text NOT NULL,
  secondary_auth_method text NOT NULL,
  secondary_auth_identifier text NOT NULL,
  verification_code text NOT NULL,
  code_expires_at timestamptz NOT NULL,
  attempts int DEFAULT 0,
  max_attempts int DEFAULT 3,
  status text DEFAULT 'pending',
  requested_from text,
  ip_address text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- STEP 3: Create indexes
CREATE INDEX idx_user_profiles_phone ON user_profiles(phone_number);
CREATE INDEX idx_user_profiles_email ON user_profiles(email);
CREATE INDEX idx_user_profiles_district ON user_profiles(district);
CREATE INDEX idx_account_links_user_id ON account_links(user_id);
CREATE INDEX idx_account_links_auth_user_id ON account_links(auth_user_id);
CREATE INDEX idx_account_links_identifier ON account_links(auth_identifier);
CREATE INDEX idx_linking_requests_primary_user ON linking_requests(primary_user_id);
CREATE INDEX idx_linking_requests_status ON linking_requests(status);

-- STEP 4: Enable RLS
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE account_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE linking_requests ENABLE ROW LEVEL SECURITY;

-- STEP 5: Create RLS policies
CREATE POLICY "Users can view their own profile"
  ON user_profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON user_profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Users can view other profiles"
  ON user_profiles FOR SELECT
  USING (true);

CREATE POLICY "Users can view their own account links"
  ON account_links FOR SELECT
  USING (auth.uid() = user_id OR auth.uid() = auth_user_id);

CREATE POLICY "Users can create account links"
  ON account_links FOR INSERT
  WITH CHECK (auth.uid() = auth_user_id);

CREATE POLICY "Users can update their account links"
  ON account_links FOR UPDATE
  USING (auth.uid() = user_id OR auth.uid() = auth_user_id);

CREATE POLICY "Users can view their linking requests"
  ON linking_requests FOR SELECT
  USING (auth.uid() = primary_user_id);

CREATE POLICY "Users can create linking requests"
  ON linking_requests FOR INSERT
  WITH CHECK (auth.uid() = primary_user_id);

CREATE POLICY "Users can update their linking requests"
  ON linking_requests FOR UPDATE
  USING (auth.uid() = primary_user_id);

-- STEP 6: Create trigger function for new users
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  auth_method text;
  auth_identifier text;
BEGIN
  -- Determine auth method from the new user
  IF NEW.phone IS NOT NULL AND NEW.phone <> '' THEN
    auth_method := 'phone';
    auth_identifier := NEW.phone;
  ELSIF NEW.email IS NOT NULL AND NEW.email <> '' THEN
    auth_method := 'email';
    auth_identifier := NEW.email;
  ELSE
    auth_method := 'unknown';
    auth_identifier := NEW.id::text;
  END IF;

  -- Insert user profile
  INSERT INTO public.user_profiles (
    id,
    email,
    phone_number,
    full_name
  ) VALUES (
    NEW.id,
    NEW.email,
    NEW.phone,
    COALESCE(NEW.raw_user_meta_data->>'full_name', '')
  )
  ON CONFLICT (id) DO NOTHING;

  -- Insert account link
  INSERT INTO public.account_links (
    user_id,
    auth_user_id,
    auth_method,
    auth_identifier,
    is_verified,
    verified_at,
    is_primary,
    is_active
  ) VALUES (
    NEW.id,
    NEW.id,
    auth_method,
    auth_identifier,
    true,
    now(),
    true,
    true
  )
  ON CONFLICT (auth_user_id, auth_method) DO NOTHING;

  RETURN NEW;
END;
$$;

-- STEP 7: Create updated_at trigger function
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- STEP 8: Create triggers
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

CREATE TRIGGER user_profiles_updated_at
  BEFORE UPDATE ON user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER account_links_updated_at
  BEFORE UPDATE ON account_links
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- STEP 9: Grant permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON public.user_profiles TO anon, authenticated;
GRANT ALL ON public.account_links TO anon, authenticated;
GRANT ALL ON public.linking_requests TO anon, authenticated;

-- Success!
SELECT 'Migration completed successfully!' as message;
