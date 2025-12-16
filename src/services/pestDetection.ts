// Pest & Disease Detection Service - Secure Server-side API
import i18n from '../i18n/config';
import { supabase } from '../lib/supabase';

export interface PestDiagnosis {
  pest: string;
  severity: string;
  treatment: string;
  prevention: string[];
}

/**
 * Analyze pest/disease from images and description via secure server-side API
 * API key is never exposed to the client
 */
export async function analyzePestWithAI(
  description: string,
  images: string[],
  cropName?: string
): Promise<PestDiagnosis> {
  try {
    // Get auth token
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token;

    if (!token) {
      throw new Error('Please sign in to use pest detection');
    }

    const currentLanguage = i18n.language || 'en';

    const response = await fetch('/api/pest-detection', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        description,
        images,
        cropName,
        language: currentLanguage
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.details || error.error || 'Pest detection failed');
    }

    const diagnosis = await response.json();
    return diagnosis;
  } catch (error) {
    console.error('Error analyzing pest:', error);

    // Return fallback diagnosis
    return {
      pest: 'Unable to identify - Manual inspection recommended',
      severity: 'Unknown',
      treatment: 'Please consult with a local agricultural extension officer for accurate diagnosis and treatment recommendations.',
      prevention: [
        'Maintain good field hygiene',
        'Monitor crops regularly for early detection',
        'Use disease-resistant varieties when available',
        'Follow proper crop rotation practices',
      ],
    };
  }
}

/**
 * Analyze pest from text description only (no images)
 */
export async function analyzePestFromDescription(
  description: string,
  cropName?: string
): Promise<PestDiagnosis> {
  return analyzePestWithAI(description, [], cropName);
}
