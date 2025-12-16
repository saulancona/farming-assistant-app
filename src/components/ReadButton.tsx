// Read Button Component
// Small button to read specific content aloud
import { Volume2 } from 'lucide-react';
import { speak } from '../utils/simpleVoice';
import { useVoice } from '../contexts/VoiceContext';

interface ReadButtonProps {
  text: string;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'icon' | 'button';
  className?: string;
}

export default function ReadButton({ text, size = 'sm', variant = 'icon', className = '' }: ReadButtonProps) {
  const { voiceEnabled } = useVoice();

  const handleRead = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent parent click events
    if (voiceEnabled) {
      speak(text);
    }
  };

  const sizeClasses = {
    sm: 'p-1.5',
    md: 'p-2',
    lg: 'p-3'
  };

  const iconSizes = {
    sm: 14,
    md: 18,
    lg: 22
  };

  if (variant === 'icon') {
    return (
      <button
        onClick={handleRead}
        className={`inline-flex items-center justify-center ${sizeClasses[size]} text-blue-600 hover:bg-blue-50 rounded-lg transition-colors ${className}`}
        title="Read aloud"
        aria-label="Read aloud"
      >
        <Volume2 size={iconSizes[size]} />
      </button>
    );
  }

  return (
    <button
      onClick={handleRead}
      className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-sm text-blue-600 hover:bg-blue-50 rounded-lg transition-colors ${className}`}
      title="Read aloud"
    >
      <Volume2 size={16} />
      <span>Read</span>
    </button>
  );
}
