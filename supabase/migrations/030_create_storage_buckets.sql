-- Create storage buckets for photo uploads
-- NOTE: Storage bucket creation must be done via Supabase Dashboard or API
-- This SQL shows the RLS policies needed after bucket creation

-- Instructions to create buckets in Supabase Dashboard:
-- 1. Go to Storage in Supabase Dashboard
-- 2. Create the following buckets:
--    - story-photos (public)
--    - mission-photos (public)
--    - challenge-photos (public)
--    - avatars (public)
--    - receipts (private)
--    - public (public - fallback bucket)

-- If using Supabase SQL to create buckets (requires storage extension):
-- INSERT INTO storage.buckets (id, name, public)
-- VALUES
--   ('story-photos', 'story-photos', true),
--   ('mission-photos', 'mission-photos', true),
--   ('challenge-photos', 'challenge-photos', true),
--   ('avatars', 'avatars', true),
--   ('receipts', 'receipts', false),
--   ('public', 'public', true)
-- ON CONFLICT (id) DO NOTHING;

-- Storage policies for story-photos bucket
DO $$
BEGIN
  -- Check if storage schema exists
  IF EXISTS (SELECT 1 FROM information_schema.schemata WHERE schema_name = 'storage') THEN
    -- Create bucket if it doesn't exist
    INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
    VALUES (
      'story-photos',
      'story-photos',
      true,
      5242880, -- 5MB limit
      ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp']
    )
    ON CONFLICT (id) DO UPDATE SET
      public = true,
      file_size_limit = 5242880;

    -- Create mission-photos bucket
    INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
    VALUES (
      'mission-photos',
      'mission-photos',
      true,
      5242880,
      ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp']
    )
    ON CONFLICT (id) DO UPDATE SET
      public = true,
      file_size_limit = 5242880;

    -- Create challenge-photos bucket
    INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
    VALUES (
      'challenge-photos',
      'challenge-photos',
      true,
      5242880,
      ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp']
    )
    ON CONFLICT (id) DO UPDATE SET
      public = true,
      file_size_limit = 5242880;

    -- Create avatars bucket
    INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
    VALUES (
      'avatars',
      'avatars',
      true,
      2097152, -- 2MB limit
      ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp']
    )
    ON CONFLICT (id) DO UPDATE SET
      public = true,
      file_size_limit = 2097152;

    -- Create receipts bucket (private)
    INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
    VALUES (
      'receipts',
      'receipts',
      false,
      5242880,
      ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf']
    )
    ON CONFLICT (id) DO UPDATE SET
      public = false,
      file_size_limit = 5242880;

    -- Create public fallback bucket
    INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
    VALUES (
      'public',
      'public',
      true,
      10485760, -- 10MB limit
      ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf']
    )
    ON CONFLICT (id) DO UPDATE SET
      public = true,
      file_size_limit = 10485760;
  END IF;
END $$;

-- Storage RLS Policies (for each bucket)
-- These allow authenticated users to upload to their own folders

-- Story photos policies
DROP POLICY IF EXISTS "Users can upload story photos" ON storage.objects;
CREATE POLICY "Users can upload story photos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'story-photos' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

DROP POLICY IF EXISTS "Users can update their story photos" ON storage.objects;
CREATE POLICY "Users can update their story photos"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'story-photos' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

DROP POLICY IF EXISTS "Users can delete their story photos" ON storage.objects;
CREATE POLICY "Users can delete their story photos"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'story-photos' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

DROP POLICY IF EXISTS "Story photos are publicly viewable" ON storage.objects;
CREATE POLICY "Story photos are publicly viewable"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'story-photos');

-- Mission photos policies
DROP POLICY IF EXISTS "Users can upload mission photos" ON storage.objects;
CREATE POLICY "Users can upload mission photos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'mission-photos' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

DROP POLICY IF EXISTS "Users can update their mission photos" ON storage.objects;
CREATE POLICY "Users can update their mission photos"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'mission-photos' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

DROP POLICY IF EXISTS "Users can delete their mission photos" ON storage.objects;
CREATE POLICY "Users can delete their mission photos"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'mission-photos' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

DROP POLICY IF EXISTS "Mission photos are publicly viewable" ON storage.objects;
CREATE POLICY "Mission photos are publicly viewable"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'mission-photos');

-- Challenge photos policies
DROP POLICY IF EXISTS "Users can upload challenge photos" ON storage.objects;
CREATE POLICY "Users can upload challenge photos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'challenge-photos' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

DROP POLICY IF EXISTS "Challenge photos are publicly viewable" ON storage.objects;
CREATE POLICY "Challenge photos are publicly viewable"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'challenge-photos');

-- Avatars policies
DROP POLICY IF EXISTS "Users can upload avatars" ON storage.objects;
CREATE POLICY "Users can upload avatars"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'avatars' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

DROP POLICY IF EXISTS "Avatars are publicly viewable" ON storage.objects;
CREATE POLICY "Avatars are publicly viewable"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'avatars');

-- Receipts policies (private bucket)
DROP POLICY IF EXISTS "Users can upload receipts" ON storage.objects;
CREATE POLICY "Users can upload receipts"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'receipts' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

DROP POLICY IF EXISTS "Users can view their own receipts" ON storage.objects;
CREATE POLICY "Users can view their own receipts"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'receipts' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Public bucket policies (fallback)
DROP POLICY IF EXISTS "Users can upload to public bucket" ON storage.objects;
CREATE POLICY "Users can upload to public bucket"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'public');

DROP POLICY IF EXISTS "Users can update their public bucket files" ON storage.objects;
CREATE POLICY "Users can update their public bucket files"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'public');

DROP POLICY IF EXISTS "Public bucket files are viewable" ON storage.objects;
CREATE POLICY "Public bucket files are viewable"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'public');
