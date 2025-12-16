// Simple Voice Utilities for Text-to-Speech and Speech-to-Text
// Browser-native Web Speech API - no external dependencies

import i18n from '../i18n/config';

// Language code mapping for Web Speech API
const LANGUAGE_CODES: Record<string, string> = {
  en: 'en-US',
  sw: 'sw-KE', // Swahili (Kenya)
  ha: 'ha-NG', // Hausa (Nigeria)
  am: 'am-ET'  // Amharic (Ethiopia)
};

// Get the current language from i18n
function getCurrentLanguage(): string {
  const currentLang = i18n.language || 'en';
  return LANGUAGE_CODES[currentLang] || 'en-US';
}

// Find the best (most natural sounding) voice for the current language
function getBestVoice(langCode?: string): SpeechSynthesisVoice | null {
  const targetLang = langCode || getCurrentLanguage();
  const voices = window.speechSynthesis.getVoices();

  // Extract language prefix (e.g., 'en' from 'en-US')
  const langPrefix = targetLang.split('-')[0];

  // Try to find a voice that matches the exact language code
  const exactMatch = voices.find(v => v.lang === targetLang);
  if (exactMatch) return exactMatch;

  // Try to find any voice that starts with the language prefix
  const langMatch = voices.find(v => v.lang.startsWith(langPrefix));
  if (langMatch) return langMatch;

  // For English, try preferred voices (more natural sounding)
  if (langPrefix === 'en') {
    const preferredVoices = [
      'Google UK English Female',
      'Google US English Female',
      'Microsoft Zira Desktop',
      'Samantha',
      'Karen'
    ];

    for (const preferred of preferredVoices) {
      const voice = voices.find(v => v.name.includes(preferred));
      if (voice) return voice;
    }
  }

  // Fallback: Find any female voice for the language
  const femaleVoice = voices.find(v =>
    v.lang.startsWith(langPrefix) && v.name.toLowerCase().includes('female')
  );
  if (femaleVoice) return femaleVoice;

  // Fallback: Any voice in the target language
  const anyLangVoice = voices.find(v => v.lang.startsWith(langPrefix));
  if (anyLangVoice) return anyLangVoice;

  // Last resort: Default to English or first available
  return voices.find(v => v.lang.startsWith('en')) || voices[0] || null;
}

// Add natural pauses to text
function addNaturalPauses(text: string): string {
  return text
    .replace(/\. /g, '... ')  // Longer pause after sentences
    .replace(/\, /g, ', ')     // Short pause after commas
    .replace(/\! /g, '!... ')  // Pause after exclamations
    .replace(/\? /g, '?... '); // Pause after questions
}

// Text-to-Speech: Speak text aloud with natural voice
export function speak(text: string) {
  if (!('speechSynthesis' in window)) {
    console.warn('Text-to-Speech not supported');
    return;
  }

  window.speechSynthesis.cancel(); // Stop any ongoing speech

  const utterance = new SpeechSynthesisUtterance(addNaturalPauses(text));

  // Wait for voices to load
  const setVoiceAndSpeak = () => {
    // Force refresh voice list to ensure we have latest voices
    window.speechSynthesis.getVoices();

    const currentLang = getCurrentLanguage();
    const langPrefix = currentLang.split('-')[0];
    console.log(`Speaking in language: ${currentLang}`); // Debug log

    const bestVoice = getBestVoice(currentLang);

    if (bestVoice) {
      utterance.voice = bestVoice;
      const voiceLangPrefix = bestVoice.lang.split('-')[0];

      // Check if voice actually matches the requested language
      if (voiceLangPrefix !== langPrefix) {
        console.warn(`⚠️ No ${langPrefix} voice available. Using ${bestVoice.lang} voice as fallback.`);
        console.info(`To get ${langPrefix} voice support, install language pack in your OS settings.`);
      } else {
        console.log(`✓ Using voice: ${bestVoice.name} (${bestVoice.lang})`); // Debug log
      }
    } else {
      console.warn(`No voice found for ${currentLang}, using default`);
    }

    utterance.lang = currentLang;
    utterance.rate = 0.85;    // Slower, more conversational pace
    utterance.pitch = 1.05;   // Slightly higher pitch for friendliness
    utterance.volume = 1.0;

    window.speechSynthesis.speak(utterance);
  };

  // Always force a small delay to ensure voices are loaded and language is updated
  setTimeout(() => {
    // Voices might not be loaded yet
    const voices = window.speechSynthesis.getVoices();
    if (voices.length > 0) {
      setVoiceAndSpeak();
    } else {
      window.speechSynthesis.onvoiceschanged = () => {
        setVoiceAndSpeak();
      };
    }
  }, 50); // 50ms delay to ensure i18n language has updated
}

// Stop speaking
export function stopSpeaking() {
  if ('speechSynthesis' in window) {
    window.speechSynthesis.cancel();
  }
}

// Speech-to-Text: Listen for voice input
export function listen(onResult: (text: string) => void, onError?: (error: string) => void) {
  const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

  if (!SpeechRecognition) {
    const errorMsg = 'Voice input not supported in this browser';
    console.warn(errorMsg);
    if (onError) onError(errorMsg);
    return null;
  }

  const recognition = new SpeechRecognition();
  recognition.lang = getCurrentLanguage();
  recognition.continuous = false;
  recognition.interimResults = false;

  recognition.onresult = (event: any) => {
    const transcript = event.results[0][0].transcript;
    onResult(transcript);
  };

  recognition.onerror = (event: any) => {
    const errorMsg = event.error === 'no-speech'
      ? 'No speech detected. Please try again.'
      : 'Voice input error. Please try again.';
    if (onError) onError(errorMsg);
  };

  recognition.start();
  return recognition;
}

// Check if browser supports voice features
export function isVoiceSupported() {
  return {
    speech: 'speechSynthesis' in window,
    recognition: !!(window as any).SpeechRecognition || !!( window as any).webkitSpeechRecognition
  };
}
