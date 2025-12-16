import type { VercelRequest, VercelResponse } from '@vercel/node';
import { GoogleGenerativeAI } from '@google/generative-ai';

// Server-side only API key
const apiKey = process.env.GEMINI_API_KEY || process.env.Gemini;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!apiKey) {
    console.error('Gemini API key not configured');
    return res.status(500).json({ error: 'Pest detection service not configured' });
  }

  // Verify authorization
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const { description, images, cropName, language } = req.body;

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

    // Get language name
    const languageNames: Record<string, string> = {
      en: 'English',
      sw: 'Swahili (Kiswahili)',
      ha: 'Hausa',
      am: 'Amharic'
    };
    const languageName = languageNames[language] || 'English';

    // Build prompt
    const prompt = `You are an expert agricultural pathologist specializing in African crop pests and diseases.

IMPORTANT - LANGUAGE REQUIREMENT:
- You MUST respond ENTIRELY in ${languageName}
- Write all field values in ${languageName}

${cropName ? `CROP: ${cropName}` : 'CROP: Not specified'}
${description ? `FARMER'S DESCRIPTION: ${description}` : ''}

ANALYSIS TASK:
Analyze ${images && images.length > 0 ? 'the provided images and ' : ''}the description to identify the pest or disease.

COMMON AFRICAN CROP PESTS & DISEASES:
- Fall Armyworm, Maize Lethal Necrosis
- Cassava Mosaic Disease, Cassava Brown Streak Disease
- Tomato Late Blight, Bacterial Wilt
- Bean Fly, Aphids, Striga
- Sweet Potato Weevil, Cutworms, Stem Borers

Respond ONLY with valid JSON:
{
  "pest": "Name (Scientific Name)",
  "severity": "Low/Medium/High with justification",
  "treatment": "Step-by-step treatment with locally available solutions",
  "prevention": ["Tip 1", "Tip 2", "Tip 3", "Tip 4"]
}`;

    // Build content parts
    const parts: any[] = [{ text: prompt }];

    // Add images if provided
    if (images && Array.isArray(images) && images.length > 0) {
      for (const img of images) {
        // Extract base64 data and mime type
        const base64Data = img.includes(',') ? img.split(',')[1] : img;
        let mimeType = 'image/jpeg';
        if (img.includes('data:image/')) {
          const match = img.match(/data:image\/(.*?);/);
          if (match) mimeType = `image/${match[1]}`;
        }

        parts.push({
          inlineData: {
            mimeType,
            data: base64Data
          }
        });
      }
    }

    const result = await model.generateContent({
      contents: [{ role: 'user', parts }],
      generationConfig: {
        temperature: 0.4,
        maxOutputTokens: 1500,
      },
    });

    const response = result.response;
    let responseText = response.text();

    // Clean and parse JSON
    responseText = responseText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    const diagnosis = JSON.parse(responseText);

    // Validate structure
    if (!diagnosis.pest || !diagnosis.severity || !diagnosis.treatment || !Array.isArray(diagnosis.prevention)) {
      throw new Error('Invalid response structure');
    }

    return res.status(200).json(diagnosis);
  } catch (error: any) {
    console.error('Pest detection error:', error);

    // Return fallback
    return res.status(200).json({
      pest: 'Unable to identify - Manual inspection recommended',
      severity: 'Unknown',
      treatment: 'Please consult with a local agricultural extension officer for accurate diagnosis.',
      prevention: [
        'Maintain good field hygiene',
        'Monitor crops regularly',
        'Use disease-resistant varieties',
        'Follow proper crop rotation'
      ]
    });
  }
}
