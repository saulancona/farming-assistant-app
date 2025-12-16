import { useTranslation } from 'react-i18next';
import { Globe, Volume2 } from 'lucide-react';
import { speak } from '../utils/simpleVoice';

const languages = [
  { code: 'en', name: 'English', nativeName: 'English', flag: '🇬🇧' },
  { code: 'fr', name: 'French', nativeName: 'Français', flag: '🇫🇷' },
  { code: 'sw', name: 'Swahili', nativeName: 'Kiswahili', flag: '🇰🇪' },
  { code: 'ha', name: 'Hausa', nativeName: 'Hausa', flag: '🇳🇬' },
  { code: 'am', name: 'Amharic', nativeName: 'አማርኛ', flag: '🇪🇹' }
];

// Test phrases in each language
const testPhrases: Record<string, string> = {
  en: 'Welcome to AgroAfrica. Your farming assistant is ready to help you grow better crops.',
  fr: 'Bienvenue sur AgroAfrica. Votre assistant agricole est prêt à vous aider à cultiver de meilleures récoltes.',
  sw: 'Karibu AgroAfrica. Msaidizi wako wa kilimo uko tayari kukusaidia kupanda mazao bora.',
  ha: 'Barka da zuwa AgroAfrica. Mataimakinka na noma yana shirye ya taimaka maka ka girka amfanin gona mafi kyau.',
  am: 'እንኳን ወደ አግሮአፍሪካ በደህና መጡ። የእርሻ ረዳትዎ የተሻሉ ሰብሎችን እንዲያብቡ ለመርዳት ዝግጁ ነው።'
};

export default function LanguageSelector() {
  const { i18n, t } = useTranslation();

  const handleLanguageChange = (languageCode: string) => {
    i18n.changeLanguage(languageCode);

    // Force reload voices for new language
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel(); // Stop any current speech

      // Force browser to reload voice list by triggering the event
      const voices = window.speechSynthesis.getVoices();
      if (voices.length === 0) {
        // Voices not loaded yet, wait for them
        window.speechSynthesis.onvoiceschanged = () => {
          window.speechSynthesis.getVoices();
        };
      }

      // Dispatch a custom event to notify components that language changed
      window.dispatchEvent(new CustomEvent('languageChanged', { detail: { language: languageCode } }));
    }
  };

  const testVoice = () => {
    const phrase = testPhrases[i18n.language] || testPhrases.en;
    speak(phrase);
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center gap-2 mb-4">
        <Globe className="text-green-600" size={24} />
        <h2 className="text-xl font-semibold text-gray-900">
          {t('settings.language')}
        </h2>
      </div>

      <p className="text-sm text-gray-600 mb-4">
        {t('settings.selectLanguage')}
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {languages.map((language) => (
          <button
            key={language.code}
            onClick={() => handleLanguageChange(language.code)}
            className={`
              flex items-center gap-3 p-4 rounded-lg border-2 transition-all
              ${
                i18n.language === language.code
                  ? 'border-green-600 bg-green-50'
                  : 'border-gray-200 hover:border-green-300 hover:bg-gray-50'
              }
            `}
          >
            <span className="text-3xl">{language.flag}</span>
            <div className="flex-1 text-left">
              <div className="font-medium text-gray-900">
                {language.nativeName}
              </div>
              <div className="text-sm text-gray-500">{language.name}</div>
            </div>
            {i18n.language === language.code && (
              <div className="w-3 h-3 rounded-full bg-green-600"></div>
            )}
          </button>
        ))}
      </div>

      {/* Test Voice Button */}
      <div className="mt-4">
        <button
          onClick={testVoice}
          className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
        >
          <Volume2 size={20} />
          <span>{t('settings.testVoice', 'Test Voice in Selected Language')}</span>
        </button>
      </div>

      <div className="mt-4 p-3 bg-blue-50 rounded-lg">
        <p className="text-sm text-blue-800">
          <strong>{t('common.note', 'Note')}:</strong> {t('settings.languageNote', 'Voice input and output will automatically adapt to your selected language. Click "Test Voice" to hear a sample.')}
        </p>
      </div>
    </div>
  );
}
