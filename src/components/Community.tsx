import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import {
  MessageCircle,
  ThumbsUp,
  Share2,
  Search,
  Plus,
  Users,
  BookOpen,
  Award,
  Send,
  X,
  Mail,
  MoreVertical,
  Edit3,
  Trash2
} from 'lucide-react';
import type { CommunityPost } from '../types';
import TalkingButton from './TalkingButton';
import ReadButton from './ReadButton';
import { useAuth } from '../contexts/AuthContext';
import {
  getCommunityPosts,
  addCommunityPost,
  updateCommunityPost,
  deleteCommunityPost,
  likeCommunityPost,
  unlikeCommunityPost,
  hasUserLikedPost
} from '../services/database';
import { useUpdateChallengeProgress } from '../hooks/useChallenges';

export default function Community() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const updateChallengeProgress = useUpdateChallengeProgress();
  const [activeTab, setActiveTab] = useState<'forum' | 'knowledge' | 'stories'>('forum');
  const [posts, setPosts] = useState<CommunityPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showNewPostModal, setShowNewPostModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [editingPost, setEditingPost] = useState<CommunityPost | null>(null);
  const [postMenuOpen, setPostMenuOpen] = useState<string | null>(null);

  // New post form state
  const [newPostType, setNewPostType] = useState<'question' | 'tip' | 'success_story' | 'discussion'>('question');
  const [newPostTitle, setNewPostTitle] = useState('');
  const [newPostContent, setNewPostContent] = useState('');
  const [newPostTags, setNewPostTags] = useState('');

  // Edit post form state
  const [editPostType, setEditPostType] = useState<'question' | 'tip' | 'success_story' | 'discussion'>('question');
  const [editPostTitle, setEditPostTitle] = useState('');
  const [editPostContent, setEditPostContent] = useState('');
  const [editPostTags, setEditPostTags] = useState('');

  const categories = [
    { id: 'all', label: t('common.all', 'All'), icon: MessageCircle },
    { id: 'question', label: t('community.questions', 'Questions'), icon: MessageCircle },
    { id: 'tip', label: t('community.tips', 'Tips'), icon: BookOpen },
    { id: 'success_story', label: t('community.stories', 'Success Stories'), icon: Award },
    { id: 'discussion', label: t('community.discussions', 'Discussions'), icon: Users }
  ];

  // Load posts on mount and when category changes
  useEffect(() => {
    loadPosts();
  }, [selectedCategory]);

  const loadPosts = async () => {
    try {
      setLoading(true);
      const filterType = selectedCategory === 'all' ? undefined : selectedCategory;
      let loadedPosts = await getCommunityPosts(filterType);

      // Check which posts the current user has liked
      if (user) {
        const postsWithLikes = await Promise.all(
          loadedPosts.map(async (post) => {
            const isLiked = await hasUserLikedPost(post.id, user.id);
            return { ...post, isLiked };
          })
        );
        setPosts(postsWithLikes);
      } else {
        setPosts(loadedPosts);
      }
    } catch (error) {
      console.error('Error loading posts:', error);
      setPosts([]);
    } finally {
      setLoading(false);
    }
  };

  const handleLike = async (postId: string) => {
    if (!user) {
      toast.error('Please sign in to like posts');
      return;
    }

    const post = posts.find(p => p.id === postId);
    if (!post) return;

    try {
      if (post.isLiked) {
        await unlikeCommunityPost(postId, user.id);
        setPosts(posts.map(p => {
          if (p.id === postId) {
            return {
              ...p,
              likesCount: p.likesCount - 1,
              isLiked: false
            };
          }
          return p;
        }));
      } else {
        await likeCommunityPost(postId, user.id);
        setPosts(posts.map(p => {
          if (p.id === postId) {
            return {
              ...p,
              likesCount: p.likesCount + 1,
              isLiked: true
            };
          }
          return p;
        }));
      }
    } catch (error) {
      console.error('Error toggling like:', error);
      toast.error('Failed to update like. Please try again.');
    }
  };

  const handleCreatePost = async () => {
    if (!user) {
      toast.error('Please sign in to create posts');
      return;
    }

    if (!newPostTitle.trim() || !newPostContent.trim()) {
      toast.error('Please fill in title and content');
      return;
    }

    try {
      const tags = newPostTags.split(',').map(tag => tag.trim()).filter(tag => tag);

      const newPost = await addCommunityPost({
        authorId: user.id,
        authorName: user.user_metadata?.full_name || user.email || 'Anonymous',
        authorAvatar: user.user_metadata?.avatar_url,
        type: newPostType,
        title: newPostTitle.trim(),
        content: newPostContent.trim(),
        tags
      });

      // Add the new post to the list
      setPosts([newPost, ...posts]);

      // Update weekly challenge progress (target_action: 'community_post')
      updateChallengeProgress.mutate({
        userId: user.id,
        action: 'community_post',
      });

      // Reset form and close modal
      setNewPostTitle('');
      setNewPostContent('');
      setNewPostTags('');
      setNewPostType('question');
      setShowNewPostModal(false);
    } catch (error) {
      console.error('Error creating post:', error);
      toast.error('Failed to create post. Please try again.');
    }
  };

  const handleEditPost = (post: CommunityPost) => {
    setEditingPost(post);
    setEditPostType(post.type);
    setEditPostTitle(post.title);
    setEditPostContent(post.content);
    setEditPostTags(post.tags?.join(', ') || '');
    setShowEditModal(true);
    setPostMenuOpen(null);
  };

  const handleUpdatePost = async () => {
    if (!editingPost || !user) return;

    if (!editPostTitle.trim() || !editPostContent.trim()) {
      toast.error('Please fill in title and content');
      return;
    }

    try {
      const tags = editPostTags.split(',').map(tag => tag.trim()).filter(tag => tag);

      await updateCommunityPost(editingPost.id, {
        type: editPostType,
        title: editPostTitle.trim(),
        content: editPostContent.trim(),
        tags
      });

      // Update local state
      setPosts(posts.map(p =>
        p.id === editingPost.id
          ? { ...p, type: editPostType, title: editPostTitle.trim(), content: editPostContent.trim(), tags }
          : p
      ));

      toast.success('Post updated successfully');
      setShowEditModal(false);
      setEditingPost(null);
    } catch (error) {
      console.error('Error updating post:', error);
      toast.error('Failed to update post. Please try again.');
    }
  };

  const handleDeleteClick = (post: CommunityPost) => {
    setEditingPost(post);
    setShowDeleteConfirm(true);
    setPostMenuOpen(null);
  };

  const handleDeletePost = async () => {
    if (!editingPost) return;

    try {
      await deleteCommunityPost(editingPost.id);
      setPosts(posts.filter(p => p.id !== editingPost.id));
      toast.success('Post deleted successfully');
      setShowDeleteConfirm(false);
      setEditingPost(null);
    } catch (error) {
      console.error('Error deleting post:', error);
      toast.error('Failed to delete post. Please try again.');
    }
  };

  const filteredPosts = posts.filter(post => {
    const matchesSearch = searchQuery === '' ||
      post.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      post.content.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSearch;
  });

  const formatDate = (dateString: string) => {
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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
          <p className="mt-2 text-gray-600">{t('common.loading', 'Loading...')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            {t('navigation.community', 'Community')}
          </h1>
          <p className="text-gray-600 mt-1">
            {t('community.subtitle', 'Connect with farmers, share knowledge, and learn together')}
          </p>
        </div>
        <TalkingButton
          voiceLabel="Create New Post. Click to share your question, tip, or success story with the community."
          onClick={() => setShowNewPostModal(true)}
          className="flex items-center gap-2 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors shadow-md"
        >
          <Plus size={20} />
          {t('community.newPost', 'New Post')}
        </TalkingButton>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-gray-200">
        {[
          { id: 'forum', label: t('community.forum', 'Forum') },
          { id: 'knowledge', label: t('community.knowledge', 'Knowledge Base') },
          { id: 'stories', label: t('community.successStories', 'Success Stories') }
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`px-6 py-3 font-medium transition-colors ${
              activeTab === tab.id
                ? 'text-green-600 border-b-2 border-green-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Search and Filter */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
          <input
            type="text"
            placeholder={t('community.searchPlaceholder', 'Search posts...')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
          />
        </div>
        <div className="flex gap-2 overflow-x-auto pb-2">
          {categories.map((category) => (
            <button
              key={category.id}
              onClick={() => setSelectedCategory(category.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg whitespace-nowrap transition-colors ${
                selectedCategory === category.id
                  ? 'bg-green-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <category.icon size={16} />
              {category.label}
            </button>
          ))}
        </div>
      </div>

      {/* Posts List */}
      <div className="space-y-4">
        {filteredPosts.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="bg-white rounded-xl shadow-md p-12 text-center"
          >
            <Users className="mx-auto text-gray-400 mb-4" size={48} />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              {t('community.noPosts', 'No posts found')}
            </h3>
            <p className="text-gray-600">
              {t('community.noPostsDesc', 'Be the first to start a conversation!')}
            </p>
          </motion.div>
        ) : (
          filteredPosts.map((post, index) => (
            <motion.div
              key={post.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="bg-white rounded-xl shadow-md p-6 hover:shadow-lg transition-shadow"
            >
              {/* Post Header */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-start gap-3 flex-1">
                  <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                    {post.authorAvatar ? (
                      <img src={post.authorAvatar} alt={post.authorName} className="w-12 h-12 rounded-full" />
                    ) : (
                      <span className="text-green-700 font-semibold">
                        {post.authorName.charAt(0)}
                      </span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-semibold text-gray-900">{post.authorName}</h3>
                      <span className="text-sm text-gray-400">• {formatDate(post.createdAt)}</span>
                    </div>
                    <span className={`inline-block mt-1 px-2 py-0.5 rounded text-xs font-medium ${
                      post.type === 'question' ? 'bg-blue-100 text-blue-700' :
                      post.type === 'tip' ? 'bg-purple-100 text-purple-700' :
                      post.type === 'success_story' ? 'bg-yellow-100 text-yellow-700' :
                      'bg-gray-100 text-gray-700'
                    }`}>
                      {post.type.replace('_', ' ').toUpperCase()}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <ReadButton text={`${post.title}. ${post.content}`} size="sm" />
                  {/* Edit/Delete menu for post author */}
                  {user && post.authorId === user.id && (
                    <div className="relative">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setPostMenuOpen(postMenuOpen === post.id ? null : post.id);
                        }}
                        className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                      >
                        <MoreVertical size={18} className="text-gray-500" />
                      </button>
                      {postMenuOpen === post.id && (
                        <div className="absolute right-0 top-full mt-1 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-10 min-w-[120px]">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleEditPost(post);
                            }}
                            className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
                          >
                            <Edit3 size={14} />
                            {t('common.edit', 'Edit')}
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteClick(post);
                            }}
                            className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                          >
                            <Trash2 size={14} />
                            {t('common.delete', 'Delete')}
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Post Content */}
              <h2 className="text-xl font-semibold text-gray-900 mb-2">{post.title}</h2>
              <p className="text-gray-700 mb-4 line-clamp-3">{post.content}</p>

              {/* Tags */}
              {post.tags && post.tags.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-4">
                  {post.tags.map((tag) => (
                    <span
                      key={tag}
                      className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-full"
                    >
                      #{tag}
                    </span>
                  ))}
                </div>
              )}

              {/* Post Actions */}
              <div className="flex items-center gap-6 pt-4 border-t border-gray-100">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleLike(post.id);
                  }}
                  className={`flex items-center gap-2 transition-colors ${
                    post.isLiked ? 'text-green-600' : 'text-gray-600 hover:text-green-600'
                  }`}
                >
                  <ThumbsUp size={18} fill={post.isLiked ? 'currentColor' : 'none'} />
                  <span className="text-sm font-medium">{post.likesCount}</span>
                </button>
                <button className="flex items-center gap-2 text-gray-600 hover:text-blue-600 transition-colors">
                  <MessageCircle size={18} />
                  <span className="text-sm font-medium">{post.commentsCount}</span>
                </button>
                <TalkingButton
                  voiceLabel={`Send message to ${post.authorName}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    // TODO: Navigate to messages with this user
                    toast(`Message ${post.authorName} - Coming soon!`, { icon: '💬' });
                  }}
                  className="flex items-center gap-2 text-gray-600 hover:text-green-600 transition-colors"
                >
                  <Mail size={18} />
                  <span className="text-sm font-medium">{t('community.message', 'Message')}</span>
                </TalkingButton>
                <button className="flex items-center gap-2 text-gray-600 hover:text-purple-600 transition-colors">
                  <Share2 size={18} />
                  <span className="text-sm font-medium">Share</span>
                </button>
              </div>
            </motion.div>
          ))
        )}
      </div>

      {/* New Post Modal */}
      {showNewPostModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-xl shadow-xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-bold text-gray-900">
                {t('community.createPost', 'Create New Post')}
              </h2>
              <button
                onClick={() => setShowNewPostModal(false)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X size={24} />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('community.postType', 'Post Type')}
                </label>
                <select
                  value={newPostType}
                  onChange={(e) => setNewPostType(e.target.value as any)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                >
                  <option value="question">{t('community.question', 'Question')}</option>
                  <option value="tip">{t('community.tip', 'Tip')}</option>
                  <option value="success_story">{t('community.successStory', 'Success Story')}</option>
                  <option value="discussion">{t('community.discussion', 'Discussion')}</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('community.title', 'Title')}
                </label>
                <input
                  type="text"
                  value={newPostTitle}
                  onChange={(e) => setNewPostTitle(e.target.value)}
                  placeholder={t('community.titlePlaceholder', 'What would you like to share?')}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('community.content', 'Content')}
                </label>
                <textarea
                  rows={6}
                  value={newPostContent}
                  onChange={(e) => setNewPostContent(e.target.value)}
                  placeholder={t('community.contentPlaceholder', 'Share your experience, ask a question, or provide helpful tips...')}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('community.tags', 'Tags')}
                </label>
                <input
                  type="text"
                  value={newPostTags}
                  onChange={(e) => setNewPostTags(e.target.value)}
                  placeholder={t('community.tagsPlaceholder', 'e.g. maize, planting, pest-control')}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                />
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => setShowNewPostModal(false)}
                  className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
                >
                  {t('common.cancel', 'Cancel')}
                </button>
                <button
                  onClick={handleCreatePost}
                  className="flex-1 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium flex items-center justify-center gap-2"
                >
                  <Send size={18} />
                  {t('community.publish', 'Publish')}
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}

      {/* Edit Post Modal */}
      {showEditModal && editingPost && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-xl shadow-xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-bold text-gray-900">
                {t('community.editPost', 'Edit Post')}
              </h2>
              <button
                onClick={() => {
                  setShowEditModal(false);
                  setEditingPost(null);
                }}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X size={24} />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('community.postType', 'Post Type')}
                </label>
                <select
                  value={editPostType}
                  onChange={(e) => setEditPostType(e.target.value as typeof editPostType)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                >
                  <option value="question">{t('community.question', 'Question')}</option>
                  <option value="tip">{t('community.tip', 'Tip')}</option>
                  <option value="success_story">{t('community.successStory', 'Success Story')}</option>
                  <option value="discussion">{t('community.discussion', 'Discussion')}</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('community.title', 'Title')}
                </label>
                <input
                  type="text"
                  value={editPostTitle}
                  onChange={(e) => setEditPostTitle(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('community.content', 'Content')}
                </label>
                <textarea
                  rows={6}
                  value={editPostContent}
                  onChange={(e) => setEditPostContent(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('community.tags', 'Tags')}
                </label>
                <input
                  type="text"
                  value={editPostTags}
                  onChange={(e) => setEditPostTags(e.target.value)}
                  placeholder={t('community.tagsPlaceholder', 'e.g. maize, planting, pest-control')}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                />
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => {
                    setShowEditModal(false);
                    setEditingPost(null);
                  }}
                  className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
                >
                  {t('common.cancel', 'Cancel')}
                </button>
                <button
                  onClick={handleUpdatePost}
                  className="flex-1 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium flex items-center justify-center gap-2"
                >
                  <Edit3 size={18} />
                  {t('common.save', 'Save Changes')}
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && editingPost && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-xl shadow-xl p-6 max-w-md w-full"
          >
            <div className="text-center">
              <div className="mx-auto w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mb-4">
                <Trash2 className="text-red-600" size={24} />
              </div>
              <h2 className="text-xl font-bold text-gray-900 mb-2">
                {t('community.deletePost', 'Delete Post')}
              </h2>
              <p className="text-gray-600 mb-6">
                {t('community.deleteConfirm', 'Are you sure you want to delete this post? This action cannot be undone.')}
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowDeleteConfirm(false);
                    setEditingPost(null);
                  }}
                  className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
                >
                  {t('common.cancel', 'Cancel')}
                </button>
                <button
                  onClick={handleDeletePost}
                  className="flex-1 px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium flex items-center justify-center gap-2"
                >
                  <Trash2 size={18} />
                  {t('common.delete', 'Delete')}
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
