import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Bot, User, Loader, Trash2, MessageCircle, Plus, Edit2, Check, X, Menu, Volume2, Mic } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { sendMessageToGemini, type ChatMessage, type FarmContext } from '../services/gemini';
import { speak, listen } from '../utils/simpleVoice';
import { useAuth } from '../contexts/AuthContext';
import {
  useChatConversations,
  useCreateConversation,
  useUpdateConversation,
  useDeleteConversation,
} from '../hooks/useChatConversations';
import ConfirmDialog from './ConfirmDialog';

export default function FarmingChat() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const userId = user?.id;

  // Supabase hooks for conversation management
  const { data: conversations = [], isLoading: isLoadingConversations } = useChatConversations(userId);
  const createConversationMutation = useCreateConversation();
  const updateConversationMutation = useUpdateConversation();
  const deleteConversationMutation = useDeleteConversation();

  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [editingTitle, setEditingTitle] = useState<string | null>(null);
  const [editTitleValue, setEditTitleValue] = useState('');
  const [showSidebar, setShowSidebar] = useState(true);
  const [isListening, setIsListening] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<{ show: boolean; conversationId: string | null }>({ show: false, conversationId: null });
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Load the most recent conversation when conversations are loaded
  useEffect(() => {
    if (conversations.length > 0 && !currentConversationId) {
      const mostRecent = conversations[0];
      setCurrentConversationId(mostRecent.id);
      setMessages(mostRecent.messages || []);
    }
  }, [conversations, currentConversationId]);

  // Get location from settings for context
  const getLocation = () => {
    try {
      const savedSettings = localStorage.getItem('farmSettings');
      if (savedSettings) {
        const settings = JSON.parse(savedSettings);
        return {
          city: settings.farmLocation?.split(',')[0]?.trim() || 'Unknown',
          country: settings.farmLocation?.split(',')[1]?.trim() || 'Unknown'
        };
      }
    } catch (error) {
      console.error('Error getting location:', error);
    }
    return null;
  };

  // Get weather data from localStorage
  const getWeatherData = () => {
    try {
      const weatherDataStr = localStorage.getItem('weatherData');
      if (weatherDataStr) {
        const weatherData = JSON.parse(weatherDataStr);
        if (weatherData.current) {
          return {
            temperature: weatherData.current.temp,
            condition: weatherData.current.condition,
            humidity: weatherData.current.humidity,
            rainfall: undefined
          };
        }
      }
    } catch (error) {
      console.error('Error getting weather data:', error);
    }
    return null;
  };

  // Build complete farm context
  const getFarmContext = (): FarmContext => {
    const now = new Date();
    const months = ['January', 'February', 'March', 'April', 'May', 'June',
                    'July', 'August', 'September', 'October', 'November', 'December'];

    return {
      location: getLocation(),
      currentDate: now.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }),
      currentMonth: months[now.getMonth()],
      weather: getWeatherData()
    };
  };

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const createNewConversation = async () => {
    if (!userId) return;

    try {
      const newConv = await createConversationMutation.mutateAsync({
        userId,
        title: t('chat.newConversation', 'New Conversation'),
        messages: [],
      });
      setCurrentConversationId(newConv.id);
      setMessages([]);
    } catch (error) {
      console.error('Error creating conversation:', error);
    }
  };

  const loadConversation = (id: string) => {
    const conv = conversations.find(c => c.id === id);
    if (conv) {
      setCurrentConversationId(id);
      setMessages(conv.messages || []);
    }
  };

  const handleDeleteConversation = async (id: string) => {
    if (!userId) return;

    try {
      await deleteConversationMutation.mutateAsync({ conversationId: id, userId });

      if (currentConversationId === id) {
        const remaining = conversations.filter(c => c.id !== id);
        if (remaining.length > 0) {
          loadConversation(remaining[0].id);
        } else {
          setCurrentConversationId(null);
          setMessages([]);
        }
      }
    } catch (error) {
      console.error('Error deleting conversation:', error);
    }
  };

  const startEditTitle = (id: string, currentTitle: string) => {
    setEditingTitle(id);
    setEditTitleValue(currentTitle);
  };

  const saveTitle = async (id: string) => {
    if (!userId || !editTitleValue.trim()) {
      setEditingTitle(null);
      return;
    }

    try {
      await updateConversationMutation.mutateAsync({
        conversationId: id,
        userId,
        title: editTitleValue.trim(),
      });
    } catch (error) {
      console.error('Error updating title:', error);
    }
    setEditingTitle(null);
  };

  const cancelEditTitle = () => {
    setEditingTitle(null);
    setEditTitleValue('');
  };

  const handleVoiceInput = () => {
    if (isListening || isLoading) return;

    setIsListening(true);
    const recognition = listen(
      (transcript) => {
        setInputMessage(prev => prev ? `${prev} ${transcript}` : transcript);
        setIsListening(false);
      },
      (error) => {
        console.error('Voice input error:', error);
        setIsListening(false);
      }
    );

    if (recognition) {
      setTimeout(() => {
        if (isListening) {
          recognition.stop();
          setIsListening(false);
        }
      }, 10000);
    }
  };

  const saveConversation = useCallback(async (
    conversationId: string,
    newMessages: ChatMessage[],
    title?: string
  ) => {
    if (!userId) return;

    try {
      await updateConversationMutation.mutateAsync({
        conversationId,
        userId,
        messages: newMessages,
        title,
      });
    } catch (error) {
      console.error('Error saving conversation:', error);
    }
  }, [userId, updateConversationMutation]);

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || isLoading || !userId) return;

    const userMessage = inputMessage.trim();
    setInputMessage('');
    setIsLoading(true);

    // Create new conversation if none exists
    let conversationId = currentConversationId;
    if (!conversationId) {
      try {
        const autoTitle = userMessage.slice(0, 50) + (userMessage.length > 50 ? '...' : '');
        const newConv = await createConversationMutation.mutateAsync({
          userId,
          title: autoTitle,
          messages: [],
        });
        conversationId = newConv.id;
        setCurrentConversationId(newConv.id);
      } catch (error) {
        console.error('Error creating conversation:', error);
        setIsLoading(false);
        return;
      }
    }

    // Add user message to chat
    const newMessages: ChatMessage[] = [...messages, { role: 'user', content: userMessage }];
    setMessages(newMessages);

    // Auto-title conversation based on first message (if it's still the default title)
    const currentConv = conversations.find(c => c.id === conversationId);
    const shouldAutoTitle = newMessages.length === 1 &&
      currentConv?.title === t('chat.newConversation', 'New Conversation');

    const autoTitle = shouldAutoTitle
      ? userMessage.slice(0, 50) + (userMessage.length > 50 ? '...' : '')
      : undefined;

    // Save user message immediately
    await saveConversation(conversationId, newMessages, autoTitle);

    try {
      const context = getFarmContext();
      const response = await sendMessageToGemini(userMessage, messages, context);

      // Add AI response to chat
      const finalMessages: ChatMessage[] = [...newMessages, { role: 'assistant', content: response }];
      setMessages(finalMessages);

      // Save complete conversation with AI response
      await saveConversation(conversationId, finalMessages);
    } catch (error) {
      console.error('Error sending message:', error);
      const errorMessages: ChatMessage[] = [
        ...newMessages,
        {
          role: 'assistant',
          content: t('chat.error', "I'm having trouble processing your request right now. Please check your internet connection and try again.")
        }
      ];
      setMessages(errorMessages);

      // Save error response too
      await saveConversation(conversationId, errorMessages);
    } finally {
      setIsLoading(false);
    }
  };

  const suggestedQuestions = [
    t('chat.suggestion1', "What's the best time to plant maize in Kenya?"),
    t('chat.suggestion2', "How do I improve soil fertility naturally?"),
    t('chat.suggestion3', "What are signs of nitrogen deficiency in crops?"),
    t('chat.suggestion4', "How much water does tomato farming need?"),
  ];

  const currentConversation = conversations.find(c => c.id === currentConversationId);

  return (
    <div className="flex h-[calc(100vh-12rem)] gap-4">
      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={deleteConfirm.show}
        title={t('chat.deleteTitle', 'Delete Conversation')}
        message={t('chat.deleteMessage', 'Are you sure you want to delete this conversation? This action cannot be undone.')}
        confirmLabel={t('common.delete', 'Delete')}
        cancelLabel={t('common.cancel', 'Cancel')}
        variant="danger"
        onConfirm={() => {
          if (deleteConfirm.conversationId) {
            handleDeleteConversation(deleteConfirm.conversationId);
          }
          setDeleteConfirm({ show: false, conversationId: null });
        }}
        onCancel={() => setDeleteConfirm({ show: false, conversationId: null })}
      />

      {/* Conversations Sidebar */}
      <AnimatePresence>
        {showSidebar && (
          <motion.div
            initial={{ x: -300, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -300, opacity: 0 }}
            className="w-80 bg-white rounded-xl shadow-md flex flex-col overflow-hidden"
          >
            <div className="p-4 border-b border-gray-200">
              <button
                onClick={createNewConversation}
                disabled={createConversationMutation.isPending}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
              >
                {createConversationMutation.isPending ? (
                  <Loader size={20} className="animate-spin" />
                ) : (
                  <Plus size={20} />
                )}
                {t('chat.newConversation', 'New Conversation')}
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              {isLoadingConversations ? (
                <div className="flex items-center justify-center py-8">
                  <Loader className="animate-spin text-green-600" size={24} />
                </div>
              ) : conversations.length === 0 ? (
                <div className="text-center py-8 text-gray-500 text-sm">
                  {t('chat.noConversations', 'No conversations yet')}
                </div>
              ) : (
                conversations.map((conv) => (
                  <div
                    key={conv.id}
                    className={`p-3 rounded-lg cursor-pointer transition-colors ${
                      currentConversationId === conv.id
                        ? 'bg-green-50 border-2 border-green-500'
                        : 'bg-gray-50 hover:bg-gray-100 border-2 border-transparent'
                    }`}
                  >
                    {editingTitle === conv.id ? (
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={editTitleValue}
                          onChange={(e) => setEditTitleValue(e.target.value)}
                          onKeyPress={(e) => e.key === 'Enter' && saveTitle(conv.id)}
                          className="flex-1 px-2 py-1 text-sm border border-gray-300 rounded"
                          autoFocus
                        />
                        <button
                          onClick={() => saveTitle(conv.id)}
                          className="p-1 text-green-600 hover:bg-green-100 rounded"
                        >
                          <Check size={16} />
                        </button>
                        <button
                          onClick={cancelEditTitle}
                          className="p-1 text-red-600 hover:bg-red-100 rounded"
                        >
                          <X size={16} />
                        </button>
                      </div>
                    ) : (
                      <>
                        <div onClick={() => loadConversation(conv.id)} className="mb-2">
                          <p className="font-medium text-sm text-gray-900 truncate">
                            {conv.title}
                          </p>
                          <p className="text-xs text-gray-500">
                            {new Date(conv.updated_at).toLocaleDateString()}
                          </p>
                          <p className="text-xs text-gray-400">
                            {(conv.messages || []).length} {t('chat.messages', 'messages')}
                          </p>
                        </div>
                        <div className="flex gap-1">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              startEditTitle(conv.id, conv.title);
                            }}
                            className="flex-1 flex items-center justify-center gap-1 px-2 py-1 text-xs text-blue-600 hover:bg-blue-50 rounded"
                          >
                            <Edit2 size={12} />
                            {t('common.edit', 'Rename')}
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setDeleteConfirm({ show: true, conversationId: conv.id });
                            }}
                            className="flex-1 flex items-center justify-center gap-1 px-2 py-1 text-xs text-red-600 hover:bg-red-50 rounded"
                            aria-label={t('chat.deleteConfirm', 'Delete this conversation')}
                          >
                            <Trash2 size={12} />
                            {t('common.delete', 'Delete')}
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                ))
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowSidebar(!showSidebar)}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <Menu size={24} />
            </button>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                {currentConversation?.title || t('chat.assistant', 'AI Farming Assistant')}
              </h1>
              <p className="text-gray-600 mt-1">{t('chat.assistantDesc', 'Get expert advice on crops, soil, weather, and more')}</p>
            </div>
          </div>
        </div>

        {/* Chat Container */}
        <div className="flex-1 bg-white rounded-xl shadow-md flex flex-col overflow-hidden">
          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center">
                <div className="bg-green-100 p-4 rounded-full mb-4">
                  <MessageCircle className="text-green-600" size={48} />
                </div>
                <h2 className="text-xl font-semibold text-gray-900 mb-2">
                  {t('chat.welcome', 'Welcome to Your AI Farming Assistant!')}
                </h2>
                <p className="text-gray-600 mb-6 max-w-md">
                  {t('chat.welcomeDesc', 'Ask me anything about farming, crops, pest management, soil health, irrigation, and more.')}
                </p>

                {/* Suggested Questions */}
                <div className="w-full max-w-2xl">
                  <p className="text-sm font-medium text-gray-700 mb-3">{t('chat.tryAsking', 'Try asking:')}</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {suggestedQuestions.map((question, index) => (
                      <button
                        key={index}
                        onClick={() => setInputMessage(question)}
                        className="p-3 text-left text-sm bg-gray-50 hover:bg-green-50 border border-gray-200 hover:border-green-300 rounded-lg transition-colors"
                      >
                        {question}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <>
                {messages.map((message, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3 }}
                    className={`flex gap-3 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    {message.role === 'assistant' && (
                      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-green-100 flex items-center justify-center">
                        <Bot className="text-green-600" size={18} />
                      </div>
                    )}

                    <div className="flex flex-col gap-2">
                      <div
                        className={`max-w-[70%] rounded-2xl px-4 py-3 ${
                          message.role === 'user'
                            ? 'bg-green-600 text-white'
                            : 'bg-gray-100 text-gray-900'
                        }`}
                      >
                        <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                      </div>
                      {message.role === 'assistant' && (
                        <button
                          onClick={() => speak(message.content)}
                          className="self-start flex items-center gap-1 px-2 py-1 text-xs text-green-600 hover:text-green-700 hover:bg-green-50 rounded transition-colors"
                          title={t('chat.readAloud', 'Read aloud')}
                        >
                          <Volume2 size={14} />
                          {t('chat.readAloud', 'Read Aloud')}
                        </button>
                      )}
                    </div>

                    {message.role === 'user' && (
                      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                        <User className="text-blue-600" size={18} />
                      </div>
                    )}
                  </motion.div>
                ))}

                {isLoading && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex gap-3 justify-start"
                  >
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-green-100 flex items-center justify-center">
                      <Bot className="text-green-600" size={18} />
                    </div>
                    <div className="bg-gray-100 rounded-2xl px-4 py-3">
                      <Loader className="animate-spin text-gray-600" size={18} />
                    </div>
                  </motion.div>
                )}

                <div ref={messagesEndRef} />
              </>
            )}
          </div>

          {/* Input Area */}
          <div className="border-t border-gray-200 p-4 bg-gray-50">
            <div className="flex gap-3">
              <textarea
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage();
                  }
                }}
                placeholder={t('chat.inputPlaceholder', 'Ask about crops, soil, pests, weather, or farming techniques...')}
                rows={2}
                className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 resize-none"
                disabled={isLoading || isListening || !userId}
              />
              <button
                onClick={handleVoiceInput}
                disabled={isLoading || isListening || !userId}
                className={`px-4 py-3 rounded-lg transition-colors flex items-center gap-2 ${
                  isListening
                    ? 'bg-red-600 text-white animate-pulse'
                    : 'bg-blue-600 text-white hover:bg-blue-700'
                } disabled:opacity-50 disabled:cursor-not-allowed`}
                title={isListening ? t('chat.listening', 'Listening...') : t('chat.voiceInput', 'Voice input')}
              >
                <Mic size={20} />
                <span className="hidden sm:inline">{isListening ? t('chat.listening', 'Listening...') : t('chat.voice', 'Voice')}</span>
              </button>
              <button
                onClick={handleSendMessage}
                disabled={!inputMessage.trim() || isLoading || !userId}
                className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {isLoading ? (
                  <Loader className="animate-spin" size={20} />
                ) : (
                  <>
                    <Send size={20} />
                    <span className="hidden sm:inline">{t('chat.send', 'Send')}</span>
                  </>
                )}
              </button>
            </div>
            <p className="text-xs text-gray-500 mt-2">
              {t('chat.inputHint', 'Press Enter to send, Shift+Enter for new line, or click Voice to speak your question')}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
