// Voice-Enabled Input Component
// Combines text input with voice input capability
import { forwardRef } from 'react';
import VoiceButton from './VoiceButton';

interface VoiceInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  onVoiceInput?: (transcript: string) => void;
  showVoiceButton?: boolean;
}

const VoiceInput = forwardRef<HTMLInputElement, VoiceInputProps>(
  (
    {
      label,
      onVoiceInput,
      showVoiceButton = true,
      className = '',
      onChange,
      value,
      ...props
    },
    ref
  ) => {
    const handleVoiceTranscript = (transcript: string) => {
      // Update input with voice transcript
      const newValue = transcript;

      // Call both callbacks
      if (onVoiceInput) {
        onVoiceInput(transcript);
      }

      // Create synthetic event for onChange
      if (onChange) {
        const syntheticEvent = {
          target: { value: newValue },
          currentTarget: { value: newValue },
        } as React.ChangeEvent<HTMLInputElement>;
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
        <div className="relative flex gap-2">
          <input
            ref={ref}
            value={value}
            onChange={onChange}
            className={`flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 ${className}`}
            {...props}
          />
          {showVoiceButton && (
            <VoiceButton
              onTranscript={handleVoiceTranscript}
              size={20}
              className="flex-shrink-0"
            />
          )}
        </div>
      </div>
    );
  }
);

VoiceInput.displayName = 'VoiceInput';

export default VoiceInput;
