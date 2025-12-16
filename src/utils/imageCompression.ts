// Image compression utility for reducing file sizes before upload
// Helps farmers with limited data plans save on bandwidth costs

export interface CompressionOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number; // 0-1
  mimeType?: 'image/jpeg' | 'image/png' | 'image/webp';
}

const DEFAULT_OPTIONS: CompressionOptions = {
  maxWidth: 1200,
  maxHeight: 1200,
  quality: 0.7,
  mimeType: 'image/jpeg',
};

/**
 * Compress an image file and return as base64 data URL
 * @param file - The image file to compress
 * @param options - Compression options
 * @returns Promise<string> - Compressed image as base64 data URL
 */
export async function compressImage(
  file: File,
  options: CompressionOptions = {}
): Promise<string> {
  const opts = { ...DEFAULT_OPTIONS, ...options };

  return new Promise((resolve, reject) => {
    // Create an image element to load the file
    const img = new Image();
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    if (!ctx) {
      reject(new Error('Could not get canvas context'));
      return;
    }

    img.onload = () => {
      // Calculate new dimensions while maintaining aspect ratio
      let { width, height } = img;
      const maxW = opts.maxWidth!;
      const maxH = opts.maxHeight!;

      if (width > maxW || height > maxH) {
        const ratio = Math.min(maxW / width, maxH / height);
        width = Math.round(width * ratio);
        height = Math.round(height * ratio);
      }

      // Set canvas dimensions
      canvas.width = width;
      canvas.height = height;

      // Draw image with white background (for transparency in PNGs)
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, width, height);
      ctx.drawImage(img, 0, 0, width, height);

      // Convert to compressed format
      const compressedDataUrl = canvas.toDataURL(opts.mimeType!, opts.quality!);

      // Log compression stats
      const originalSize = file.size;
      const compressedSize = Math.round((compressedDataUrl.length * 3) / 4); // Base64 to bytes
      const reduction = ((1 - compressedSize / originalSize) * 100).toFixed(1);
      console.log(
        `Image compressed: ${formatBytes(originalSize)} → ${formatBytes(compressedSize)} (${reduction}% reduction)`
      );

      resolve(compressedDataUrl);
    };

    img.onerror = () => {
      reject(new Error('Failed to load image'));
    };

    // Load the image from file
    const reader = new FileReader();
    reader.onload = (e) => {
      if (e.target?.result) {
        img.src = e.target.result as string;
      }
    };
    reader.onerror = () => {
      reject(new Error('Failed to read file'));
    };
    reader.readAsDataURL(file);
  });
}

/**
 * Compress multiple images in parallel
 * @param files - Array of image files
 * @param options - Compression options
 * @returns Promise<string[]> - Array of compressed images as base64 data URLs
 */
export async function compressImages(
  files: File[],
  options: CompressionOptions = {}
): Promise<string[]> {
  const compressionPromises = files.map(file => compressImage(file, options));
  return Promise.all(compressionPromises);
}

/**
 * Compress an existing base64 image
 * @param dataUrl - The base64 data URL to compress
 * @param options - Compression options
 * @returns Promise<string> - Compressed image as base64 data URL
 */
export async function compressBase64Image(
  dataUrl: string,
  options: CompressionOptions = {}
): Promise<string> {
  const opts = { ...DEFAULT_OPTIONS, ...options };

  return new Promise((resolve, reject) => {
    const img = new Image();
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    if (!ctx) {
      reject(new Error('Could not get canvas context'));
      return;
    }

    img.onload = () => {
      let { width, height } = img;
      const maxW = opts.maxWidth!;
      const maxH = opts.maxHeight!;

      if (width > maxW || height > maxH) {
        const ratio = Math.min(maxW / width, maxH / height);
        width = Math.round(width * ratio);
        height = Math.round(height * ratio);
      }

      canvas.width = width;
      canvas.height = height;

      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, width, height);
      ctx.drawImage(img, 0, 0, width, height);

      const compressedDataUrl = canvas.toDataURL(opts.mimeType!, opts.quality!);
      resolve(compressedDataUrl);
    };

    img.onerror = () => {
      reject(new Error('Failed to load image'));
    };

    img.src = dataUrl;
  });
}

/**
 * Get estimated file size from base64 data URL
 * @param dataUrl - The base64 data URL
 * @returns number - Estimated size in bytes
 */
export function getBase64Size(dataUrl: string): number {
  // Remove the data URL prefix
  const base64 = dataUrl.split(',')[1] || dataUrl;
  // Calculate bytes (base64 uses 4 chars for every 3 bytes)
  return Math.round((base64.length * 3) / 4);
}

/**
 * Format bytes to human-readable string
 * @param bytes - Number of bytes
 * @returns string - Formatted string like "1.5 MB"
 */
export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';

  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

/**
 * Check if compression is needed based on file size
 * @param file - The file to check
 * @param threshold - Size threshold in bytes (default 500KB)
 * @returns boolean
 */
export function needsCompression(file: File, threshold: number = 500 * 1024): boolean {
  return file.size > threshold;
}

/**
 * Preset configurations for different use cases
 */
export const COMPRESSION_PRESETS = {
  // For pest detection - good quality but smaller size
  pestDetection: {
    maxWidth: 1200,
    maxHeight: 1200,
    quality: 0.7,
    mimeType: 'image/jpeg' as const,
  },
  // For thumbnails - smaller size
  thumbnail: {
    maxWidth: 300,
    maxHeight: 300,
    quality: 0.6,
    mimeType: 'image/jpeg' as const,
  },
  // For profile pictures
  profile: {
    maxWidth: 400,
    maxHeight: 400,
    quality: 0.8,
    mimeType: 'image/jpeg' as const,
  },
  // High quality for marketplace listings
  marketplace: {
    maxWidth: 1600,
    maxHeight: 1600,
    quality: 0.85,
    mimeType: 'image/jpeg' as const,
  },
  // Maximum compression for very limited data
  lowData: {
    maxWidth: 800,
    maxHeight: 800,
    quality: 0.5,
    mimeType: 'image/jpeg' as const,
  },
};
