import { useState } from 'react';
import { motion } from 'framer-motion';
import { Camera, Upload, X, AlertTriangle, Check, Loader, Bug, Sprout, Mic, Volume2, Calendar } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { analyzePestWithAI, type PestDiagnosis } from '../services/pestDetection';
import { speak, listen } from '../utils/simpleVoice';
import { compressImage, COMPRESSION_PRESETS, formatBytes } from '../utils/imageCompression';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';

export default function PestControl() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [images, setImages] = useState<string[]>([]);
  const [description, setDescription] = useState('');
  const [cropName, setCropName] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [diagnosis, setDiagnosis] = useState<PestDiagnosis | null>(null);
  const [error, setError] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [isCompressing, setIsCompressing] = useState(false);
  const [compressionStats, setCompressionStats] = useState<string>('');
  const [savedToCalendar, setSavedToCalendar] = useState(false);
  const [isSavingToCalendar, setIsSavingToCalendar] = useState(false);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    setIsCompressing(true);
    setCompressionStats('');
    const fileArray = Array.from(files);

    try {
      // Calculate original total size
      const originalTotalSize = fileArray.reduce((sum, file) => sum + file.size, 0);

      // Compress all images in parallel
      const compressedImages = await Promise.all(
        fileArray.map(file => compressImage(file, COMPRESSION_PRESETS.pestDetection))
      );

      // Calculate compressed size (estimate from base64)
      const compressedTotalSize = compressedImages.reduce((sum, img) => {
        const base64 = img.split(',')[1] || img;
        return sum + Math.round((base64.length * 3) / 4);
      }, 0);

      // Calculate savings
      const savings = originalTotalSize - compressedTotalSize;
      const savingsPercent = ((savings / originalTotalSize) * 100).toFixed(0);

      setImages((prev) => [...prev, ...compressedImages].slice(0, 3));

      // Show compression stats to user
      if (savings > 0) {
        setCompressionStats(
          `✓ Saved ${formatBytes(savings)} (${savingsPercent}% smaller)`
        );
        // Clear stats after 5 seconds
        setTimeout(() => setCompressionStats(''), 5000);
      }
    } catch (err) {
      console.error('Error compressing images:', err);
      // Fallback to uncompressed if compression fails
      const fallbackImages: string[] = [];
      for (const file of fileArray) {
        const dataUrl = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onload = (event) => resolve(event.target?.result as string);
          reader.readAsDataURL(file);
        });
        fallbackImages.push(dataUrl);
      }
      setImages((prev) => [...prev, ...fallbackImages].slice(0, 3));
    } finally {
      setIsCompressing(false);
    }
  };

  const removeImage = (index: number) => {
    setImages((prev) => prev.filter((_, i) => i !== index));
  };

  const handleAnalyze = async () => {
    if (!description.trim() && images.length === 0) {
      setError(t('pest.provideInput', 'Please provide either a description or upload images'));
      return;
    }

    setIsAnalyzing(true);
    setError('');
    setDiagnosis(null);

    try {
      const result = await analyzePestWithAI(description, images, cropName || undefined);
      setDiagnosis(result);

      // Auto-save diagnosis to calendar
      if (user) {
        addDiagnosisToCalendar(result);
      }

      // Auto-read diagnosis if enabled
      // const settings = voiceService.getSettings();
      // if (settings.enabled && settings.autoRead) {
      //   const readText = `Diagnosis complete. Identified issue: ${result.pest}. Severity: ${result.severity}. Treatment: ${result.treatment}`;
      //   setTimeout(() => voiceService.speak(readText), 500);
      // }
    } catch (err) {
      console.error('Error analyzing pest:', err);
      setError(t('pest.analyzeFailed', 'Failed to analyze. Please check your API key configuration.'));
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleReset = () => {
    setImages([]);
    setDescription('');
    setCropName('');
    setDiagnosis(null);
    setError('');
    setSavedToCalendar(false);
  };

  const handleVoiceInput = () => {
    if (isListening || isAnalyzing) return;

    setIsListening(true);
    const recognition = listen(
      (transcript) => {
        // Append transcript to existing description
        setDescription(prev => prev ? `${prev} ${transcript}` : transcript);
        setIsListening(false);
      },
      (error) => {
        console.error('Voice input error:', error);
        setIsListening(false);
      }
    );

    // Stop listening after 10 seconds as a safety measure
    if (recognition) {
      setTimeout(() => {
        if (isListening) {
          recognition.stop();
          setIsListening(false);
        }
      }, 10000);
    }
  };

  const handleReadDiagnosis = () => {
    if (!diagnosis) return;
    // Use translated strings for diagnosis summary
    const diagnosisText = `${t('pest.identifiedIssue', 'Identified Issue')}: ${diagnosis.pest}. ${t('pest.severity', 'Severity')}: ${diagnosis.severity}. ${t('pest.recommendedTreatment', 'Recommended Treatment')}: ${diagnosis.treatment}`;
    speak(diagnosisText);
  };

  const addDiagnosisToCalendar = async (diagnosisData: PestDiagnosis) => {
    if (!user || savedToCalendar || isSavingToCalendar) return;

    setIsSavingToCalendar(true);
    try {
      // Create title and description from diagnosis
      const title = `Pest Diagnosis: ${diagnosisData.pest}`;
      const titleSw = `Uchunguzi wa Wadudu: ${diagnosisData.pest}`;
      const descriptionText = `Treatment: ${diagnosisData.treatment}\n\nPrevention:\n${diagnosisData.prevention.map(tip => `• ${tip}`).join('\n')}`;
      const descriptionSw = `Matibabu: ${diagnosisData.treatment}\n\nKuzuia:\n${diagnosisData.prevention.map(tip => `• ${tip}`).join('\n')}`;

      const { error: logError } = await supabase.rpc('log_calendar_activity', {
        p_user_id: user.id,
        p_activity_type: 'pest_diagnosis',
        p_title: title,
        p_title_sw: titleSw,
        p_description: descriptionText,
        p_description_sw: descriptionSw,
        p_activity_date: new Date().toISOString().split('T')[0],
        p_activity_time: new Date().toTimeString().split(' ')[0].slice(0, 5),
        p_related_id: null,
        p_related_type: 'pest_control',
        p_field_id: null,
        p_field_name: cropName || null,
        p_icon: '🐛',
        p_color: diagnosisData.severity.toLowerCase().includes('high') ? 'red' :
                 diagnosisData.severity.toLowerCase().includes('medium') ? 'orange' : 'green',
        p_metadata: {
          pest: diagnosisData.pest,
          severity: diagnosisData.severity,
          treatment: diagnosisData.treatment,
          prevention: diagnosisData.prevention,
          crop: cropName || null,
          had_images: images.length > 0,
        },
      });

      if (logError) {
        console.error('[PestControl] Error logging to calendar:', logError);
        toast.error(t('pest.calendarError', 'Failed to save to calendar'));
      } else {
        setSavedToCalendar(true);
        toast.success(t('pest.savedToCalendar', 'Diagnosis saved to calendar!'));
      }
    } catch (err) {
      console.error('[PestControl] Error saving to calendar:', err);
      toast.error(t('pest.calendarError', 'Failed to save to calendar'));
    } finally {
      setIsSavingToCalendar(false);
    }
  };

  const getSeverityColor = (severity: string) => {
    const lowerSeverity = severity.toLowerCase();
    if (lowerSeverity.includes('high')) return 'text-red-600 bg-red-100';
    if (lowerSeverity.includes('medium')) return 'text-orange-600 bg-orange-100';
    return 'text-green-600 bg-green-100';
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">{t('pest.diagnosisTitle', 'Pest & Disease Diagnosis')}</h1>
        <p className="text-gray-600 mt-1">{t('pest.diagnosisDesc', 'Upload images or describe symptoms for AI-powered diagnosis')}</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Input Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-xl shadow-md p-6 space-y-6"
        >
          <div className="flex items-center gap-2 mb-4">
            <div className="bg-green-100 p-2 rounded-lg">
              <Bug className="text-green-600" size={20} />
            </div>
            <h2 className="text-xl font-semibold text-gray-900">{t('pest.diagnosisRequest', 'Diagnosis Request')}</h2>
          </div>

          {/* Crop Name Input */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <div className="flex items-center gap-1">
                <Sprout size={16} />
                {t('pest.cropName', 'Crop Name (Optional)')}
              </div>
            </label>
            <input
              type="text"
              value={cropName}
              onChange={(e) => setCropName(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
              placeholder={t('pest.cropNamePlaceholder', 'e.g., Maize, Tomato, Wheat')}
            />
          </div>

          {/* Image Upload */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t('pest.uploadImages', 'Upload Images (Max 3)')}
            </label>
            <div className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${isCompressing ? 'border-blue-300 bg-blue-50' : 'border-gray-300 hover:border-green-500'}`}>
              <input
                type="file"
                accept="image/*"
                multiple
                onChange={handleImageUpload}
                className="hidden"
                id="image-upload"
                disabled={images.length >= 3 || isCompressing}
              />
              <label
                htmlFor="image-upload"
                className={`cursor-pointer ${(images.length >= 3 || isCompressing) ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                {isCompressing ? (
                  <>
                    <Loader className="mx-auto text-blue-500 mb-2 animate-spin" size={32} />
                    <p className="text-sm text-blue-600">{t('pest.compressing', 'Compressing images...')}</p>
                    <p className="text-xs text-blue-500 mt-1">{t('pest.savingData', 'Saving your mobile data')}</p>
                  </>
                ) : (
                  <>
                    <Upload className="mx-auto text-gray-400 mb-2" size={32} />
                    <p className="text-sm text-gray-600">
                      {images.length >= 3 ? t('pest.maxImagesReached', 'Maximum images reached') : t('pest.clickUpload', 'Click to upload or drag and drop')}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">{t('pest.imageFormat', 'PNG, JPG up to 10MB')}</p>
                  </>
                )}
              </label>
            </div>

            {/* Compression Stats */}
            {compressionStats && (
              <p className="text-sm text-green-600 mt-2 flex items-center gap-1">
                {compressionStats}
              </p>
            )}

            {/* Image Preview */}
            {images.length > 0 && (
              <div className="grid grid-cols-3 gap-3 mt-4">
                {images.map((img, index) => (
                  <div key={index} className="relative group">
                    <img
                      src={img}
                      alt={`Upload ${index + 1}`}
                      className="w-full h-24 object-cover rounded-lg"
                    />
                    <button
                      onClick={() => removeImage(index)}
                      className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X size={16} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t('pest.describeProblem', 'Describe the Problem')}
            </label>
            <div className="relative">
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={6}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                placeholder={t('pest.describePlaceholder', 'Describe symptoms: leaf color, spots, wilting, insect appearance, affected areas...')}
                disabled={isListening}
              />
              <button
                onClick={handleVoiceInput}
                disabled={isAnalyzing || isListening}
                className={`absolute bottom-3 right-3 p-2 rounded-lg transition-colors ${
                  isListening
                    ? 'bg-red-600 text-white animate-pulse'
                    : 'bg-blue-600 text-white hover:bg-blue-700'
                } disabled:opacity-50 disabled:cursor-not-allowed`}
                title={isListening ? t('chat.listening', 'Listening...') : t('chat.voiceInput', 'Voice input')}
              >
                <Mic size={18} />
              </button>
            </div>
            {isListening && (
              <p className="text-sm text-blue-600 mt-1">{t('pest.listeningSpeakNow', 'Listening... Speak now')}</p>
            )}
          </div>

          {/* Error Message */}
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-800 rounded-lg text-sm">
              {error}
            </div>
          )}

          {/* Analyze Button */}
          <button
            onClick={handleAnalyze}
            disabled={isAnalyzing || (!description.trim() && images.length === 0)}
            className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isAnalyzing ? (
              <>
                <Loader className="animate-spin" size={20} />
                {t('pest.analyzing', 'Analyzing...')}
              </>
            ) : (
              <>
                <Camera size={20} />
                {t('pest.analyzeCrop', 'Analyze Crop')}
              </>
            )}
          </button>
        </motion.div>

        {/* Results Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white rounded-xl shadow-md p-6"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="bg-blue-100 p-2 rounded-lg">
                <AlertTriangle className="text-blue-600" size={20} />
              </div>
              <h2 className="text-xl font-semibold text-gray-900">{t('pest.resultsTitle', 'Diagnosis Results')}</h2>
            </div>
            {diagnosis && (
              <div className="flex gap-2">
                <button
                  onClick={handleReadDiagnosis}
                  className="flex items-center gap-1 px-3 py-1.5 text-sm text-green-600 hover:text-green-700 hover:bg-green-50 rounded transition-colors"
                  title={t('pest.readAloud', 'Read diagnosis aloud')}
                >
                  <Volume2 size={16} />
                  {t('chat.readAloud', 'Read Aloud')}
                </button>
                {!savedToCalendar && (
                  <button
                    onClick={() => addDiagnosisToCalendar(diagnosis)}
                    disabled={isSavingToCalendar || !user}
                    className="flex items-center gap-1 px-3 py-1.5 text-sm text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    title={t('pest.addToCalendar', 'Add to calendar')}
                  >
                    <Calendar size={16} />
                    {isSavingToCalendar ? t('common.saving', 'Saving...') : t('pest.addToCalendar', 'Add to Calendar')}
                  </button>
                )}
                {savedToCalendar && (
                  <span className="flex items-center gap-1 px-3 py-1.5 text-sm text-green-600">
                    <Check size={16} />
                    {t('pest.savedToCalendar', 'Saved to Calendar')}
                  </span>
                )}
                <button
                  onClick={handleReset}
                  className="text-sm text-gray-600 hover:text-gray-900 underline"
                >
                  {t('pest.newAnalysis', 'New Analysis')}
                </button>
              </div>
            )}
          </div>

          {!diagnosis && !isAnalyzing && (
            <div className="text-center py-12">
              <Bug className="mx-auto text-gray-400 mb-4" size={48} />
              <p className="text-gray-600">{t('pest.uploadPrompt', 'Upload images or describe symptoms to get a diagnosis')}</p>
            </div>
          )}

          {isAnalyzing && (
            <div className="text-center py-12">
              <Loader className="mx-auto text-green-600 animate-spin mb-4" size={48} />
              <p className="text-gray-600">{t('pest.analyzingCrop', 'Analyzing your crop...')}</p>
            </div>
          )}

          {diagnosis && (
            <div className="space-y-6">
              {/* Pest/Disease Identified */}
              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-2">{t('pest.identifiedIssue', 'Identified Issue')}</h3>
                <div className="flex items-start gap-3 p-4 bg-gray-50 rounded-lg">
                  <Bug className="text-red-600 flex-shrink-0 mt-0.5" size={20} />
                  <div className="flex-1">
                    <p className="font-semibold text-gray-900">{diagnosis.pest}</p>
                    <span className={`inline-block mt-2 px-3 py-1 rounded-full text-xs font-medium ${getSeverityColor(diagnosis.severity)}`}>
                      {t('pest.severity', 'Severity')}: {diagnosis.severity}
                    </span>
                  </div>
                </div>
              </div>

              {/* Treatment */}
              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-2">{t('pest.recommendedTreatment', 'Recommended Treatment')}</h3>
                <div className="p-4 bg-blue-50 rounded-lg">
                  <p className="text-sm text-gray-800">{diagnosis.treatment}</p>
                </div>
              </div>

              {/* Prevention Tips */}
              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-2">{t('pest.preventionTips', 'Prevention Tips')}</h3>
                <div className="space-y-2">
                  {diagnosis.prevention.map((tip, index) => (
                    <div key={index} className="flex items-start gap-2">
                      <Check className="text-green-600 flex-shrink-0 mt-0.5" size={16} />
                      <p className="text-sm text-gray-700">{tip}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Disclaimer */}
              <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <p className="text-xs text-yellow-800">
                  <strong>{t('pest.disclaimer', 'Disclaimer')}:</strong> {t('pest.disclaimerText', 'This is an AI-powered diagnosis and should be used as a guide. For critical cases or uncertain diagnoses, please consult with a local agricultural extension officer or plant pathologist.')}
                </p>
              </div>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}
