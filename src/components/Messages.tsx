import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { Send, ArrowLeft, Search, MessageCircle, Loader } from 'lucide-react';
import type { Conversation, Message } from '../types';
import TalkingButton from './TalkingButton';
import ReadButton from './ReadButton';
import { useAuth } from '../contexts/AuthContext';
import {
  getConversations,
  getMessages,
  sendMessage as sendMessageToDb,
  markConversationAsRead,
  getUnreadCount
} from '../services/database';

export default function Messages() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [sendingMessage, setSendingMessage] = useState(false);

  // Load conversations on mount
  useEffect(() => {
    loadConversations();
  }, [user]);

  const loadConversations = async () => {
    if (!user) {
      setConversations([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const loadedConversations = await getConversations(user.id);

      // Get unread counts for each conversation
      const conversationsWithCounts = await Promise.all(
        loadedConversations.map(async (conv) => {
          const unreadCount = await getUnreadCount(conv.id, user.id);
          return { ...conv, unreadCount };
        })
      );

      setConversations(conversationsWithCounts);
    } catch (error) {
      console.error('Error loading conversations:', error);
      setConversations([]);
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));

    if (diffInHours < 1) {
      return 'Just now';
    } else if (diffInHours < 24) {
      return `${diffInHours}h ago`;
    } else if (diffInHours < 48) {
      return 'Yesterday';
    } else {
      return date.toLocaleDateString();
    }
  };

  const handleSelectConversation = async (conversation: Conversation) => {
    setSelectedConversation(conversation);

    if (!user) {
      setMessages([]);
      return;
    }

    try {
      // Load messages for this conversation
      const loadedMessages = await getMessages(conversation.id);
      setMessages(loadedMessages);

      // Mark conversation as read
      await markConversationAsRead(conversation.id, user.id);

      // Update local state
      setConversations(conversations.map(c =>
        c.id === conversation.id ? { ...c, unreadCount: 0 } : c
      ));
    } catch (error) {
      console.error('Error loading messages:', error);
      setMessages([]);
    }
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedConversation || !user) return;

    try {
      setSendingMessage(true);

      const message = await sendMessageToDb({
        conversationId: selectedConversation.id,
        senderId: user.id,
        senderName: user.user_metadata?.full_name || user.email || 'You',
        content: newMessage.trim(),
        read: false
      });

      // Add message to local state
      setMessages([...messages, message]);
      setNewMessage('');

      // Update conversation's last message in local state
      setConversations(conversations.map(c =>
        c.id === selectedConversation.id
          ? { ...c, lastMessage: newMessage.trim(), lastMessageAt: message.createdAt }
          : c
      ));
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error('Failed to send message. Please try again.');
    } finally {
      setSendingMessage(false);
    }
  };

  const filteredConversations = conversations.filter(conv =>
    searchQuery === '' ||
    conv.participantNames.some(name =>
      name.toLowerCase().includes(searchQuery.toLowerCase())
    )
  );

  return (
    <div className="h-[calc(100vh-200px)] flex bg-white rounded-xl shadow-md overflow-hidden">
      {/* Conversations List */}
      <div className={`${selectedConversation ? 'hidden md:flex' : 'flex'} flex-col w-full md:w-80 border-r border-gray-200`}>
        {/* Header */}
        <div className="p-4 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900 mb-3">
            {t('messages.title', 'Messages')}
          </h2>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
            <input
              type="text"
              placeholder={t('messages.searchPlaceholder', 'Search conversations...')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 text-sm"
            />
          </div>
        </div>

        {/* Conversations */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex flex-col items-center justify-center h-full p-6">
              <Loader className="text-green-600 animate-spin mb-3" size={32} />
              <p className="text-gray-500 text-sm">{t('common.loading', 'Loading...')}</p>
            </div>
          ) : !user ? (
            <div className="flex flex-col items-center justify-center h-full p-6 text-center">
              <MessageCircle className="text-gray-300 mb-3" size={48} />
              <p className="text-gray-500 text-sm">
                {t('messages.signInRequired', 'Please sign in to view messages')}
              </p>
            </div>
          ) : filteredConversations.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full p-6 text-center">
              <MessageCircle className="text-gray-300 mb-3" size={48} />
              <p className="text-gray-500 text-sm">
                {t('messages.noConversations', 'No conversations yet')}
              </p>
            </div>
          ) : (
            filteredConversations.map((conversation) => {
              const otherPerson = conversation.participantNames.find(name => name !== 'You') || 'Unknown';

              return (
                <TalkingButton
                  key={conversation.id}
                  voiceLabel={`Conversation with ${otherPerson}. ${conversation.unreadCount > 0 ? `${conversation.unreadCount} unread messages` : ''} Last message: ${conversation.lastMessage}`}
                  onClick={() => handleSelectConversation(conversation)}
                  className={`w-full p-4 border-b border-gray-100 hover:bg-gray-50 transition-colors text-left ${
                    selectedConversation?.id === conversation.id ? 'bg-green-50' : ''
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                      <span className="text-green-700 font-semibold text-lg">
                        {otherPerson.charAt(0)}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <h3 className="font-semibold text-gray-900 truncate">{otherPerson}</h3>
                        <span className="text-xs text-gray-500 ml-2 flex-shrink-0">
                          {formatTime(conversation.lastMessageAt)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <p className="text-sm text-gray-600 truncate pr-2">{conversation.lastMessage}</p>
                        {conversation.unreadCount > 0 && (
                          <span className="bg-green-600 text-white text-xs rounded-full px-2 py-0.5 flex-shrink-0">
                            {conversation.unreadCount}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </TalkingButton>
              );
            })
          )}
        </div>
      </div>

      {/* Messages View */}
      {selectedConversation ? (
        <div className="flex-1 flex flex-col">
          {/* Chat Header */}
          <div className="p-4 border-b border-gray-200 bg-white">
            <div className="flex items-center gap-3">
              <TalkingButton
                voiceLabel="Back to conversations"
                onClick={() => setSelectedConversation(null)}
                className="md:hidden p-2 hover:bg-gray-100 rounded-lg"
              >
                <ArrowLeft size={20} />
              </TalkingButton>
              <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
                <span className="text-green-700 font-semibold">
                  {selectedConversation.participantNames.find(n => n !== 'You')?.charAt(0)}
                </span>
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-gray-900">
                  {selectedConversation.participantNames.find(n => n !== 'You')}
                </h3>
                <p className="text-xs text-gray-500">{t('messages.active', 'Active')}</p>
              </div>
              <ReadButton
                text={`Conversation with ${selectedConversation.participantNames.find(n => n !== 'You')}`}
                size="sm"
              />
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 bg-gray-50">
            {messages.map((message, index) => {
              const isCurrentUser = user && message.senderId === user.id;

              return (
                <motion.div
                  key={message.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className={`mb-4 flex ${isCurrentUser ? 'justify-end' : 'justify-start'}`}
                >
                  <div className={`max-w-[70%] ${isCurrentUser ? 'order-2' : 'order-1'}`}>
                    {!isCurrentUser && (
                      <p className="text-xs text-gray-500 mb-1 px-1">{message.senderName}</p>
                    )}
                    <div
                      className={`rounded-2xl px-4 py-2 ${
                        isCurrentUser
                          ? 'bg-green-600 text-white rounded-br-none'
                          : 'bg-white text-gray-900 rounded-bl-none shadow-sm'
                      }`}
                    >
                      <p className="text-sm">{message.content}</p>
                      <p className={`text-xs mt-1 ${isCurrentUser ? 'text-green-100' : 'text-gray-400'}`}>
                        {formatTime(message.createdAt)}
                      </p>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>

          {/* Message Input */}
          <div className="p-4 border-t border-gray-200 bg-white">
            <div className="flex items-end gap-2">
              <textarea
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage();
                  }
                }}
                placeholder={t('messages.typePlaceholder', 'Type a message...')}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 resize-none"
                rows={1}
              />
              <TalkingButton
                voiceLabel="Send message"
                onClick={handleSendMessage}
                disabled={!newMessage.trim() || sendingMessage}
                className={`p-3 rounded-lg transition-colors ${
                  newMessage.trim() && !sendingMessage
                    ? 'bg-green-600 hover:bg-green-700 text-white'
                    : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                }`}
              >
                {sendingMessage ? (
                  <Loader className="animate-spin" size={20} />
                ) : (
                  <Send size={20} />
                )}
              </TalkingButton>
            </div>
          </div>
        </div>
      ) : (
        <div className="hidden md:flex flex-1 items-center justify-center bg-gray-50">
          <div className="text-center">
            <MessageCircle className="mx-auto text-gray-300 mb-4" size={64} />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              {t('messages.selectConversation', 'Select a conversation')}
            </h3>
            <p className="text-gray-500 text-sm">
              {t('messages.selectConversationDesc', 'Choose a conversation from the list to start messaging')}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
