// Global Voice Control Component
// Provides a floating button to stop voice playback at any time
import { useState, useEffect } from 'react';
import { VolumeX } from 'lucide-react';
import { stopSpeaking } from '../utils/simpleVoice';

export default function VoiceControl() {
  const [isSpeaking, setIsSpeaking] = useState(false);

  useEffect(() => {
    // Listen for speech synthesis events
    const checkSpeaking = () => {
      if ('speechSynthesis' in window) {
        setIsSpeaking(window.speechSynthesis.speaking);
      }
    };

    // Check every 500ms if speech is active
    const interval = setInterval(checkSpeaking, 500);

    return () => clearInterval(interval);
  }, []);

  const handleStop = () => {
    stopSpeaking();
    setIsSpeaking(false);
  };

  // Only show the button when speech is active
  if (!isSpeaking) return null;

  return (
    <div className="fixed bottom-6 right-6 z-50">
      <button
        onClick={handleStop}
        className="flex items-center gap-2 px-6 py-4 bg-red-600 text-white rounded-full shadow-lg hover:bg-red-700 transition-all transform hover:scale-105 animate-pulse"
        title="Stop reading"
      >
        <VolumeX size={24} />
        <span className="font-semibold">Stop Reading</span>
      </button>
    </div>
  );
}
