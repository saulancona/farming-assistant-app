import i18n from '../i18n/config';
import { supabase } from '../lib/supabase';

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface FarmContext {
  location?: { city: string; country: string } | null;
  currentDate?: string;
  currentMonth?: string;
  weather?: {
    temperature: number;
    condition: string;
    humidity?: number;
    rainfall?: number;
  } | null;
}

/**
 * Send a message to the AI chat via secure server-side API
 * API key is never exposed to the client
 */
export async function sendMessageToGemini(
  message: string,
  conversationHistory: ChatMessage[],
  context?: FarmContext
): Promise<string> {
  try {
    // Get auth token
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token;

    if (!token) {
      return "Please sign in to use the AI chat feature.";
    }

    const currentLanguage = i18n.language || 'en';

    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        message,
        conversationHistory,
        context,
        language: currentLanguage
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.details || error.error || 'Chat request failed');
    }

    const data = await response.json();
    return data.response;
  } catch (error) {
    console.error('Error calling chat API:', error);

    if (error instanceof Error) {
      if (error.message.includes('Unauthorized')) {
        return "Please sign in to use the AI chat feature.";
      }
      return `I'm having trouble processing your request: ${error.message}`;
    }

    return "I'm having trouble processing your request right now. Please try again in a moment.";
  }
}
