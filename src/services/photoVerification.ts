// Photo Verification Service - Validates photos match expected content
import i18n from '../i18n/config';
import { supabase } from '../lib/supabase';
import { fileToDataUrl } from './storage';

export interface PhotoVerificationResult {
  isValid: boolean;
  confidence: number;
  detectedContent: string;
  reason: string;
  reasonSw?: string;
  suggestions?: string[];
  suggestionsSw?: string[];
  isAiGenerated?: boolean;
  aiConfidence?: number;
}

/**
 * Verify a photo matches expected content for a milestone/mission step
 * Uses AI to analyze the photo and validate it's appropriate
 */
export async function verifyPhoto(
  file: File | Blob,
  milestoneType: string,
  options?: {
    cropType?: string;
    stepName?: string;
  }
): Promise<PhotoVerificationResult> {
  try {
    // Get auth token
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token;

    if (!token) {
      // If not logged in, skip verification
      return {
        isValid: true,
        confidence: 0,
        detectedContent: 'Not verified (not logged in)',
        reason: 'Photo verification skipped - not logged in',
      };
    }

    // Convert file to base64 for API
    const base64Data = await fileToDataUrl(file);

    const currentLanguage = i18n.language || 'en';

    const response = await fetch('/api/verify-photo', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({
        image: base64Data,
        milestoneType,
        cropType: options?.cropType,
        stepName: options?.stepName,
        language: currentLanguage,
      }),
    });

    if (!response.ok) {
      console.warn('Photo verification API error, accepting photo by default');
      return {
        isValid: true,
        confidence: 0,
        detectedContent: 'Verification unavailable',
        reason: 'Photo verification service unavailable. Photo accepted.',
        reasonSw: 'Huduma ya kuthibitisha picha haipo. Picha imekubaliwa.',
      };
    }

    return await response.json();
  } catch (error) {
    console.error('Photo verification error:', error);
    // On any error, accept the photo (graceful degradation)
    return {
      isValid: true,
      confidence: 0,
      detectedContent: 'Verification error',
      reason: 'Photo verification encountered an error. Photo accepted.',
      reasonSw: 'Kuthibitisha picha kumekutana na hitilafu. Picha imekubaliwa.',
    };
  }
}

/**
 * Get user-friendly message for verification result
 */
export function getVerificationMessage(
  result: PhotoVerificationResult,
  isSwahili: boolean
): { title: string; message: string; suggestions?: string[] } {
  if (result.isValid) {
    return {
      title: isSwahili ? 'Picha Imekubaliwa' : 'Photo Accepted',
      message: isSwahili
        ? result.reasonSw || result.reason
        : result.reason,
    };
  }

  return {
    title: isSwahili ? 'Picha Imekataliwa' : 'Photo Rejected',
    message: isSwahili
      ? result.reasonSw || result.reason
      : result.reason,
    suggestions: isSwahili
      ? result.suggestionsSw || result.suggestions
      : result.suggestions,
  };
}

/**
 * Milestone type display names for verification UI
 */
export const MILESTONE_NAMES: Record<string, { en: string; sw: string }> = {
  land_before: { en: 'Land Before Planting', sw: 'Ardhi Kabla ya Kupanda' },
  germination: { en: 'Germination', sw: 'Kuota' },
  flowering: { en: 'Flowering', sw: 'Kutoa Maua' },
  pre_harvest: { en: 'Before Harvest', sw: 'Kabla ya Kuvuna' },
  storage: { en: 'Storage/Harvest', sw: 'Uhifadhi/Mavuno' },
  mission_step: { en: 'Mission Step', sw: 'Hatua ya Misheni' },
};

/**
 * Get expected photo description for user guidance
 */
export function getExpectedPhotoDescription(
  milestoneType: string,
  cropType: string | undefined,
  isSwahili: boolean
): string {
  const descriptions: Record<string, { en: string; sw: string }> = {
    land_before: {
      en: `Take a photo of your prepared farmland before planting${cropType ? ` ${cropType}` : ''}. Show the soil and plot area.`,
      sw: `Piga picha ya shamba lako lililoandaliwa kabla ya kupanda${cropType ? ` ${cropType}` : ''}. Onyesha udongo na eneo la shamba.`,
    },
    germination: {
      en: `Take a photo showing your ${cropType || 'crops'} sprouting/germinating. Capture the young seedlings.`,
      sw: `Piga picha inayoonyesha ${cropType || 'mazao yako'} yakiota. Pata miche michanga.`,
    },
    flowering: {
      en: `Take a photo of your ${cropType || 'crops'} in the flowering stage. Show the flowers/blossoms.`,
      sw: `Piga picha ya ${cropType || 'mazao yako'} yakitoa maua. Onyesha maua.`,
    },
    pre_harvest: {
      en: `Take a photo of your mature ${cropType || 'crops'} ready for harvest. Show the developed produce.`,
      sw: `Piga picha ya ${cropType || 'mazao yako'} yalivokomaa tayari kuvunwa. Onyesha mazao yaliyokua.`,
    },
    storage: {
      en: `Take a photo of your harvested ${cropType || 'produce'} in storage or after collection.`,
      sw: `Piga picha ya ${cropType || 'mazao yako'} yaliyovunwa yakiwa katika hifadhi au baada ya kukusanywa.`,
    },
    mission_step: {
      en: 'Take a photo showing your progress on this farming activity.',
      sw: 'Piga picha inayoonyesha maendeleo yako katika shughuli hii ya kilimo.',
    },
  };

  const desc = descriptions[milestoneType] || descriptions['mission_step'];
  return isSwahili ? desc.sw : desc.en;
}

/**
 * Verify a marketplace photo is authentic (not AI-generated)
 * Uses AI to detect synthetic/generated images
 */
export async function verifyMarketplacePhoto(
  imageUrl: string
): Promise<PhotoVerificationResult> {
  try {
    // Get auth token
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token;

    if (!token) {
      // If not logged in, skip verification
      return {
        isValid: true,
        confidence: 0,
        detectedContent: 'Not verified (not logged in)',
        reason: 'Photo verification skipped - not logged in',
      };
    }

    // Fetch the image and convert to base64
    let base64Data: string;
    try {
      const response = await fetch(imageUrl);
      if (!response.ok) {
        throw new Error('Failed to fetch image');
      }
      const blob = await response.blob();
      base64Data = await fileToDataUrl(blob);
    } catch (fetchError) {
      console.warn('Could not fetch image for verification:', fetchError);
      // If we can't fetch the image, accept it (might be CORS issue)
      return {
        isValid: true,
        confidence: 0,
        detectedContent: 'Unable to fetch image',
        reason: 'Could not verify image. Please ensure it is a real photo of your product.',
        reasonSw: 'Haikuweza kuthibitisha picha. Tafadhali hakikisha ni picha halisi ya bidhaa yako.',
      };
    }

    const currentLanguage = i18n.language || 'en';

    const apiResponse = await fetch('/api/verify-photo', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({
        image: base64Data,
        verificationType: 'marketplace',
        language: currentLanguage,
      }),
    });

    if (!apiResponse.ok) {
      console.warn('Photo verification API error, accepting photo by default');
      return {
        isValid: true,
        confidence: 0,
        detectedContent: 'Verification unavailable',
        reason: 'Photo verification service unavailable. Photo accepted.',
        reasonSw: 'Huduma ya kuthibitisha picha haipo. Picha imekubaliwa.',
      };
    }

    const result = await apiResponse.json();

    // If detected as AI-generated with high confidence, add clear messaging
    if (result.isAiGenerated && result.aiConfidence > 60) {
      return {
        ...result,
        isValid: false,
        reason: currentLanguage === 'sw'
          ? 'Picha hii inaonekana kuwa imetengenezwa na AI. Tafadhali pakia picha halisi ya bidhaa yako.'
          : 'This image appears to be AI-generated. Please upload a real photo of your product.',
        reasonSw: 'Picha hii inaonekana kuwa imetengenezwa na AI. Tafadhali pakia picha halisi ya bidhaa yako.',
        suggestions: [
          currentLanguage === 'sw' ? 'Piga picha halisi ya bidhaa yako' : 'Take a real photo of your product',
          currentLanguage === 'sw' ? 'Usitumie picha za AI au stock photos' : 'Do not use AI-generated or stock photos',
        ],
      };
    }

    return result;
  } catch (error) {
    console.error('Marketplace photo verification error:', error);
    // On any error, accept the photo (graceful degradation)
    return {
      isValid: true,
      confidence: 0,
      detectedContent: 'Verification error',
      reason: 'Photo verification encountered an error. Photo accepted.',
      reasonSw: 'Kuthibitisha picha kumekutana na hitilafu. Picha imekubaliwa.',
    };
  }
}
