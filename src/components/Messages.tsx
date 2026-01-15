import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import {
  MessageCircle,
  Send,
  Search,
  ArrowLeft,
  User,
  Users,
  Clock,
  Check,
  CheckCheck,
  Plus,
  X,
  Loader,
  Mail,
  MapPin,
  Trash2,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import {
  useConversations,
  useMessages,
  useMessagingOperations,
  useSearchFarmers,
  useUnreadCount,
  useDeleteConversation,
  useMessageSubscription,
  useConversationSubscription,
} from '../hooks/useMessages';
import { useUIStore } from '../store/uiStore';
import TalkingButton from './TalkingButton';
import type { Conversation } from '../types';

export default function Messages() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // UI Store - for pending conversation from other pages
  const pendingConversation = useUIStore((state) => state.pendingConversation);
  const setPendingConversation = useUIStore((state) => state.setPendingConversation);

  // State
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [messageText, setMessageText] = useState('');
  const [showNewChat, setShowNewChat] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [farmerSearchQuery, setFarmerSearchQuery] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);

  // Hooks
  const { data: conversations = [], isLoading: loadingConversations } = useConversations();
  const { data: messages = [], isLoading: loadingMessages } = useMessages(selectedConversation?.id || null);
  const { data: unreadCount = 0 } = useUnreadCount();
  const { data: searchedFarmers = [], isLoading: searchingFarmers } = useSearchFarmers(farmerSearchQuery);
  const { sendMessage, isSending, markAsRead, startConversation, isStartingConversation } = useMessagingOperations();
  const deleteConversationMutation = useDeleteConversation();

  // Real-time subscriptions for instant message updates
  useMessageSubscription(selectedConversation?.id || null);
  useConversationSubscription();

  // Handle pending conversation from other pages (e.g., Community)
  useEffect(() => {
    if (pendingConversation) {
      setSelectedConversation(pendingConversation);
      setPendingConversation(null); // Clear after using
    }
  }, [pendingConversation, setPendingConversation]);

  // Mark messages as read when viewing a conversation
  useEffect(() => {
    if (selectedConversation?.id && user?.id) {
      markAsRead(selectedConversation.id);
    }
  }, [selectedConversation?.id, messages.length]);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Handle delete conversation
  const handleDeleteConversation = async (conversationId: string) => {
    try {
      await deleteConversationMutation.mutateAsync(conversationId);
      if (selectedConversation?.id === conversationId) {
        setSelectedConversation(null);
      }
      setShowDeleteConfirm(null);
    } catch (error) {
      console.error('Failed to delete conversation:', error);
    }
  };

  // Get the other participant's name in a conversation
  const getOtherParticipantName = (conversation: Conversation) => {
    if (!conversation.participantIds || !conversation.participantNames) {
      return t('messages.farmer', 'Farmer');
    }

    // Find the index of the other participant (not the current user)
    const index = conversation.participantIds.findIndex(id => id !== user?.id);

    // If current user is the only one or not found, try to get the other person
    if (index === -1) {
      // Maybe current user is at index 0, get index 1
      return conversation.participantNames[1] || conversation.participantNames[0] || t('messages.farmer', 'Farmer');
    }

    return conversation.participantNames[index] || t('messages.farmer', 'Farmer');
  };

  // Filter conversations by search
  const filteredConversations = conversations.filter(conv => {
    if (!searchQuery) return true;
    const otherName = getOtherParticipantName(conv).toLowerCase();
    return otherName.includes(searchQuery.toLowerCase()) ||
           conv.lastMessage?.toLowerCase().includes(searchQuery.toLowerCase());
  });

  // Format timestamp
  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else if (diffDays === 1) {
      return t('messages.yesterday', 'Yesterday');
    } else if (diffDays < 7) {
      return date.toLocaleDateString([], { weekday: 'short' });
    } else {
      return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    }
  };

  // Handle sending a message
  const handleSend = async () => {
    if (!messageText.trim() || !selectedConversation) return;

    try {
      await sendMessage({
        conversationId: selectedConversation.id,
        content: messageText.trim(),
      });
      setMessageText('');
    } catch (error) {
      console.error('Failed to send message:', error);
    }
  };

  // Handle starting a new conversation
  const handleStartConversation = async (farmer: { id: string; fullName: string }) => {
    try {
      const conv = await startConversation({
        recipientId: farmer.id,
        recipientName: farmer.fullName,
      });
      setSelectedConversation(conv);
      setShowNewChat(false);
      setFarmerSearchQuery('');
    } catch (error) {
      console.error('Failed to start conversation:', error);
    }
  };

  // Handle key press in message input
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  if (!user) {
    return (
      <div className="p-6">
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-6 text-center">
          <Mail className="mx-auto text-yellow-600 mb-3" size={48} />
          <h3 className="text-lg font-semibold text-yellow-800 mb-2">
            {t('messages.signInRequired', 'Sign In Required')}
          </h3>
          <p className="text-yellow-700">
            {t('messages.signInToMessage', 'Please sign in to send and receive messages from other farmers.')}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-180px)] flex flex-col bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {selectedConversation && (
              <TalkingButton
                voiceLabel={t('messages.backToInbox', 'Back to inbox')}
                onClick={() => setSelectedConversation(null)}
                className="lg:hidden p-2 hover:bg-gray-100 rounded-lg"
              >
                <ArrowLeft size={20} />
              </TalkingButton>
            )}
            <div>
              <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <MessageCircle className="text-green-600" size={24} />
                {t('messages.title', 'Messages')}
                {unreadCount > 0 && (
                  <span className="bg-red-500 text-white text-xs px-2 py-0.5 rounded-full">
                    {unreadCount}
                  </span>
                )}
              </h1>
              <p className="text-sm text-gray-600">
                {t('messages.subtitle', 'Chat with other farmers')}
              </p>
            </div>
          </div>
          <TalkingButton
            voiceLabel={t('messages.newChat', 'Start new chat')}
            onClick={() => setShowNewChat(true)}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
          >
            <Plus size={18} />
            <span className="hidden sm:inline">{t('messages.newChat', 'New Chat')}</span>
          </TalkingButton>
        </div>
      </div>

      {/* Main Content - Split View */}
      <div className="flex-1 flex overflow-hidden">
        {/* Conversation List */}
        <div className={`w-full lg:w-1/3 border-r border-gray-200 bg-white flex flex-col ${
          selectedConversation ? 'hidden lg:flex' : 'flex'
        }`}>
          {/* Search */}
          <div className="p-3 border-b border-gray-100">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
              <input
                type="text"
                placeholder={t('messages.searchConversations', 'Search conversations...')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent text-sm"
              />
            </div>
          </div>

          {/* Conversations */}
          <div className="flex-1 overflow-y-auto">
            {loadingConversations ? (
              <div className="flex items-center justify-center py-12">
                <Loader className="animate-spin text-green-600" size={32} />
              </div>
            ) : filteredConversations.length === 0 ? (
              <div className="text-center py-12 px-4">
                <Users className="mx-auto text-gray-300 mb-3" size={48} />
                <p className="text-gray-500">
                  {searchQuery
                    ? t('messages.noSearchResults', 'No conversations found')
                    : t('messages.noConversations', 'No conversations yet')}
                </p>
                <p className="text-sm text-gray-400 mt-1">
                  {t('messages.startChatPrompt', 'Start a new chat to connect with farmers!')}
                </p>
              </div>
            ) : (
              filteredConversations.map((conv) => {
                const otherName = getOtherParticipantName(conv);
                const isActive = selectedConversation?.id === conv.id;
                const hasUnread = (conv.unreadCount || 0) > 0;

                return (
                  <div key={conv.id} className="relative group">
                    <motion.button
                      whileHover={{ backgroundColor: 'rgba(34, 197, 94, 0.05)' }}
                      onClick={() => setSelectedConversation(conv)}
                      className={`w-full p-4 flex items-start gap-3 border-b border-gray-50 text-left transition-colors ${
                        isActive ? 'bg-green-50 border-l-4 border-l-green-500' : ''
                      }`}
                    >
                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-green-400 to-green-600 flex items-center justify-center text-white font-bold text-lg flex-shrink-0">
                        {otherName.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <h3 className={`font-medium truncate ${hasUnread ? 'text-gray-900' : 'text-gray-700'}`}>
                            {otherName}
                          </h3>
                          <span className="text-xs text-gray-400 flex-shrink-0">
                            {formatTime(conv.lastMessageAt)}
                          </span>
                        </div>
                        <p className={`text-sm truncate mt-0.5 ${hasUnread ? 'text-gray-800 font-medium' : 'text-gray-500'}`}>
                          {conv.lastMessage || t('messages.noMessages', 'No messages yet')}
                        </p>
                      </div>
                      {hasUnread && (
                        <span className="bg-green-500 text-white text-xs px-2 py-0.5 rounded-full flex-shrink-0">
                          {conv.unreadCount}
                        </span>
                      )}
                    </motion.button>
                    {/* Delete button - shows on hover */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowDeleteConfirm(conv.id);
                      }}
                      className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                      title={t('messages.deleteConversation', 'Delete conversation')}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Chat View */}
        <div className={`flex-1 flex flex-col bg-gray-50 ${
          selectedConversation ? 'flex' : 'hidden lg:flex'
        }`}>
          {selectedConversation ? (
            <>
              {/* Chat Header */}
              <div className="bg-white border-b border-gray-200 p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-green-400 to-green-600 flex items-center justify-center text-white font-bold">
                  {getOtherParticipantName(selectedConversation).charAt(0).toUpperCase()}
                </div>
                <div className="flex-1">
                  <h2 className="font-semibold text-gray-900">
                    {getOtherParticipantName(selectedConversation)}
                  </h2>
                  <p className="text-xs text-gray-500">
                    {t('messages.farmer', 'Farmer')}
                  </p>
                </div>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {loadingMessages ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader className="animate-spin text-green-600" size={32} />
                  </div>
                ) : messages.length === 0 ? (
                  <div className="text-center py-12">
                    <MessageCircle className="mx-auto text-gray-300 mb-3" size={48} />
                    <p className="text-gray-500">
                      {t('messages.startConversation', 'Start the conversation!')}
                    </p>
                  </div>
                ) : (
                  messages.map((msg) => {
                    const isOwn = msg.senderId === user?.id;

                    return (
                      <motion.div
                        key={msg.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}
                      >
                        <div className={`max-w-[75%] ${isOwn ? 'order-2' : 'order-1'}`}>
                          <div
                            className={`px-4 py-2 rounded-2xl ${
                              isOwn
                                ? 'bg-green-600 text-white rounded-br-md'
                                : 'bg-white text-gray-800 border border-gray-200 rounded-bl-md'
                            }`}
                          >
                            <p className="whitespace-pre-wrap break-words">{msg.content}</p>
                          </div>
                          <div className={`flex items-center gap-1 mt-1 text-xs text-gray-400 ${isOwn ? 'justify-end' : ''}`}>
                            <Clock size={12} />
                            <span>{formatTime(msg.createdAt)}</span>
                            {isOwn && (
                              msg.read ? (
                                <CheckCheck size={14} className="text-blue-500" />
                              ) : (
                                <Check size={14} />
                              )
                            )}
                          </div>
                        </div>
                      </motion.div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Message Input */}
              <div className="bg-white border-t border-gray-200 p-4">
                <div className="flex items-end gap-3">
                  <div className="flex-1 relative">
                    <textarea
                      value={messageText}
                      onChange={(e) => setMessageText(e.target.value)}
                      onKeyDown={handleKeyPress}
                      placeholder={t('messages.typePlaceholder', 'Type a message...')}
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent resize-none"
                      rows={1}
                      style={{ minHeight: '48px', maxHeight: '120px' }}
                    />
                  </div>
                  <TalkingButton
                    voiceLabel={t('messages.send', 'Send message')}
                    onClick={handleSend}
                    disabled={!messageText.trim() || isSending}
                    className={`p-3 rounded-xl transition-colors ${
                      messageText.trim() && !isSending
                        ? 'bg-green-600 text-white hover:bg-green-700'
                        : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    }`}
                  >
                    {isSending ? (
                      <Loader className="animate-spin" size={20} />
                    ) : (
                      <Send size={20} />
                    )}
                  </TalkingButton>
                </div>
              </div>
            </>
          ) : (
            // No conversation selected
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <MessageCircle className="text-gray-400" size={48} />
                </div>
                <h3 className="text-lg font-medium text-gray-700 mb-2">
                  {t('messages.selectConversation', 'Select a conversation')}
                </h3>
                <p className="text-gray-500 max-w-sm">
                  {t('messages.selectOrStartNew', 'Choose a conversation from the list or start a new chat with a farmer.')}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {showDeleteConfirm && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-xl shadow-xl w-full max-w-sm p-6"
            >
              <div className="text-center">
                <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Trash2 className="text-red-600" size={24} />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  {t('messages.deleteConfirmTitle', 'Delete Conversation?')}
                </h3>
                <p className="text-gray-600 mb-6">
                  {t('messages.deleteConfirmMessage', 'This will permanently delete this conversation and all messages. This action cannot be undone.')}
                </p>
                <div className="flex gap-3">
                  <button
                    onClick={() => setShowDeleteConfirm(null)}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    {t('common.cancel', 'Cancel')}
                  </button>
                  <button
                    onClick={() => handleDeleteConversation(showDeleteConfirm)}
                    disabled={deleteConversationMutation.isPending}
                    className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {deleteConversationMutation.isPending ? (
                      <Loader className="animate-spin" size={18} />
                    ) : (
                      <>
                        <Trash2 size={18} />
                        {t('common.delete', 'Delete')}
                      </>
                    )}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* New Chat Modal */}
      <AnimatePresence>
        {showNewChat && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-xl shadow-xl w-full max-w-md max-h-[80vh] flex flex-col"
            >
              {/* Modal Header */}
              <div className="p-4 border-b border-gray-200 flex items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-900">
                  {t('messages.newChatTitle', 'Start New Chat')}
                </h2>
                <button
                  onClick={() => {
                    setShowNewChat(false);
                    setFarmerSearchQuery('');
                  }}
                  className="p-2 hover:bg-gray-100 rounded-lg"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Search Input */}
              <div className="p-4 border-b border-gray-100">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                  <input
                    type="text"
                    placeholder={t('messages.searchFarmers', 'Search farmers by name...')}
                    value={farmerSearchQuery}
                    onChange={(e) => setFarmerSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    autoFocus
                  />
                </div>
              </div>

              {/* Search Results */}
              <div className="flex-1 overflow-y-auto">
                {searchingFarmers ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader className="animate-spin text-green-600" size={32} />
                  </div>
                ) : farmerSearchQuery.length < 2 ? (
                  <div className="text-center py-8 px-4">
                    <Search className="mx-auto text-gray-300 mb-3" size={48} />
                    <p className="text-gray-500">
                      {t('messages.typeToSearch', 'Type at least 2 characters to search')}
                    </p>
                  </div>
                ) : searchedFarmers.length === 0 ? (
                  <div className="text-center py-8 px-4">
                    <User className="mx-auto text-gray-300 mb-3" size={48} />
                    <p className="text-gray-500">
                      {t('messages.noFarmersFound', 'No farmers found')}
                    </p>
                  </div>
                ) : (
                  <div className="divide-y divide-gray-100">
                    {searchedFarmers.map((farmer) => (
                      <button
                        key={farmer.id}
                        onClick={() => handleStartConversation(farmer)}
                        disabled={isStartingConversation}
                        className="w-full p-4 flex items-center gap-3 hover:bg-gray-50 transition-colors text-left"
                      >
                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-green-400 to-green-600 flex items-center justify-center text-white font-bold text-lg">
                          {farmer.fullName?.charAt(0).toUpperCase() || 'U'}
                        </div>
                        <div className="flex-1">
                          <h3 className="font-medium text-gray-900">
                            {farmer.fullName || t('messages.unknownFarmer', 'Unknown Farmer')}
                          </h3>
                          {farmer.location && (
                            <p className="text-sm text-gray-500 flex items-center gap-1">
                              <MapPin size={14} />
                              {farmer.location}
                            </p>
                          )}
                        </div>
                        {isStartingConversation ? (
                          <Loader className="animate-spin text-green-600" size={20} />
                        ) : (
                          <MessageCircle className="text-green-600" size={20} />
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
