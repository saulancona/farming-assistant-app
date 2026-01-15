import type { VercelRequest, VercelResponse } from '@vercel/node';
import { GoogleGenerativeAI } from '@google/generative-ai';

// Server-side only API key
const apiKey = process.env.GEMINI_API_KEY || process.env.Gemini;

// Expected photo content for each milestone type
const MILESTONE_EXPECTATIONS: Record<string, { expected: string[]; keywords: string[] }> = {
  // Story Quest milestones
  land_before: {
    expected: ['prepared land', 'soil', 'farm field', 'tilled earth', 'agricultural plot', 'farming land', 'cleared land'],
    keywords: ['soil', 'land', 'field', 'dirt', 'earth', 'ground', 'plot', 'farm', 'prepared', 'tilled'],
  },
  germination: {
    expected: ['seedlings', 'sprouting plants', 'young crops', 'germinating seeds', 'small green shoots'],
    keywords: ['seedling', 'sprout', 'shoot', 'germination', 'young plant', 'emerging', 'green', 'small plant'],
  },
  flowering: {
    expected: ['flowering plants', 'crop flowers', 'blooming', 'plant blossoms', 'flowering stage'],
    keywords: ['flower', 'bloom', 'blossom', 'petal', 'flowering', 'pollination', 'reproductive'],
  },
  pre_harvest: {
    expected: ['mature crops', 'ready for harvest', 'ripe produce', 'fully grown plants', 'mature fruit'],
    keywords: ['mature', 'ripe', 'ready', 'harvest', 'full grown', 'developed', 'fruit', 'grain', 'vegetable'],
  },
  storage: {
    expected: ['harvested crops', 'stored produce', 'harvest yield', 'collected crops', 'crop storage'],
    keywords: ['harvest', 'storage', 'collected', 'yield', 'stored', 'container', 'bag', 'sack', 'produce'],
  },
  // Mission step types - more generic for various mission steps
  mission_step: {
    expected: ['farming activity', 'agricultural work', 'crop management', 'field work'],
    keywords: ['farm', 'crop', 'plant', 'agriculture', 'field', 'soil', 'harvest', 'grow'],
  },
};

// Crop-specific keywords for better validation
const CROP_KEYWORDS: Record<string, string[]> = {
  maize: ['maize', 'corn', 'cob', 'tassel', 'stalk', 'yellow grain'],
  beans: ['bean', 'legume', 'pod', 'vine', 'green bean'],
  tomatoes: ['tomato', 'red fruit', 'vine', 'tomato plant'],
  rice: ['rice', 'paddy', 'grain', 'rice field', 'flooded field'],
  cassava: ['cassava', 'tuber', 'root crop', 'manioc'],
  sweet_potato: ['sweet potato', 'tuber', 'vine', 'orange flesh'],
  coffee: ['coffee', 'coffee plant', 'coffee bean', 'coffee cherry'],
  vegetables: ['vegetable', 'leafy green', 'garden', 'produce'],
  wheat: ['wheat', 'grain', 'stalk', 'golden'],
  sorghum: ['sorghum', 'grain', 'stalk', 'millet family'],
  millet: ['millet', 'grain', 'small seed'],
};

export interface PhotoVerificationResult {
  isValid: boolean;
  confidence: number;
  detectedContent: string;
  reason: string;
  reasonSw?: string; // Swahili translation
  suggestions?: string[];
  suggestionsSw?: string[];
  isAiGenerated?: boolean;
  aiConfidence?: number;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!apiKey) {
    console.error('Gemini API key not configured');
    // Return valid by default if API not configured (graceful degradation)
    return res.status(200).json({
      isValid: true,
      confidence: 0,
      detectedContent: 'Verification unavailable',
      reason: 'Photo verification service not configured. Photo accepted.',
      reasonSw: 'Huduma ya kuthibitisha picha haipo. Picha imekubaliwa.',
    });
  }

  // Verify authorization
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const { image, milestoneType, cropType, stepName, language = 'en', verificationType = 'milestone' } = req.body;

    if (!image) {
      return res.status(400).json({ error: 'Image is required' });
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

    // Different prompts based on verification type
    let prompt: string;

    if (verificationType === 'marketplace') {
      // Marketplace photo verification - focuses on AI detection and product authenticity
      prompt = `You are a photo authenticity verification AI for a farming marketplace app in East Africa.

TASK: Analyze this photo to determine:
1. Is this an AI-generated/synthetic image or a real photograph?
2. Does this appear to be a genuine product photo suitable for a marketplace listing?

AI-GENERATED IMAGE DETECTION - Look for these indicators:
- Unnatural perfection or symmetry
- Unusual lighting inconsistencies
- Artifacts around edges, especially hair, text, or fine details
- Impossible or physically inconsistent elements
- Over-smoothed textures that look artificial
- Strange patterns in backgrounds
- Fingers, hands, or text that look distorted
- Watermarks from AI tools (DALL-E, Midjourney, Stable Diffusion, etc.)
- Unnaturally perfect produce without any blemishes
- Repetitive patterns that real objects wouldn't have

REAL PHOTO INDICATORS:
- Natural imperfections and variations
- Realistic shadows and lighting
- Natural backgrounds (farms, markets, homes)
- Authentic camera noise/grain
- Real-world context clues
- Natural produce with normal blemishes

RESPOND WITH VALID JSON ONLY:
{
  "isValid": boolean,
  "confidence": number (0-100),
  "detectedContent": "Brief description of what's in the photo",
  "reason": "Why accepted or rejected (in ${language === 'sw' ? 'Swahili' : 'English'})",
  "suggestions": ["Suggestion 1", "Suggestion 2"] (only if rejected),
  "isAiGenerated": boolean,
  "aiConfidence": number (0-100, confidence that the image is AI-generated)
}

IMPORTANT:
- If the image appears AI-generated with confidence > 60%, reject it (isValid: false)
- If it's a screenshot of another image or stock photo, reject it
- Accept real photographs even if quality is low (farmers may have basic phones)`;
    } else {
      // Original milestone verification logic
      const expectations = MILESTONE_EXPECTATIONS[milestoneType] || MILESTONE_EXPECTATIONS['mission_step'];
      const cropKeywords = cropType ? CROP_KEYWORDS[cropType.toLowerCase()] || [] : [];

      prompt = `You are an agricultural photo verification AI for a farming app in East Africa.

TASK: Analyze this photo and determine if it matches the expected content for a "${milestoneType}" milestone${cropType ? ` for ${cropType} crops` : ''}${stepName ? ` (Step: ${stepName})` : ''}.

EXPECTED CONTENT:
- This should show: ${expectations.expected.join(', ')}
- Key elements to look for: ${expectations.keywords.join(', ')}
${cropKeywords.length > 0 ? `- Crop-specific indicators: ${cropKeywords.join(', ')}` : ''}

VALIDATION CRITERIA:
1. The photo MUST show agricultural/farming content
2. The photo should reasonably match the milestone stage
3. Random/unrelated photos (selfies, screenshots, non-farm images) should be REJECTED
4. Be somewhat lenient - farmers may have limited photography skills
5. The photo should be from a real camera (not screenshots of other images)
6. AI-generated images should be REJECTED - look for unnatural perfection, artifacts, or synthetic appearance

RESPOND WITH VALID JSON ONLY:
{
  "isValid": boolean,
  "confidence": number (0-100),
  "detectedContent": "Brief description of what's actually in the photo",
  "reason": "Why the photo was accepted or rejected (in ${language === 'sw' ? 'Swahili' : 'English'})",
  "suggestions": ["Suggestion 1", "Suggestion 2"] (only if rejected, in ${language === 'sw' ? 'Swahili' : 'English'}),
  "isAiGenerated": boolean,
  "aiConfidence": number (0-100)
}

Be strict but fair. A photo of empty land for "germination" stage should be rejected. A photo of a pet or selfie should definitely be rejected. AI-generated images must be rejected.`;
    }

    // Extract base64 data and mime type
    const base64Data = image.includes(',') ? image.split(',')[1] : image;
    let mimeType = 'image/jpeg';
    if (image.includes('data:image/')) {
      const match = image.match(/data:image\/(.*?);/);
      if (match) mimeType = `image/${match[1]}`;
    }

    const result = await model.generateContent({
      contents: [{
        role: 'user',
        parts: [
          { text: prompt },
          {
            inlineData: {
              mimeType,
              data: base64Data,
            },
          },
        ],
      }],
      generationConfig: {
        temperature: 0.3, // Lower temperature for more consistent results
        maxOutputTokens: 500,
      },
    });

    const response = result.response;
    let responseText = response.text();

    // Clean and parse JSON
    responseText = responseText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();

    let verification: PhotoVerificationResult;
    try {
      verification = JSON.parse(responseText);
    } catch {
      // If parsing fails, default to accepting the photo
      console.error('Failed to parse verification response:', responseText);
      verification = {
        isValid: true,
        confidence: 50,
        detectedContent: 'Unable to analyze',
        reason: 'Photo verification encountered an issue. Photo accepted by default.',
        reasonSw: 'Kuthibitisha picha kumekutana na tatizo. Picha imekubaliwa kwa msingi.',
      };
    }

    // Ensure required fields exist
    if (typeof verification.isValid !== 'boolean') {
      verification.isValid = true;
    }
    if (typeof verification.confidence !== 'number') {
      verification.confidence = 50;
    }
    if (!verification.detectedContent) {
      verification.detectedContent = 'Content analysis unavailable';
    }
    if (!verification.reason) {
      verification.reason = verification.isValid ? 'Photo accepted' : 'Photo rejected';
    }

    // Add Swahili translations if needed and not already present
    if (language === 'sw' && !verification.reasonSw) {
      verification.reasonSw = verification.reason;
    }

    return res.status(200).json(verification);
  } catch (error: any) {
    console.error('Photo verification error:', error);

    // Return valid by default on error (graceful degradation)
    return res.status(200).json({
      isValid: true,
      confidence: 0,
      detectedContent: 'Verification error',
      reason: 'Photo verification temporarily unavailable. Photo accepted.',
      reasonSw: 'Kuthibitisha picha hakupatikani kwa muda. Picha imekubaliwa.',
    });
  }
}
