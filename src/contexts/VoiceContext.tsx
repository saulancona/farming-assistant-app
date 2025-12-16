import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';

interface VoiceContextType {
  voiceEnabled: boolean;
  setVoiceEnabled: (enabled: boolean) => void;
}

const VoiceContext = createContext<VoiceContextType | undefined>(undefined);

export function VoiceProvider({ children }: { children: ReactNode }) {
  // Default to true (voice enabled by default)
  const [voiceEnabled, setVoiceEnabledState] = useState<boolean>(() => {
    const saved = localStorage.getItem('voiceEnabled');
    // If nothing saved, default to true (enabled)
    return saved !== null ? JSON.parse(saved) : true;
  });

  // Save to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('voiceEnabled', JSON.stringify(voiceEnabled));
  }, [voiceEnabled]);

  const setVoiceEnabled = (enabled: boolean) => {
    setVoiceEnabledState(enabled);
  };

  return (
    <VoiceContext.Provider value={{ voiceEnabled, setVoiceEnabled }}>
      {children}
    </VoiceContext.Provider>
  );
}

export function useVoice() {
  const context = useContext(VoiceContext);
  if (context === undefined) {
    throw new Error('useVoice must be used within a VoiceProvider');
  }
  return context;
}
