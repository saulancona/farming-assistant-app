import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Mic, X, ChevronUp } from 'lucide-react';

interface VoiceBannerProps {
  onOpenAssistant: () => void;
}

const COLLAPSED_KEY = 'voiceBannerCollapsed';

export default function VoiceBanner({ onOpenAssistant }: VoiceBannerProps) {
  const [isCollapsed, setIsCollapsed] = useState(() => {
    // Default to expanded for new users, check localStorage for preference
    const saved = localStorage.getItem(COLLAPSED_KEY);
    return saved === 'true';
  });

  // Save preference to localStorage
  useEffect(() => {
    localStorage.setItem(COLLAPSED_KEY, String(isCollapsed));
  }, [isCollapsed]);

  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsCollapsed(!isCollapsed);
  };

  if (isCollapsed) {
    // Floating mic button when collapsed
    return (
      <motion.button
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0, opacity: 0 }}
        onClick={onOpenAssistant}
        className="fixed bottom-20 right-4 z-40 w-14 h-14 bg-gradient-to-r from-green-600 to-emerald-600 rounded-full shadow-lg flex items-center justify-center text-white hover:from-green-700 hover:to-emerald-700 transition-all"
        aria-label="Open voice assistant"
      >
        <Mic size={24} />
        {/* Expand button */}
        <button
          onClick={handleToggle}
          className="absolute -top-2 -right-2 w-6 h-6 bg-white rounded-full shadow-md flex items-center justify-center text-gray-600 hover:bg-gray-50"
          aria-label="Expand voice banner"
        >
          <ChevronUp size={14} />
        </button>
      </motion.button>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-gradient-to-r from-green-600 via-emerald-600 to-teal-600 text-white cursor-pointer hover:from-green-700 hover:via-emerald-700 hover:to-teal-700 transition-all relative"
      onClick={onOpenAssistant}
      role="button"
      tabIndex={0}
      aria-label="Open voice assistant. Tap to speak commands like Add expense 5000 for seeds"
      onKeyDown={(e) => e.key === 'Enter' && onOpenAssistant()}
    >
      <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm min-w-[40px]">
            <Mic size={20} />
          </div>
          <div>
            <p className="font-semibold text-sm sm:text-base">Voice Assistant</p>
            <p className="text-xs sm:text-sm text-white/80">
              Tap to speak commands like "Add expense 5000 for seeds"
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="hidden sm:inline text-sm text-white/80">Tap to start</span>
          <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center animate-pulse">
            <Mic size={16} />
          </div>
          {/* Collapse button */}
          <button
            onClick={handleToggle}
            className="ml-2 w-8 h-8 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center transition-colors"
            aria-label="Minimize voice banner"
          >
            <X size={16} />
          </button>
        </div>
      </div>
    </motion.div>
  );
}
