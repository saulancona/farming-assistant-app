import type { VercelRequest, VercelResponse } from '@vercel/node';

// This endpoint is deprecated - Gemini is used directly for voice features
// Keeping a stub for backwards compatibility

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Return deprecation notice
  return res.status(501).json({
    error: 'This endpoint has been deprecated',
    message: 'Voice transcription is now handled client-side using Gemini. Please update your client.',
    alternative: 'Use the Web Speech API for voice recognition'
  });
}
