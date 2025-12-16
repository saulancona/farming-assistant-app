-- =====================================================
-- Phase 1: Account Linking System
-- =====================================================
-- This migration creates the infrastructure to link
-- phone-based auth (AgroVoice mobile) with email-based
-- auth (AgroAfrica web) on the same Supabase project
-- =====================================================

-- 1. Create unified user profiles table
-- This extends auth.users with additional profile data
-- shared across all three apps
CREATE TABLE IF NOT EXISTS public.user_profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Contact information (multiple auth methods)
  email text,
  phone_number text,

  -- Profile details
  full_name text,
  farm_name text,
  profile_image_url text,

  -- Location data (shared across apps)
  village text,
  district text,
  country text,
  latitude real,
  longitude real,
  farm_size numeric,
  soil_type text,

  -- Preferences
  preferred_language text DEFAULT 'en' CHECK (preferred_language IN ('en', 'sw', 'ha', 'am')),
  currency text DEFAULT 'USD',

  -- Voice settings (for accessibility)
  voice_enabled boolean DEFAULT true,
  speech_rate real DEFAULT 1.0,
  speech_pitch real DEFAULT 1.0,
  speech_volume real DEFAULT 1.0,

  -- App usage tracking
  primary_app text DEFAULT 'agroafrica' CHECK (primary_app IN ('agroafrica', 'agrovoice-web', 'agrovoice-mobile')),
  last_app_used text,
  last_active_at timestamptz,

  -- Role and status
  role text DEFAULT 'farmer' CHECK (role IN ('farmer', 'buyer', 'extension_officer', 'admin')),
  is_active boolean DEFAULT true,

  -- Timestamps
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_user_profiles_phone ON user_profiles(phone_number);
CREATE INDEX IF NOT EXISTS idx_user_profiles_email ON user_profiles(email);
CREATE INDEX IF NOT EXISTS idx_user_profiles_district ON user_profiles(district);

-- 2. Create account linking table
-- This table allows multiple auth methods to be linked to one profile
CREATE TABLE IF NOT EXISTS public.account_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- The primary user profile
  user_id uuid NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,

  -- The auth.users record for this auth method
  auth_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Auth method details
  auth_method text NOT NULL CHECK (auth_method IN ('email', 'phone', 'google', 'facebook')),
  auth_identifier text NOT NULL, -- email address or phone number

  -- Verification status
  is_verified boolean DEFAULT false,
  verified_at timestamptz,

  -- Linking metadata
  linked_at timestamptz DEFAULT now(),
  linked_from text, -- which app initiated the link

  -- Status
  is_primary boolean DEFAULT false, -- primary auth method
  is_active boolean DEFAULT true,

  -- Timestamps
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),

  -- Ensure one auth method per user
  UNIQUE(auth_user_id, auth_method)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_account_links_user_id ON account_links(user_id);
CREATE INDEX IF NOT EXISTS idx_account_links_auth_user_id ON account_links(auth_user_id);
CREATE INDEX IF NOT EXISTS idx_account_links_identifier ON account_links(auth_identifier);

-- 3. Create linking requests table (for pending link operations)
CREATE TABLE IF NOT EXISTS public.linking_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Primary account (existing)
  primary_user_id uuid NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  primary_auth_method text NOT NULL,

  -- Secondary account (to be linked)
  secondary_auth_method text NOT NULL,
  secondary_auth_identifier text NOT NULL,

  -- Verification
  verification_code text NOT NULL,
  code_expires_at timestamptz NOT NULL,
  attempts int DEFAULT 0,
  max_attempts int DEFAULT 3,

  -- Status
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'verified', 'rejected', 'expired')),

  -- Metadata
  requested_from text, -- which app
  ip_address text,

  -- Timestamps
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create index
CREATE INDEX IF NOT EXISTS idx_linking_requests_primary_user ON linking_requests(primary_user_id);
CREATE INDEX IF NOT EXISTS idx_linking_requests_status ON linking_requests(status);

-- 4. Function to automatically create user profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
DECLARE
  auth_method text;
  auth_identifier text;
BEGIN
  -- Determine auth method
  IF NEW.phone IS NOT NULL THEN
    auth_method := 'phone';
    auth_identifier := NEW.phone;
  ELSIF NEW.email IS NOT NULL THEN
    auth_method := 'email';
    auth_identifier := NEW.email;
  ELSE
    auth_method := 'unknown';
    auth_identifier := NEW.id::text;
  END IF;

  -- Create user profile
  INSERT INTO public.user_profiles (
    id,
    email,
    phone_number,
    full_name,
    created_at,
    updated_at
  ) VALUES (
    NEW.id,
    NEW.email,
    NEW.phone,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    now(),
    now()
  )
  ON CONFLICT (id) DO NOTHING;

  -- Create initial account link
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
    true, -- auto-verified on signup
    now(),
    true, -- first method is primary
    true
  )
  ON CONFLICT (auth_user_id, auth_method) DO NOTHING;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Create trigger for new user signups
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- 6. Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 7. Create triggers for updated_at
DROP TRIGGER IF EXISTS user_profiles_updated_at ON user_profiles;
CREATE TRIGGER user_profiles_updated_at
  BEFORE UPDATE ON user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS account_links_updated_at ON account_links;
CREATE TRIGGER account_links_updated_at
  BEFORE UPDATE ON account_links
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- 8. Row Level Security (RLS) Policies

-- Enable RLS
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE account_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE linking_requests ENABLE ROW LEVEL SECURITY;

-- user_profiles policies
DROP POLICY IF EXISTS "Users can view their own profile" ON user_profiles;
CREATE POLICY "Users can view their own profile"
  ON user_profiles FOR SELECT
  USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update their own profile" ON user_profiles;
CREATE POLICY "Users can update their own profile"
  ON user_profiles FOR UPDATE
  USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can view other profiles (public data)" ON user_profiles;
CREATE POLICY "Users can view other profiles (public data)"
  ON user_profiles FOR SELECT
  USING (true); -- Allow viewing basic public profile data

-- account_links policies
DROP POLICY IF EXISTS "Users can view their own account links" ON account_links;
CREATE POLICY "Users can view their own account links"
  ON account_links FOR SELECT
  USING (auth.uid() = user_id OR auth.uid() = auth_user_id);

DROP POLICY IF EXISTS "Users can create account links" ON account_links;
CREATE POLICY "Users can create account links"
  ON account_links FOR INSERT
  WITH CHECK (auth.uid() = auth_user_id);

DROP POLICY IF EXISTS "Users can update their account links" ON account_links;
CREATE POLICY "Users can update their account links"
  ON account_links FOR UPDATE
  USING (auth.uid() = user_id OR auth.uid() = auth_user_id);

-- linking_requests policies
DROP POLICY IF EXISTS "Users can view their linking requests" ON linking_requests;
CREATE POLICY "Users can view their linking requests"
  ON linking_requests FOR SELECT
  USING (auth.uid() = primary_user_id);

DROP POLICY IF EXISTS "Users can create linking requests" ON linking_requests;
CREATE POLICY "Users can create linking requests"
  ON linking_requests FOR INSERT
  WITH CHECK (auth.uid() = primary_user_id);

DROP POLICY IF EXISTS "Users can update their linking requests" ON linking_requests;
CREATE POLICY "Users can update their linking requests"
  ON linking_requests FOR UPDATE
  USING (auth.uid() = primary_user_id);

-- 9. Helper function to get user profile with all linked accounts
CREATE OR REPLACE FUNCTION public.get_user_with_linked_accounts(user_uuid uuid)
RETURNS jsonb AS $$
DECLARE
  result jsonb;
BEGIN
  SELECT jsonb_build_object(
    'profile', row_to_json(up.*),
    'linked_accounts', (
      SELECT jsonb_agg(row_to_json(al.*))
      FROM account_links al
      WHERE al.user_id = user_uuid
    )
  ) INTO result
  FROM user_profiles up
  WHERE up.id = user_uuid;

  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 10. Function to link accounts
CREATE OR REPLACE FUNCTION public.link_account(
  p_primary_user_id uuid,
  p_auth_method text,
  p_auth_identifier text,
  p_verification_code text
)
RETURNS jsonb AS $$
DECLARE
  v_request linking_requests;
  v_auth_user_id uuid;
  v_result jsonb;
BEGIN
  -- Get the linking request
  SELECT * INTO v_request
  FROM linking_requests
  WHERE primary_user_id = p_primary_user_id
    AND secondary_auth_method = p_auth_method
    AND secondary_auth_identifier = p_auth_identifier
    AND status = 'pending'
    AND code_expires_at > now()
  LIMIT 1;

  -- Check if request exists
  IF v_request.id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid or expired linking request');
  END IF;

  -- Check verification code
  IF v_request.verification_code != p_verification_code THEN
    -- Increment attempts
    UPDATE linking_requests
    SET attempts = attempts + 1,
        status = CASE WHEN attempts + 1 >= max_attempts THEN 'rejected' ELSE status END
    WHERE id = v_request.id;

    RETURN jsonb_build_object('success', false, 'error', 'Invalid verification code');
  END IF;

  -- Find the auth user ID for the secondary account
  IF p_auth_method = 'email' THEN
    SELECT id INTO v_auth_user_id FROM auth.users WHERE email = p_auth_identifier LIMIT 1;
  ELSIF p_auth_method = 'phone' THEN
    SELECT id INTO v_auth_user_id FROM auth.users WHERE phone = p_auth_identifier LIMIT 1;
  END IF;

  IF v_auth_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Secondary account not found');
  END IF;

  -- Create the account link
  INSERT INTO account_links (
    user_id,
    auth_user_id,
    auth_method,
    auth_identifier,
    is_verified,
    verified_at,
    is_primary,
    is_active
  ) VALUES (
    p_primary_user_id,
    v_auth_user_id,
    p_auth_method,
    p_auth_identifier,
    true,
    now(),
    false,
    true
  );

  -- Update linking request status
  UPDATE linking_requests
  SET status = 'verified'
  WHERE id = v_request.id;

  -- Return success
  RETURN jsonb_build_object(
    'success', true,
    'message', 'Account linked successfully',
    'linked_account', jsonb_build_object(
      'auth_method', p_auth_method,
      'auth_identifier', p_auth_identifier
    )
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 11. Grant necessary permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON public.user_profiles TO anon, authenticated;
GRANT ALL ON public.account_links TO anon, authenticated;
GRANT ALL ON public.linking_requests TO anon, authenticated;

-- =====================================================
-- Migration complete!
-- =====================================================
-- Next steps:
-- 1. Run this migration on your Supabase project
-- 2. Enable phone authentication in Supabase dashboard
-- 3. Configure Twilio/MessageBird for SMS OTP
-- 4. Update AgroVoice mobile to use the same Supabase project
-- =====================================================
