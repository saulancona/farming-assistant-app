// Voice Input Button Component - For Speech-to-Text
import { useState, useEffect } from 'react';
import { Mic } from 'lucide-react';
import voiceService from '../services/voice';
import { motion } from 'framer-motion';

interface VoiceButtonProps {
  onTranscript: (text: string) => void;
  onError?: (error: string) => void;
  className?: string;
  size?: number;
  showLabel?: boolean;
  label?: string;
}

export default function VoiceButton({
  onTranscript,
  onError,
  className = '',
  size = 20,
  showLabel = false,
  label = 'Speak',
}: VoiceButtonProps) {
  const [isListening, setIsListening] = useState(false);
  const [error, setError] = useState('');

  // Check if browser supports voice input
  const { stt } = voiceService.isSupported();

  useEffect(() => {
    // Cleanup on unmount
    return () => {
      if (isListening) {
        voiceService.stopListening();
      }
    };
  }, [isListening]);

  const handleToggleListening = () => {
    if (!stt) {
      const errorMsg = 'Voice input not supported in your browser. Please try Chrome, Edge, or Safari.';
      setError(errorMsg);
      if (onError) onError(errorMsg);
      return;
    }

    if (isListening) {
      // Stop listening
      voiceService.stopListening();
      setIsListening(false);
    } else {
      // Start listening
      setError('');
      setIsListening(true);

      voiceService.startListening((transcript) => {
        setIsListening(false);

        if (transcript.startsWith('ERROR:')) {
          const errorMsg = transcript.replace('ERROR: ', '');
          setError(errorMsg);
          if (onError) onError(errorMsg);
        } else {
          onTranscript(transcript);
        }
      });
    }
  };

  if (!stt) {
    return null; // Hide button if not supported
  }

  return (
    <div className="relative">
      <motion.button
        type="button"
        onClick={handleToggleListening}
        className={`flex items-center gap-2 p-2 rounded-lg transition-all ${
          isListening
            ? 'bg-red-500 text-white hover:bg-red-600 animate-pulse'
            : 'bg-green-600 text-white hover:bg-green-700'
        } ${className}`}
        whileTap={{ scale: 0.95 }}
        title={isListening ? 'Stop listening' : 'Click to speak'}
      >
        {isListening ? (
          <>
            <motion.div
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ repeat: Infinity, duration: 1 }}
            >
              <Mic size={size} />
            </motion.div>
            {showLabel && <span className="text-sm font-medium">Listening...</span>}
          </>
        ) : (
          <>
            <Mic size={size} />
            {showLabel && <span className="text-sm font-medium">{label}</span>}
          </>
        )}
      </motion.button>

      {error && (
        <div className="absolute top-full mt-2 left-0 right-0 bg-red-50 border border-red-200 rounded-lg p-2 text-xs text-red-800 z-10 whitespace-nowrap">
          {error}
        </div>
      )}

      {isListening && (
        <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full animate-ping" />
      )}
    </div>
  );
}
