// Voice-Enabled Textarea Component
// Combines textarea with voice input capability
import { forwardRef } from 'react';
import VoiceButton from './VoiceButton';

interface VoiceTextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  onVoiceInput?: (transcript: string) => void;
  showVoiceButton?: boolean;
  appendVoice?: boolean; // Append voice input to existing text instead of replacing
}

const VoiceTextarea = forwardRef<HTMLTextAreaElement, VoiceTextareaProps>(
  (
    {
      label,
      onVoiceInput,
      showVoiceButton = true,
      appendVoice = true,
      className = '',
      onChange,
      value,
      ...props
    },
    ref
  ) => {
    const handleVoiceTranscript = (transcript: string) => {
      // Either append or replace text based on appendVoice prop
      const currentValue = (value as string) || '';
      const newValue = appendVoice
        ? (currentValue ? currentValue + ' ' : '') + transcript
        : transcript;

      // Call both callbacks
      if (onVoiceInput) {
        onVoiceInput(transcript);
      }

      // Create synthetic event for onChange
      if (onChange) {
        const syntheticEvent = {
          target: { value: newValue },
          currentTarget: { value: newValue },
        } as React.ChangeEvent<HTMLTextAreaElement>;
        onChange(syntheticEvent);
      }
    };

    return (
      <div className="w-full">
        {label && (
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {label}
          </label>
        )}
        <div className="relative">
          <textarea
            ref={ref}
            value={value}
            onChange={onChange}
            className={`w-full px-4 py-2 pr-14 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 ${className}`}
            {...props}
          />
          {showVoiceButton && (
            <div className="absolute bottom-3 right-3">
              <VoiceButton
                onTranscript={handleVoiceTranscript}
                size={20}
                showLabel={false}
              />
            </div>
          )}
        </div>
        {showVoiceButton && (
          <p className="text-xs text-gray-500 mt-1">
            {appendVoice
              ? 'Click the microphone to add text by voice'
              : 'Click the microphone to input by voice'}
          </p>
        )}
      </div>
    );
  }
);

VoiceTextarea.displayName = 'VoiceTextarea';

export default VoiceTextarea;
