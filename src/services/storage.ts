import { supabase } from '../lib/supabase';

// Storage bucket names
export const STORAGE_BUCKETS = {
  STORY_PHOTOS: 'story-photos',
  MISSION_PHOTOS: 'mission-photos',
  CHALLENGE_PHOTOS: 'challenge-photos',
  PROFILE_AVATARS: 'avatars',
  RECEIPTS: 'receipts',
} as const;

export type StorageBucket = typeof STORAGE_BUCKETS[keyof typeof STORAGE_BUCKETS];

/**
 * Upload a file to Supabase Storage
 * @param bucket - The storage bucket name
 * @param path - The file path within the bucket (e.g., 'user-id/filename.jpg')
 * @param file - The File or Blob to upload
 * @returns The public URL of the uploaded file (or base64 data URL as fallback)
 */
export async function uploadFile(
  bucket: StorageBucket,
  path: string,
  file: File | Blob
): Promise<string> {
  try {
    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(path, file, {
        cacheControl: '3600',
        upsert: true,
      });

    if (error) {
      console.warn('Storage upload failed, using base64 fallback:', error.message);
      // Storage not available - use base64 data URL as fallback
      return await fileToDataUrl(file);
    }

    // Get the public URL
    const { data: urlData } = supabase.storage
      .from(bucket)
      .getPublicUrl(data.path);

    return urlData.publicUrl;
  } catch (err) {
    console.warn('Storage upload exception, using base64 fallback:', err);
    // Any error - fallback to base64
    return await fileToDataUrl(file);
  }
}

/**
 * Upload a story quest milestone photo
 */
export async function uploadStoryPhoto(
  userId: string,
  questId: string,
  milestoneType: string,
  file: File
): Promise<string> {
  const timestamp = Date.now();
  const extension = file.name.split('.').pop() || 'jpg';
  const path = `${userId}/${questId}/${milestoneType}_${timestamp}.${extension}`;

  return uploadFile(STORAGE_BUCKETS.STORY_PHOTOS, path, file);
}

/**
 * Upload a mission photo
 */
export async function uploadMissionPhoto(
  userId: string,
  missionId: string,
  file: File
): Promise<string> {
  const timestamp = Date.now();
  const extension = file.name.split('.').pop() || 'jpg';
  const path = `${userId}/${missionId}/${timestamp}.${extension}`;

  return uploadFile(STORAGE_BUCKETS.MISSION_PHOTOS, path, file);
}

/**
 * Upload a challenge photo
 */
export async function uploadChallengePhoto(
  userId: string,
  challengeId: string,
  file: File
): Promise<string> {
  const timestamp = Date.now();
  const extension = file.name.split('.').pop() || 'jpg';
  const path = `${userId}/${challengeId}/${timestamp}.${extension}`;

  return uploadFile(STORAGE_BUCKETS.CHALLENGE_PHOTOS, path, file);
}

/**
 * Upload a receipt photo
 */
export async function uploadReceiptPhoto(
  userId: string,
  file: File
): Promise<string> {
  const timestamp = Date.now();
  const extension = file.name.split('.').pop() || 'jpg';
  const path = `${userId}/receipts/${timestamp}.${extension}`;

  return uploadFile(STORAGE_BUCKETS.RECEIPTS, path, file);
}

/**
 * Upload a business profile picture
 */
export async function uploadBusinessProfilePhoto(
  userId: string,
  file: File
): Promise<string> {
  const timestamp = Date.now();
  const extension = file.name.split('.').pop() || 'jpg';
  const path = `business-profiles/${userId}_${timestamp}.${extension}`;

  return uploadFile(STORAGE_BUCKETS.PROFILE_AVATARS, path, file);
}

/**
 * Upload a business profile cover image
 */
export async function uploadBusinessCoverPhoto(
  userId: string,
  file: File
): Promise<string> {
  const timestamp = Date.now();
  const extension = file.name.split('.').pop() || 'jpg';
  const path = `business-covers/${userId}_${timestamp}.${extension}`;

  return uploadFile(STORAGE_BUCKETS.PROFILE_AVATARS, path, file);
}

/**
 * Delete a file from storage
 */
export async function deleteFile(bucket: StorageBucket, path: string): Promise<void> {
  const { error } = await supabase.storage
    .from(bucket)
    .remove([path]);

  if (error) {
    console.error('Storage delete error:', error);
    throw error;
  }
}

/**
 * Convert a File/Blob to a base64 data URL (fallback for when storage is unavailable)
 */
export async function fileToDataUrl(file: File | Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/**
 * Compress an image file before upload
 */
export async function compressImage(
  file: File,
  maxWidth: number = 1200,
  maxHeight: number = 1200,
  quality: number = 0.8
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      // Calculate new dimensions
      let width = img.width;
      let height = img.height;

      if (width > maxWidth) {
        height = (height * maxWidth) / width;
        width = maxWidth;
      }
      if (height > maxHeight) {
        width = (width * maxHeight) / height;
        height = maxHeight;
      }

      // Create canvas and draw resized image
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Could not get canvas context'));
        return;
      }

      ctx.drawImage(img, 0, 0, width, height);

      // Convert to blob
      canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error('Could not compress image'));
          }
        },
        'image/jpeg',
        quality
      );
    };

    img.onerror = () => reject(new Error('Could not load image'));
    img.src = URL.createObjectURL(file);
  });
}
