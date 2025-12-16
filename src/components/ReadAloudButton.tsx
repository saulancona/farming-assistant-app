// Read Aloud Button Component - For Text-to-Speech
import { useState, useEffect } from 'react';
import { Volume2 } from 'lucide-react';
import voiceService from '../services/voice';
import { motion } from 'framer-motion';

interface ReadAloudButtonProps {
  text: string;
  interrupt?: boolean;
  className?: string;
  size?: number;
  showLabel?: boolean;
  label?: string;
  autoPlay?: boolean; // Automatically play on mount
}

export default function ReadAloudButton({
  text,
  interrupt = false,
  className = '',
  size = 20,
  showLabel = false,
  label = 'Read Aloud',
  autoPlay = false,
}: ReadAloudButtonProps) {
  const [isSpeaking, setIsSpeaking] = useState(false);

  // Check if browser supports voice output
  const { tts } = voiceService.isSupported();

  useEffect(() => {
    // Auto-play if enabled and auto-read mode is on
    if (autoPlay && tts) {
      const settings = voiceService.getSettings();
      if (settings.enabled && settings.autoRead) {
        handleSpeak();
      }
    }

    return () => {
      // Cleanup - stop speaking when unmounting
      if (isSpeaking) {
        voiceService.stop();
      }
    };
  }, [autoPlay, text]);

  const handleSpeak = () => {
    if (!tts) {
      console.warn('Text-to-speech not supported');
      return;
    }

    if (isSpeaking) {
      // Stop speaking
      voiceService.stop();
      setIsSpeaking(false);
    } else {
      // Start speaking
      setIsSpeaking(true);
      voiceService.speak(text, interrupt);

      // Check speaking status periodically
      const checkInterval = setInterval(() => {
        if (!voiceService.getSpeakingStatus()) {
          setIsSpeaking(false);
          clearInterval(checkInterval);
        }
      }, 100);
    }
  };

  if (!tts) {
    return null; // Hide button if not supported
  }

  return (
    <motion.button
      type="button"
      onClick={handleSpeak}
      className={`flex items-center gap-2 p-2 rounded-lg transition-colors ${
        isSpeaking
          ? 'bg-blue-500 text-white hover:bg-blue-600'
          : 'bg-blue-100 text-blue-600 hover:bg-blue-200'
      } ${className}`}
      whileTap={{ scale: 0.95 }}
      title={isSpeaking ? 'Stop reading' : 'Read aloud'}
    >
      {isSpeaking ? (
        <>
          <motion.div
            animate={{ scale: [1, 1.2, 1] }}
            transition={{ repeat: Infinity, duration: 1 }}
          >
            <Volume2 size={size} />
          </motion.div>
          {showLabel && <span className="text-sm font-medium">Speaking...</span>}
        </>
      ) : (
        <>
          <Volume2 size={size} />
          {showLabel && <span className="text-sm font-medium">{label}</span>}
        </>
      )}
    </motion.button>
  );
}
