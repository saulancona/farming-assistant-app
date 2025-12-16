// Talking Button Component
// Buttons that speak their description when hovered/focused for accessibility
import { useState, useRef } from 'react';
import { speak } from '../utils/simpleVoice';
import { useVoice } from '../contexts/VoiceContext';

interface TalkingButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  voiceLabel: string;  // What to say when hovering
  children: React.ReactNode;
}

export default function TalkingButton({ voiceLabel, children, className = '', onMouseEnter, onFocus, ...props }: TalkingButtonProps) {
  const { voiceEnabled } = useVoice();
  const [hasSpoken, setHasSpoken] = useState(false);
  const hoverTimeoutRef = useRef<number | null>(null);

  const handleHover = (e: React.MouseEvent<HTMLButtonElement>) => {
    // Clear any existing timeout
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
    }

    // Wait 500ms before speaking (avoid speaking on quick mouse movements)
    hoverTimeoutRef.current = setTimeout(() => {
      if (voiceEnabled) {
        speak(voiceLabel);
        setHasSpoken(true);
      }
    }, 500);

    // Call original onMouseEnter if provided
    if (onMouseEnter) {
      onMouseEnter(e);
    }
  };

  const handleMouseLeave = () => {
    // Cancel speaking if mouse leaves before timeout
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
    }
  };

  const handleFocus = (e: React.FocusEvent<HTMLButtonElement>) => {
    // Speak immediately on focus (for keyboard navigation)
    if (!hasSpoken && voiceEnabled) {
      speak(voiceLabel);
      setHasSpoken(true);
    }

    // Call original onFocus if provided
    if (onFocus) {
      onFocus(e);
    }
  };

  return (
    <button
      className={className}
      onMouseEnter={handleHover}
      onMouseLeave={handleMouseLeave}
      onFocus={handleFocus}
      aria-label={voiceLabel}
      {...props}
    >
      {children}
    </button>
  );
}
