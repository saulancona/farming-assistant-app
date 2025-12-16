import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sprout,
  Globe,
  MapPin,
  Sparkles,
  ChevronRight,
  ChevronLeft,
  Check,
} from 'lucide-react';

const ONBOARDING_COMPLETE_KEY = 'onboardingComplete';

interface OnboardingProps {
  onComplete: () => void;
}

const languages = [
  { code: 'en', name: 'English', flag: '🇬🇧' },
  { code: 'sw', name: 'Kiswahili', flag: '🇰🇪' },
];

const features = [
  {
    icon: '🌾',
    titleKey: 'onboarding.features.fields.title',
    titleDefault: 'Track Your Fields',
    descKey: 'onboarding.features.fields.desc',
    descDefault: 'Monitor crops, track planting dates, and manage harvests',
  },
  {
    icon: '📊',
    titleKey: 'onboarding.features.finances.title',
    titleDefault: 'Manage Finances',
    descKey: 'onboarding.features.finances.desc',
    descDefault: 'Track expenses, income, and see profit analytics',
  },
  {
    icon: '🛒',
    titleKey: 'onboarding.features.market.title',
    titleDefault: 'Access Markets',
    descKey: 'onboarding.features.market.desc',
    descDefault: 'Buy and sell produce, check market prices',
  },
  {
    icon: '🎤',
    titleKey: 'onboarding.features.voice.title',
    titleDefault: 'Voice Assistant',
    descKey: 'onboarding.features.voice.desc',
    descDefault: 'Talk to AgroAfrica in your language for farming advice',
  },
];

export default function Onboarding({ onComplete }: OnboardingProps) {
  const { t, i18n } = useTranslation();
  const [step, setStep] = useState(0);
  const [selectedLanguage, setSelectedLanguage] = useState(i18n.language || 'en');
  const [farmLocation, setFarmLocation] = useState('');

  const totalSteps = 4;

  const handleLanguageSelect = (code: string) => {
    setSelectedLanguage(code);
    i18n.changeLanguage(code);
  };

  const handleNext = () => {
    if (step < totalSteps - 1) {
      setStep(step + 1);
    } else {
      handleComplete();
    }
  };

  const handleBack = () => {
    if (step > 0) {
      setStep(step - 1);
    }
  };

  const handleComplete = () => {
    // Save farm location if provided
    if (farmLocation) {
      const settings = JSON.parse(localStorage.getItem('farmSettings') || '{}');
      settings.farmLocation = farmLocation;
      localStorage.setItem('farmSettings', JSON.stringify(settings));
    }

    // Mark onboarding as complete
    localStorage.setItem(ONBOARDING_COMPLETE_KEY, 'true');
    onComplete();
  };

  const slideVariants = {
    enter: (direction: number) => ({
      x: direction > 0 ? 300 : -300,
      opacity: 0,
    }),
    center: {
      x: 0,
      opacity: 1,
    },
    exit: (direction: number) => ({
      x: direction < 0 ? 300 : -300,
      opacity: 0,
    }),
  };

  const renderStep = () => {
    switch (step) {
      case 0:
        return (
          <div className="text-center px-6">
            <div className="w-24 h-24 bg-primary-100 dark:bg-primary-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
              <Sprout className="w-12 h-12 text-primary-600 dark:text-primary-400" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">
              {t('onboarding.welcome.title', 'Welcome to AgroAfrica')}
            </h1>
            <p className="text-gray-600 dark:text-gray-300 mb-6">
              {t(
                'onboarding.welcome.subtitle',
                'Your smart farming assistant for better harvests and higher profits'
              )}
            </p>
            <div className="flex flex-wrap justify-center gap-2">
              {['🌱', '📈', '🛒', '🎤', '☀️'].map((emoji, i) => (
                <span
                  key={i}
                  className="text-2xl p-2 bg-gray-100 dark:bg-gray-700 rounded-lg"
                >
                  {emoji}
                </span>
              ))}
            </div>
          </div>
        );

      case 1:
        return (
          <div className="px-6">
            <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
              <Globe className="w-8 h-8 text-blue-600 dark:text-blue-400" />
            </div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white text-center mb-2">
              {t('onboarding.language.title', 'Choose Your Language')}
            </h2>
            <p className="text-gray-600 dark:text-gray-300 text-center mb-6">
              {t('onboarding.language.subtitle', 'Select your preferred language')}
            </p>
            <div className="space-y-3">
              {languages.map((lang) => (
                <button
                  key={lang.code}
                  onClick={() => handleLanguageSelect(lang.code)}
                  className={`w-full flex items-center gap-4 p-4 rounded-xl border-2 transition-all min-h-[60px] ${
                    selectedLanguage === lang.code
                      ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                      : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'
                  }`}
                >
                  <span className="text-3xl">{lang.flag}</span>
                  <span className="text-lg font-medium text-gray-900 dark:text-white">
                    {lang.name}
                  </span>
                  {selectedLanguage === lang.code && (
                    <Check className="w-5 h-5 text-primary-600 ml-auto" />
                  )}
                </button>
              ))}
            </div>
          </div>
        );

      case 2:
        return (
          <div className="px-6">
            <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
              <MapPin className="w-8 h-8 text-emerald-600 dark:text-emerald-400" />
            </div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white text-center mb-2">
              {t('onboarding.location.title', 'Where is Your Farm?')}
            </h2>
            <p className="text-gray-600 dark:text-gray-300 text-center mb-6">
              {t(
                'onboarding.location.subtitle',
                'This helps us provide accurate weather and market information'
              )}
            </p>
            <div className="space-y-4">
              <input
                type="text"
                value={farmLocation}
                onChange={(e) => setFarmLocation(e.target.value)}
                placeholder={t('onboarding.location.placeholder', 'e.g., Nairobi, Kenya')}
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
              <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
                {t('onboarding.location.skip', 'You can skip this and set it later in Settings')}
              </p>
            </div>
          </div>
        );

      case 3:
        return (
          <div className="px-6">
            <div className="w-16 h-16 bg-amber-100 dark:bg-amber-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
              <Sparkles className="w-8 h-8 text-amber-600 dark:text-amber-400" />
            </div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white text-center mb-2">
              {t('onboarding.features.title', 'What You Can Do')}
            </h2>
            <p className="text-gray-600 dark:text-gray-300 text-center mb-4">
              {t('onboarding.features.subtitle', 'Explore powerful features')}
            </p>
            <div className="grid gap-3">
              {features.map((feature, index) => (
                <div
                  key={index}
                  className="flex items-start gap-3 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg"
                >
                  <span className="text-2xl">{feature.icon}</span>
                  <div>
                    <h3 className="font-medium text-gray-900 dark:text-white text-sm">
                      {t(feature.titleKey, feature.titleDefault)}
                    </h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {t(feature.descKey, feature.descDefault)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="fixed inset-0 bg-white dark:bg-gray-900 z-50 flex flex-col">
      {/* Progress indicator */}
      <div className="p-4">
        <div className="flex gap-2 justify-center">
          {Array.from({ length: totalSteps }).map((_, i) => (
            <div
              key={i}
              className={`h-1.5 rounded-full transition-all ${
                i <= step
                  ? 'w-8 bg-primary-500'
                  : 'w-2 bg-gray-200 dark:bg-gray-700'
              }`}
            />
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 flex items-center justify-center overflow-hidden">
        <AnimatePresence mode="wait" custom={1}>
          <motion.div
            key={step}
            custom={1}
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.3, ease: 'easeInOut' }}
            className="w-full max-w-md"
          >
            {renderStep()}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Navigation */}
      <div className="p-6 safe-area-bottom">
        <div className="flex gap-3">
          {step > 0 && (
            <button
              onClick={handleBack}
              className="flex-1 flex items-center justify-center gap-2 py-4 px-6 border border-gray-300 dark:border-gray-600 rounded-xl text-gray-700 dark:text-gray-300 font-medium min-h-[56px]"
            >
              <ChevronLeft className="w-5 h-5" />
              {t('onboarding.back', 'Back')}
            </button>
          )}
          <button
            onClick={handleNext}
            className="flex-1 flex items-center justify-center gap-2 py-4 px-6 bg-primary-600 hover:bg-primary-700 text-white rounded-xl font-medium min-h-[56px]"
          >
            {step === totalSteps - 1 ? (
              <>
                {t('onboarding.getStarted', 'Get Started')}
                <Sparkles className="w-5 h-5" />
              </>
            ) : (
              <>
                {t('onboarding.next', 'Next')}
                <ChevronRight className="w-5 h-5" />
              </>
            )}
          </button>
        </div>

        {step < totalSteps - 1 && (
          <button
            onClick={handleComplete}
            className="w-full mt-3 py-2 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
          >
            {t('onboarding.skipAll', 'Skip onboarding')}
          </button>
        )}
      </div>
    </div>
  );
}

// Export helper to check if onboarding is complete
export function isOnboardingComplete(): boolean {
  return localStorage.getItem(ONBOARDING_COMPLETE_KEY) === 'true';
}

// Export helper to reset onboarding (useful for testing)
export function resetOnboarding(): void {
  localStorage.removeItem(ONBOARDING_COMPLETE_KEY);
}
