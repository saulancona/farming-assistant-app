import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mic, MicOff, X, RotateCcw, Globe } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { supabase } from '../lib/supabase';
import { fetchWithRetry } from '../utils/retry';
import { getVoiceErrorMessage } from '../utils/errorMessages';
import * as db from '../services/database';
import { useQueryClient } from '@tanstack/react-query';

interface VoiceAssistantProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string | undefined;
}

interface VoiceCommand {
  type: 'field' | 'expense' | 'income' | 'task' | 'task_complete' | 'inventory' | 'storage' | 'delete' | 'question' | 'unknown';
  data: any;
  rawText: string;
  questionType?: string;
  deleteType?: string;
}

type VoiceLanguage = 'en' | 'sw' | 'ha' | 'am';

export default function VoiceAssistant({ isOpen, onClose, userId }: VoiceAssistantProps) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  // Voice state
  const [isListening, setIsListening] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [status, setStatus] = useState('Tap to speak');
  const [lastCommand, setLastCommand] = useState('');
  const [lastResponse, setLastResponse] = useState('');
  const [language, setLanguage] = useState<VoiceLanguage>('en');

  // Refs
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const synthRef = useRef<SpeechSynthesis | null>(null);

  // Initialize speech synthesis
  useEffect(() => {
    synthRef.current = window.speechSynthesis;
  }, []);

  // Translate text to the selected language
  const translate = async (text: string, targetLang: VoiceLanguage): Promise<string> => {
    if (targetLang === 'en') return text;

    try {
      const languageNames: Record<string, string> = {
        'sw': 'Swahili',
        'ha': 'Hausa',
        'am': 'Amharic'
      };

      const prompt = `Translate the following English text to ${languageNames[targetLang]}.
IMPORTANT: Convert ALL numbers to their word form in ${languageNames[targetLang]}.
Return ONLY the translation with numbers as words, no explanations:

${text}`;

      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      const response = await fetch('/api/parse-command', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ text, prompt })
      });

      if (!response.ok) throw new Error('Translation failed');

      const data = await response.json();
      return data.response.trim();
    } catch (error) {
      console.error('Translation error:', error);
      return text;
    }
  };

  // Text-to-speech
  const speak = async (text: string) => {
    if (synthRef.current) {
      const translatedText = await translate(text, language);

      const utterance = new SpeechSynthesisUtterance(translatedText);
      utterance.rate = 0.9;
      utterance.pitch = 1;

      const languageCodes: Record<VoiceLanguage, string> = {
        'en': 'en-US',
        'sw': 'sw-KE',
        'ha': 'ha-NG',
        'am': 'am-ET'
      };
      utterance.lang = languageCodes[language];

      synthRef.current.speak(utterance);
      setLastResponse(translatedText);
    }
  };

  // Repeat last response
  const repeatLastResponse = () => {
    if (lastResponse && synthRef.current) {
      const utterance = new SpeechSynthesisUtterance(lastResponse);
      utterance.rate = 0.9;
      synthRef.current.speak(utterance);
    }
  };

  // Toggle recording
  const toggleListening = async () => {
    if (!userId) {
      setStatus('Please sign in first');
      return;
    }

    if (isListening) {
      // Stop recording
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
        mediaRecorderRef.current.stop();
        setStatus('Processing...');
      }
    } else {
      // Start recording
      try {
        setTranscript('');
        audioChunksRef.current = [];

        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const mediaRecorder = new MediaRecorder(stream);
        mediaRecorderRef.current = mediaRecorder;

        mediaRecorder.ondataavailable = (event) => {
          if (event.data.size > 0) {
            audioChunksRef.current.push(event.data);
          }
        };

        mediaRecorder.onstop = async () => {
          stream.getTracks().forEach(track => track.stop());
          const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });

          try {
            setIsProcessing(true);

            // Convert to base64
            const reader = new FileReader();
            reader.readAsDataURL(audioBlob);
            await new Promise(resolve => reader.onloadend = resolve);
            const audioBase64 = (reader.result as string).split(',')[1];

            // Get auth token
            const { data: { session } } = await supabase.auth.getSession();
            const token = session?.access_token;

            // Call transcribe API
            const response = await fetchWithRetry('/api/transcribe', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
              },
              body: JSON.stringify({ audioBase64 })
            }, {
              maxRetries: 2,
              onRetry: (_error, attempt) => {
                setStatus(`Retrying transcription (${attempt}/2)...`);
              }
            });

            const data = await response.json();
            setTranscript(data.text);

            if (data.text.trim()) {
              await processVoiceCommand(data.text);
            } else {
              setStatus('No speech detected');
              speak('I didn\'t hear anything. Please try again.');
              setTimeout(() => setStatus('Tap to speak'), 2000);
            }
          } catch (error: any) {
            console.error('Transcription error:', error);
            const errorMessage = getVoiceErrorMessage(error);
            setStatus('Failed to transcribe');
            speak(errorMessage);
            setTimeout(() => setStatus('Tap to speak'), 3000);
          } finally {
            setIsListening(false);
            setIsProcessing(false);
          }
        };

        mediaRecorder.start();
        setIsListening(true);
        setStatus('Recording... (tap when done)');
      } catch (error) {
        console.error('Microphone access error:', error);
        setStatus('Microphone access denied');
        setTimeout(() => setStatus('Tap to speak'), 2000);
      }
    }
  };

  // Parse voice command using AI
  const parseVoiceCommand = async (text: string): Promise<VoiceCommand> => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      const today = new Date().toISOString().split('T')[0];
      const tomorrow = new Date(Date.now() + 24*60*60*1000).toISOString().split('T')[0];
      const nextWeek = new Date(Date.now() + 7*24*60*60*1000).toISOString().split('T')[0];
      const harvest90Days = new Date(Date.now() + 90*24*60*60*1000).toISOString().split('T')[0];

      const prompt = `You are a farming assistant. Parse this voice command into JSON.

CRITICAL RULES (IN ORDER OF PRIORITY):

🚨 HIGHEST PRIORITY - TASK DETECTION:
If input contains: "task", "add task", "create task", "remind", "reminder", "todo"
→ It is ALWAYS a TASK, even if it mentions "plant", "water", "harvest"
→ "Add task to plant maize" = TASK (NOT a field!)

1. If input contains question words (what/how/show/tell/which), it's a QUESTION
2. If input contains "remove" or "delete", it's a DELETION
3. FIELD CREATION only when user uses PAST TENSE: "I planted", "I grew"
4. Today is ${today}

DATE PARSING FOR TASKS:
- "December 17" → 2025-12-17
- "tomorrow" → ${tomorrow}
- "next week" → ${nextWeek}

Examples:
"I planted maize in field 1" → {"type":"field","data":{"name":"Field 1","cropType":"Maize","area":1,"plantingDate":"${today}","expectedHarvest":"${harvest90Days}","status":"planted"}}

"Add expense 5000 for fertilizer" → {"type":"expense","data":{"category":"fertilizer","description":"Fertilizer purchase","amount":5000,"date":"${today}"}}

"I sold maize for 10000" → {"type":"income","data":{"source":"harvest_sale","description":"Sold maize","amount":10000,"date":"${today}"}}

"Add task to plant maize december 17" → {"type":"task","data":{"title":"Plant maize","description":"Plant maize","dueDate":"2025-12-17","priority":"medium","status":"pending"}}

"Remind me to water crops tomorrow" → {"type":"task","data":{"title":"Water crops","description":"Water crops","dueDate":"${tomorrow}","priority":"medium","status":"pending"}}

"What crops have I planted?" → {"type":"question","data":null,"questionType":"crops"}

"How much have I spent?" → {"type":"question","data":null,"questionType":"expenses"}

"What's the weather?" → {"type":"question","data":null,"questionType":"weather"}

"Delete field 1" → {"type":"delete","deleteType":"field","data":{"identifier":"Field 1"}}

Now parse: "${text}"

JSON only:`;

      const response = await fetch('/api/parse-command', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ text, prompt })
      });

      if (!response.ok) throw new Error('AI parsing failed');

      const data = await response.json();
      let jsonText = data.response.trim();

      // Extract JSON from response
      if (jsonText.includes('```')) {
        const match = jsonText.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
        if (match) jsonText = match[1];
      }

      const jsonMatch = jsonText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return { ...parsed, rawText: text };
      }
    } catch (error) {
      console.error('AI parsing error:', error);
    }

    return simpleCommandParser(text);
  };

  // Fallback simple parser
  const simpleCommandParser = (text: string): VoiceCommand => {
    const lowerText = text.toLowerCase();

    // Check for task keywords FIRST
    if (lowerText.includes('task') || lowerText.includes('remind') || lowerText.includes('todo')) {
      let title = text
        .replace(/add\s+task\s+to\s+/i, '')
        .replace(/remind\s+me\s+to\s+/i, '')
        .replace(/\s+on\s+\w+\s+\d+.*$/i, '')
        .trim();
      title = title.charAt(0).toUpperCase() + title.slice(1);

      return {
        type: 'task',
        data: {
          title,
          description: title,
          dueDate: new Date(Date.now() + 24*60*60*1000).toISOString().split('T')[0],
          priority: 'medium',
          status: 'pending'
        },
        rawText: text
      };
    }

    // Check for questions
    if (lowerText.includes('what') || lowerText.includes('how') || lowerText.includes('show')) {
      if (lowerText.includes('weather')) {
        return { type: 'question', data: null, rawText: text, questionType: 'weather' };
      }
      if (lowerText.includes('crop') || lowerText.includes('field')) {
        return { type: 'question', data: null, rawText: text, questionType: 'crops' };
      }
      if (lowerText.includes('expense') || lowerText.includes('spent')) {
        return { type: 'question', data: null, rawText: text, questionType: 'expenses' };
      }
      return { type: 'question', data: null, rawText: text, questionType: 'advice' };
    }

    return { type: 'unknown', data: null, rawText: text };
  };

  // Process the parsed command
  const processVoiceCommand = async (text: string) => {
    setStatus('Understanding...');
    setLastCommand(text);

    const command = await parseVoiceCommand(text);
    console.log('Parsed command:', command);

    try {
      switch (command.type) {
        case 'field':
          await saveField(command.data);
          break;
        case 'expense':
          await saveExpense(command.data);
          break;
        case 'income':
          await saveIncome(command.data);
          break;
        case 'task':
          await saveTask(command.data);
          break;
        case 'question':
          await answerQuestion(command.questionType || 'advice', text);
          break;
        case 'delete':
          await handleDelete(command.deleteType!, command.data.identifier);
          break;
        default:
          setStatus('Command not understood');
          speak('I didn\'t understand that command. Try saying something like "I planted maize in field 1" or "Add task to water crops tomorrow".');
      }
    } catch (error) {
      console.error('Command processing error:', error);
      setStatus('Error processing command');
      speak('Sorry, there was an error processing your command. Please try again.');
    }

    setTimeout(() => setStatus('Tap to speak'), 3000);
  };

  // Save functions
  const saveField = async (data: any) => {
    await db.addField(data);
    queryClient.invalidateQueries({ queryKey: ['fields', userId] });
    setStatus('Field recorded!');
    speak(`Great! I've recorded ${data.cropType} in ${data.name}.`);
  };

  const saveExpense = async (data: any) => {
    await db.addExpense(data);
    queryClient.invalidateQueries({ queryKey: ['expenses', userId] });
    setStatus('Expense recorded!');
    speak(`Recorded expense of ${data.amount} for ${data.category}.`);
  };

  const saveIncome = async (data: any) => {
    await db.addIncome(data);
    queryClient.invalidateQueries({ queryKey: ['income', userId] });
    setStatus('Income recorded!');
    speak(`Recorded income of ${data.amount}.`);
  };

  const saveTask = async (data: any) => {
    await db.addTask(data);
    queryClient.invalidateQueries({ queryKey: ['tasks', userId] });
    setStatus('Task created!');
    speak(`I've created a task: ${data.title}.`);
  };

  const handleDelete = async (type: string, identifier: string) => {
    // For now, just acknowledge - full implementation would search and delete
    setStatus(`Deletion noted`);
    speak(`I would delete ${type} "${identifier}", but please use the app to confirm deletions for safety.`);
  };

  const answerQuestion = async (questionType: string, _rawText: string) => {
    setStatus('Looking up...');

    try {
      switch (questionType) {
        case 'weather': {
          // Get weather from localStorage if available
          const weatherData = localStorage.getItem('weatherData');
          if (weatherData) {
            const weather = JSON.parse(weatherData);
            speak(`It's currently ${Math.round(weather.temperature)} degrees and ${weather.description}.`);
          } else {
            speak('I don\'t have weather data right now. Please check the Weather tab.');
          }
          break;
        }
        case 'crops':
        case 'fields': {
          const { data: fields } = await supabase
            .from('fields')
            .select('*')
            .eq('user_id', userId);

          if (!fields || fields.length === 0) {
            speak('You haven\'t recorded any crops yet. Try saying: I planted maize in field 1.');
          } else {
            const cropList = fields.map((f: any) => `${f.crop_type} in ${f.name}`).join(', ');
            speak(`You are growing: ${cropList}.`);
          }
          break;
        }
        case 'expenses': {
          const { data: expenses } = await supabase
            .from('expenses')
            .select('amount')
            .eq('user_id', userId);

          if (!expenses || expenses.length === 0) {
            speak('You haven\'t recorded any expenses yet.');
          } else {
            const total = expenses.reduce((sum: number, e: any) => sum + e.amount, 0);
            speak(`Your total expenses are ${total}.`);
          }
          break;
        }
        case 'tasks': {
          const { data: tasks } = await supabase
            .from('tasks')
            .select('*')
            .eq('user_id', userId)
            .eq('status', 'pending');

          if (!tasks || tasks.length === 0) {
            speak('You have no pending tasks.');
          } else {
            speak(`You have ${tasks.length} pending tasks.`);
          }
          break;
        }
        default:
          speak('I can answer questions about your crops, expenses, tasks, and weather. What would you like to know?');
      }
    } catch (error) {
      console.error('Error answering question:', error);
      speak('Sorry, I couldn\'t look that up. Please try again.');
    }

    setStatus('Tap to speak');
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-gradient-to-br from-green-600 via-green-700 to-emerald-800"
      >
        {/* Header */}
        <div className="absolute top-0 left-0 right-0 p-4 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Globe className="text-white/80" size={20} />
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value as VoiceLanguage)}
              className="bg-white/20 text-white border-0 rounded-lg px-3 py-1 text-sm focus:ring-2 focus:ring-white/50"
            >
              <option value="en">English</option>
              <option value="sw">Kiswahili</option>
              <option value="ha">Hausa</option>
              <option value="am">Amharic</option>
            </select>
          </div>

          <button
            onClick={onClose}
            className="p-2 bg-white/20 rounded-full hover:bg-white/30 transition-colors"
          >
            <X className="text-white" size={24} />
          </button>
        </div>

        {/* Main Content */}
        <div className="flex flex-col items-center justify-center h-full px-6">
          {/* Status */}
          <motion.p
            key={status}
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-white/90 text-xl mb-8 text-center"
          >
            {status}
          </motion.p>

          {/* Microphone Button */}
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={toggleListening}
            disabled={isProcessing}
            className={`w-40 h-40 rounded-full flex items-center justify-center shadow-2xl transition-all ${
              isListening
                ? 'bg-red-500 animate-pulse'
                : isProcessing
                ? 'bg-yellow-500'
                : 'bg-white hover:scale-105'
            }`}
          >
            {isProcessing ? (
              <div className="w-12 h-12 border-4 border-white border-t-transparent rounded-full animate-spin" />
            ) : isListening ? (
              <MicOff className="text-white" size={64} />
            ) : (
              <Mic className="text-green-600" size={64} />
            )}
          </motion.button>

          {/* Transcript */}
          {transcript && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-8 bg-white/20 backdrop-blur rounded-xl p-4 max-w-md"
            >
              <p className="text-white/60 text-sm mb-1">{t('voiceAssistant.youSaid', 'You said:')}</p>
              <p className="text-white text-lg">"{transcript}"</p>
            </motion.div>
          )}

          {/* Last Command */}
          {lastCommand && !transcript && (
            <div className="mt-8 text-center">
              <p className="text-white/60 text-sm mb-1">{t('voiceAssistant.lastCommand', 'Last command:')}</p>
              <p className="text-white/80">"{lastCommand}"</p>
            </div>
          )}

          {/* Repeat Button */}
          {lastResponse && (
            <button
              onClick={repeatLastResponse}
              className="mt-6 flex items-center gap-2 px-4 py-2 bg-white/20 rounded-full text-white hover:bg-white/30 transition-colors"
            >
              <RotateCcw size={18} />
              <span>{t('voiceAssistant.repeatResponse', 'Repeat Response')}</span>
            </button>
          )}
        </div>

        {/* Help Text */}
        <div className="absolute bottom-0 left-0 right-0 p-6 text-center">
          <p className="text-white/70 text-sm">
            {t('voiceAssistant.helpText', 'Try saying: "I planted maize in field 1" or "Add task to water crops tomorrow"')}
          </p>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
