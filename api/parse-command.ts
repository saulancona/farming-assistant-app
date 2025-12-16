import type { VercelRequest, VercelResponse } from '@vercel/node';
import { GoogleGenerativeAI } from '@google/generative-ai';

// API key is server-side only - never exposed to client
// Try both naming conventions for the API key
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || process.env.Gemini || '');

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Verify request has authorization (Supabase JWT)
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const { text, prompt } = req.body;

    if (!text) {
      return res.status(400).json({ error: 'Missing text parameter' });
    }

    if (!prompt) {
      return res.status(400).json({ error: 'Missing prompt parameter' });
    }

    console.log('Parsing command:', text);

    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

    // Use the prompt provided by the client (contains examples and rules)
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const responseText = response.text().trim();

    console.log('AI response:', responseText);

    // Return parsed command to client
    return res.status(200).json({
      response: responseText
    });

  } catch (error: any) {
    console.error('Command parsing error:', error);
    return res.status(500).json({
      error: 'Command parsing failed',
      details: error.message
    });
  }
}
