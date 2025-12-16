// Voice Service using Web Speech API for Text-to-Speech and Speech-to-Text
// Designed for accessibility - works offline, no API keys needed

export interface VoiceSettings {
  enabled: boolean;
  language: string;
  rate: number; // 0.5 to 2 (1 is normal)
  pitch: number; // 0 to 2 (1 is normal)
  volume: number; // 0 to 1
  autoRead: boolean; // Automatically read content
}

// Default settings
const DEFAULT_SETTINGS: VoiceSettings = {
  enabled: true,
  language: 'en-US',
  rate: 0.9, // Slightly slower for clarity
  pitch: 1,
  volume: 1,
  autoRead: false, // Manual mode by default
};

class VoiceService {
  private synthesis: SpeechSynthesis | null = null;
  private recognition: any = null; // SpeechRecognition
  private settings: VoiceSettings;
  private isSpeaking: boolean = false;
  private speechQueue: string[] = [];
  private onTranscriptCallback: ((transcript: string) => void) | null = null;
  private isListening: boolean = false;

  constructor() {
    // Initialize Text-to-Speech
    if ('speechSynthesis' in window) {
      this.synthesis = window.speechSynthesis;
    } else {
      console.warn('Text-to-Speech not supported in this browser');
    }

    // Initialize Speech-to-Text
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      this.recognition = new SpeechRecognition();
      this.setupRecognition();
    } else {
      console.warn('Speech Recognition not supported in this browser');
    }

    // Load settings from localStorage
    const savedSettings = localStorage.getItem('voiceSettings');
    this.settings = savedSettings ? JSON.parse(savedSettings) : DEFAULT_SETTINGS;
  }

  // ===== TEXT-TO-SPEECH (TTS) =====

  /**
   * Speak text aloud
   */
  speak(text: string, interrupt: boolean = false): void {
    if (!this.synthesis || !this.settings.enabled || !text.trim()) {
      return;
    }

    // If interrupt, stop current speech and clear queue
    if (interrupt) {
      this.stop();
    }

    // If already speaking and not interrupting, queue it
    if (this.isSpeaking && !interrupt) {
      this.speechQueue.push(text);
      return;
    }

    this.speakImmediate(text);
  }

  /**
   * Speak immediately (internal method)
   */
  private speakImmediate(text: string): void {
    if (!this.synthesis) return;

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = this.settings.language;
    utterance.rate = this.settings.rate;
    utterance.pitch = this.settings.pitch;
    utterance.volume = this.settings.volume;

    utterance.onstart = () => {
      this.isSpeaking = true;
    };

    utterance.onend = () => {
      this.isSpeaking = false;
      // Speak next item in queue if any
      if (this.speechQueue.length > 0) {
        const nextText = this.speechQueue.shift();
        if (nextText) {
          setTimeout(() => this.speakImmediate(nextText), 100);
        }
      }
    };

    utterance.onerror = (event) => {
      console.error('Speech synthesis error:', event);
      this.isSpeaking = false;
    };

    this.synthesis.speak(utterance);
  }

  /**
   * Stop speaking
   */
  stop(): void {
    if (this.synthesis) {
      this.synthesis.cancel();
      this.speechQueue = [];
      this.isSpeaking = false;
    }
  }

  /**
   * Pause speaking
   */
  pause(): void {
    if (this.synthesis && this.isSpeaking) {
      this.synthesis.pause();
    }
  }

  /**
   * Resume speaking
   */
  resume(): void {
    if (this.synthesis && this.synthesis.paused) {
      this.synthesis.resume();
    }
  }

  /**
   * Get speaking status
   */
  getSpeakingStatus(): boolean {
    return this.isSpeaking;
  }

  // ===== SPEECH-TO-TEXT (STT) =====

  /**
   * Setup speech recognition
   */
  private setupRecognition(): void {
    if (!this.recognition) return;

    this.recognition.continuous = false;
    this.recognition.interimResults = false;
    this.recognition.maxAlternatives = 1;
    this.recognition.lang = this.settings.language;

    this.recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      console.log('Speech recognized:', transcript);

      if (this.onTranscriptCallback) {
        this.onTranscriptCallback(transcript);
      }
    };

    this.recognition.onerror = (event: any) => {
      console.error('Speech recognition error:', event.error);
      this.isListening = false;

      // Provide user-friendly error messages
      let errorMessage = 'Voice input error. Please try again.';
      if (event.error === 'no-speech') {
        errorMessage = 'No speech detected. Please speak clearly.';
      } else if (event.error === 'not-allowed') {
        errorMessage = 'Microphone access denied. Please allow microphone access.';
      } else if (event.error === 'network') {
        errorMessage = 'Network error. Voice input works best online.';
      }

      if (this.onTranscriptCallback) {
        this.onTranscriptCallback('ERROR: ' + errorMessage);
      }
    };

    this.recognition.onend = () => {
      this.isListening = false;
    };
  }

  /**
   * Start listening for speech
   */
  startListening(onTranscript: (transcript: string) => void): void {
    if (!this.recognition || !this.settings.enabled) {
      console.warn('Speech recognition not available');
      return;
    }

    this.onTranscriptCallback = onTranscript;
    this.recognition.lang = this.settings.language;

    try {
      this.recognition.start();
      this.isListening = true;
      console.log('Started listening...');
    } catch (error) {
      console.error('Error starting speech recognition:', error);
    }
  }

  /**
   * Stop listening
   */
  stopListening(): void {
    if (this.recognition && this.isListening) {
      this.recognition.stop();
      this.isListening = false;
    }
  }

  /**
   * Get listening status
   */
  getListeningStatus(): boolean {
    return this.isListening;
  }

  // ===== SETTINGS =====

  /**
   * Update voice settings
   */
  updateSettings(newSettings: Partial<VoiceSettings>): void {
    this.settings = { ...this.settings, ...newSettings };
    localStorage.setItem('voiceSettings', JSON.stringify(this.settings));

    // Update recognition language if changed
    if (this.recognition && newSettings.language) {
      this.recognition.lang = newSettings.language;
    }

    console.log('Voice settings updated:', this.settings);
  }

  /**
   * Get current settings
   */
  getSettings(): VoiceSettings {
    return { ...this.settings };
  }

  /**
   * Reset to default settings
   */
  resetSettings(): void {
    this.settings = { ...DEFAULT_SETTINGS };
    localStorage.setItem('voiceSettings', JSON.stringify(this.settings));
  }

  /**
   * Toggle voice enabled/disabled
   */
  toggleEnabled(): boolean {
    this.settings.enabled = !this.settings.enabled;
    localStorage.setItem('voiceSettings', JSON.stringify(this.settings));
    return this.settings.enabled;
  }

  /**
   * Toggle auto-read mode
   */
  toggleAutoRead(): boolean {
    this.settings.autoRead = !this.settings.autoRead;
    localStorage.setItem('voiceSettings', JSON.stringify(this.settings));
    return this.settings.autoRead;
  }

  // ===== UTILITY METHODS =====

  /**
   * Get available voices
   */
  getAvailableVoices(): SpeechSynthesisVoice[] {
    if (!this.synthesis) return [];
    return this.synthesis.getVoices();
  }

  /**
   * Check if browser supports voice
   */
  isSupported(): { tts: boolean; stt: boolean } {
    return {
      tts: !!this.synthesis,
      stt: !!this.recognition,
    };
  }

  /**
   * Speak number in readable format
   */
  speakNumber(num: number, label?: string): void {
    const text = label ? `${label}: ${num.toLocaleString()}` : num.toLocaleString();
    this.speak(text);
  }

  /**
   * Speak currency amount
   */
  speakCurrency(amount: number, currency: string = 'Shillings'): void {
    const text = `${amount.toLocaleString()} ${currency}`;
    this.speak(text);
  }

  /**
   * Speak date
   */
  speakDate(date: Date | string): void {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    const text = dateObj.toLocaleDateString(this.settings.language, {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
    this.speak(text);
  }
}

// Create singleton instance
const voiceService = new VoiceService();

// Export singleton
export default voiceService;

// Export helper functions for common use cases
export const speakText = (text: string, interrupt?: boolean) => voiceService.speak(text, interrupt);
export const stopSpeaking = () => voiceService.stop();
export const startListening = (callback: (transcript: string) => void) => voiceService.startListening(callback);
export const stopListening = () => voiceService.stopListening();
