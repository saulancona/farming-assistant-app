// Page Reader Component
// Automatically reads page content and provides a Read Aloud button
import { useEffect } from 'react';
import { Volume2 } from 'lucide-react';
import { speak } from '../utils/simpleVoice';

interface PageReaderProps {
  title: string;
  description?: string;
  autoRead?: boolean;  // Auto-read on page load
}

export default function PageReader({ title, description, autoRead = false }: PageReaderProps) {
  useEffect(() => {
    if (autoRead) {
      // Auto-read the page title and description when component mounts
      const timeout = setTimeout(() => {
        const text = description
          ? `${title}. ${description}`
          : title;
        speak(text);
      }, 500); // Small delay to let page render

      return () => clearTimeout(timeout);
    }
  }, [title, description, autoRead]);

  const handleReadPage = () => {
    const text = description
      ? `${title}. ${description}`
      : title;
    speak(text);
  };

  return (
    <button
      onClick={handleReadPage}
      className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
      title="Read page aloud"
    >
      <Volume2 size={18} />
      <span>Read Page</span>
    </button>
  );
}
