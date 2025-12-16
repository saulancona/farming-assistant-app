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
    return res.status(500).json({ error: 'Chat service not configured' });
  }

  // Verify authorization
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const { message, conversationHistory, context, language } = req.body;

    if (!message) {
      return res.status(400).json({ error: 'Missing message' });
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

    // Build system context
    let systemContext = `You are FarmAssist, an expert AI farming assistant specializing in African smallholder agriculture. You provide practical, affordable, and culturally appropriate advice for farmers across Africa.

CORE EXPERTISE:
- Crop planning for African climates (considering long rains, short rains, dry seasons)
- Common African crops: maize, cassava, beans, sweet potatoes, tomatoes, kale, sorghum, millet
- Pest & disease management using locally available and organic solutions
- Soil fertility improvement with low-cost methods (composting, manure, crop rotation, legume intercropping)
- Water-smart farming and drought management
- Post-harvest handling and storage to reduce losses
- Market timing and value addition opportunities
- Climate-resilient farming practices

RESPONSE GUIDELINES:
- Give practical advice suitable for smallholder farmers with limited resources
- Prioritize organic and low-cost solutions when possible
- Provide specific numbers: planting dates, spacing, fertilizer amounts, yields
- Consider local varieties and seeds that farmers can save
- Mention both traditional wisdom and modern practices
- Be aware of African seasons: long rains (March-May), short rains (October-December)
- Provide actionable steps the farmer can implement immediately`;

    // Add location context
    if (context?.location) {
      systemContext += `\n\nFARMER LOCATION: ${context.location.city}, ${context.location.country}`;
      systemContext += `\n- Adjust recommendations for local climate, growing season, and common practices in this region`;
    }

    // Add date context
    if (context?.currentDate) {
      systemContext += `\n\nCURRENT DATE: ${context.currentDate} (Month: ${context.currentMonth})`;
      systemContext += `\n- Consider what crops should be planted or harvested this month`;
    }

    // Add weather context
    if (context?.weather) {
      systemContext += `\n\nCURRENT WEATHER: ${context.weather.condition}, ${context.weather.temperature}°C`;
      if (context.weather.humidity) {
        systemContext += `, humidity ${context.weather.humidity}%`;
      }
    }

    // Add language instruction
    const languageNames: Record<string, string> = {
      en: 'English',
      sw: 'Swahili (Kiswahili)',
      ha: 'Hausa',
      am: 'Amharic'
    };
    const languageName = languageNames[language] || 'English';

    systemContext += `\n\nIMPORTANT - LANGUAGE REQUIREMENT:
- You MUST respond ENTIRELY in ${languageName}
- Do NOT mix languages

RESPONSE FORMAT:
- Keep responses helpful and conversational (3-6 sentences)
- Use simple language
- Include specific actionable steps`;

    // Build conversation
    let conversationText = systemContext + '\n\n';
    if (conversationHistory && Array.isArray(conversationHistory)) {
      conversationHistory.forEach((msg: { role: string; content: string }) => {
        conversationText += `${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.content}\n`;
      });
    }
    conversationText += `User: ${message}\nAssistant:`;

    const result = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: conversationText }] }],
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 1000,
      },
    });

    const response = result.response;
    const text = response.text();

    return res.status(200).json({ response: text });
  } catch (error: any) {
    console.error('Chat error:', error);
    return res.status(500).json({
      error: 'Chat failed',
      details: error.message
    });
  }
}
