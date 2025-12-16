import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { BookOpen, Heart, Bookmark, Eye, ArrowLeft, Loader, Search, Sprout, Bug, Droplets, Wheat, TrendingUp, Video } from 'lucide-react';
import DOMPurify from 'dompurify';
import type { KnowledgeArticle, LearningVideo } from '../types';
import TalkingButton from './TalkingButton';
import ReadButton from './ReadButton';
import { useAuth } from '../contexts/AuthContext';
import VideoPlayer, { VideoCard } from './learning/VideoPlayer';
import {
  getKnowledgeArticles,
  getKnowledgeArticle,
  likeKnowledgeArticle,
  unlikeKnowledgeArticle,
  hasUserLikedArticle,
  bookmarkArticle,
  unbookmarkArticle,
  hasUserBookmarkedArticle
} from '../services/database';

// Sample videos for demonstration - these would come from a database in production
const sampleVideos: LearningVideo[] = [
  {
    id: 'v1',
    title: 'Introduction to Sustainable Farming',
    description: 'Learn the basics of sustainable farming practices that can help improve your crop yields while protecting the environment.',
    category: 'general',
    videoUrl: 'https://www.youtube.com/embed/fB8C1pqGLic',
    thumbnailUrl: 'https://images.unsplash.com/photo-1500937386664-56d1dfef3854?w=400',
    duration: '8:30',
    durationSeconds: 510,
    instructor: 'Dr. James Kamau',
    crops: ['maize', 'beans', 'vegetables'],
    language: 'en',
    difficulty: 'beginner',
    views: 1250,
    likes: 89,
    createdAt: new Date().toISOString(),
    tags: ['sustainable', 'basics', 'environment']
  },
  {
    id: 'v2',
    title: 'Pest Control Using Natural Methods',
    description: 'Discover natural and organic methods to control pests without using harmful chemicals on your farm.',
    category: 'pest_control',
    videoUrl: 'https://www.youtube.com/embed/oisPFsCtWcs',
    thumbnailUrl: 'https://images.unsplash.com/photo-1416879595882-3373a0480b5b?w=400',
    duration: '12:45',
    durationSeconds: 765,
    instructor: 'Mary Wanjiku',
    crops: ['tomatoes', 'cabbage', 'kale'],
    language: 'en',
    difficulty: 'intermediate',
    views: 980,
    likes: 67,
    createdAt: new Date().toISOString(),
    tags: ['pest control', 'organic', 'natural']
  },
  {
    id: 'v3',
    title: 'Drip Irrigation Setup Guide',
    description: 'Step-by-step guide to setting up an efficient drip irrigation system for your farm.',
    category: 'irrigation',
    videoUrl: 'https://www.youtube.com/embed/O5yUU2RRDYI',
    thumbnailUrl: 'https://images.unsplash.com/photo-1464226184884-fa280b87c399?w=400',
    duration: '15:20',
    durationSeconds: 920,
    instructor: 'Peter Ochieng',
    crops: ['vegetables', 'fruits'],
    language: 'en',
    difficulty: 'intermediate',
    views: 1420,
    likes: 112,
    createdAt: new Date().toISOString(),
    tags: ['irrigation', 'drip system', 'water saving']
  },
  {
    id: 'v4',
    title: 'Maize Planting Best Practices',
    description: 'Learn the optimal techniques for planting maize to maximize your harvest.',
    category: 'planting',
    videoUrl: 'https://www.youtube.com/embed/fSGMPJ6Jyfw',
    thumbnailUrl: 'https://images.unsplash.com/photo-1471194402529-8e0f5a675de6?w=400',
    duration: '10:15',
    durationSeconds: 615,
    instructor: 'John Mwangi',
    crops: ['maize'],
    language: 'en',
    difficulty: 'beginner',
    views: 2100,
    likes: 156,
    createdAt: new Date().toISOString(),
    tags: ['maize', 'planting', 'best practices']
  },
  {
    id: 'v5',
    title: 'Post-Harvest Handling Techniques',
    description: 'Proper post-harvest handling to minimize losses and maximize profits from your harvest.',
    category: 'harvesting',
    videoUrl: 'https://www.youtube.com/embed/Mjvfq_0LVLg',
    thumbnailUrl: 'https://images.unsplash.com/photo-1500595046743-cd271d694d30?w=400',
    duration: '11:30',
    durationSeconds: 690,
    instructor: 'Grace Akinyi',
    crops: ['grains', 'vegetables'],
    language: 'en',
    difficulty: 'intermediate',
    views: 890,
    likes: 54,
    createdAt: new Date().toISOString(),
    tags: ['post-harvest', 'storage', 'handling']
  },
  {
    id: 'v6',
    title: 'Marketing Your Farm Products',
    description: 'Strategies for effectively marketing and selling your farm products for better prices.',
    category: 'marketing',
    videoUrl: 'https://www.youtube.com/embed/4xEjM1CWXic',
    thumbnailUrl: 'https://images.unsplash.com/photo-1488459716781-31db52582fe9?w=400',
    duration: '14:00',
    durationSeconds: 840,
    instructor: 'Samuel Njoroge',
    crops: [],
    language: 'en',
    difficulty: 'advanced',
    views: 750,
    likes: 48,
    createdAt: new Date().toISOString(),
    tags: ['marketing', 'sales', 'business']
  }
];

type ContentTab = 'articles' | 'videos';

export default function Knowledge() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [contentTab, setContentTab] = useState<ContentTab>('articles');
  const [articles, setArticles] = useState<KnowledgeArticle[]>([]);
  const [selectedArticle, setSelectedArticle] = useState<KnowledgeArticle | null>(null);
  const [selectedVideo, setSelectedVideo] = useState<LearningVideo | null>(null);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [videos] = useState<LearningVideo[]>(sampleVideos);

  const categories = [
    { id: 'all', label: t('knowledge.all', 'All Topics'), icon: BookOpen },
    { id: 'planting', label: t('knowledge.planting', 'Planting'), icon: Sprout },
    { id: 'pest_control', label: t('knowledge.pestControl', 'Pest Control'), icon: Bug },
    { id: 'irrigation', label: t('knowledge.irrigation', 'Irrigation'), icon: Droplets },
    { id: 'harvesting', label: t('knowledge.harvesting', 'Harvesting'), icon: Wheat },
    { id: 'marketing', label: t('knowledge.marketing', 'Marketing'), icon: TrendingUp },
    { id: 'general', label: t('knowledge.general', 'General'), icon: BookOpen }
  ];

  useEffect(() => {
    loadArticles();
  }, [selectedCategory]);

  const loadArticles = async () => {
    try {
      setLoading(true);
      const filterCategory = selectedCategory === 'all' ? undefined : selectedCategory;
      let loadedArticles = await getKnowledgeArticles(filterCategory);

      // Check which articles the current user has liked and bookmarked
      if (user) {
        const articlesWithUserData = await Promise.all(
          loadedArticles.map(async (article) => {
            const isLiked = await hasUserLikedArticle(article.id, user.id);
            const isBookmarked = await hasUserBookmarkedArticle(article.id, user.id);
            return { ...article, isLiked, isBookmarked };
          })
        );
        setArticles(articlesWithUserData);
      } else {
        setArticles(loadedArticles);
      }
    } catch (error) {
      console.error('Error loading articles:', error);
      setArticles([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectArticle = async (article: KnowledgeArticle) => {
    try {
      // Get the full article with incremented view count
      const fullArticle = await getKnowledgeArticle(article.id);

      // Check user interactions
      if (user) {
        const isLiked = await hasUserLikedArticle(fullArticle.id, user.id);
        const isBookmarked = await hasUserBookmarkedArticle(fullArticle.id, user.id);
        setSelectedArticle({ ...fullArticle, isLiked, isBookmarked });
      } else {
        setSelectedArticle(fullArticle);
      }
    } catch (error) {
      console.error('Error loading article:', error);
    }
  };

  const handleLike = async (articleId: string) => {
    if (!user) {
      toast.error(t('common.signInRequired', 'Please sign in to like articles'));
      return;
    }

    const article = articles.find(a => a.id === articleId) || selectedArticle;
    if (!article) return;

    try {
      if (article.isLiked) {
        await unlikeKnowledgeArticle(articleId, user.id);
        updateArticleState(articleId, {
          likes: article.likes - 1,
          isLiked: false
        });
      } else {
        await likeKnowledgeArticle(articleId, user.id);
        updateArticleState(articleId, {
          likes: article.likes + 1,
          isLiked: true
        });
      }
    } catch (error) {
      console.error('Error toggling like:', error);
      toast.error(t('common.error', 'Failed to update like. Please try again.'));
    }
  };

  const handleBookmark = async (articleId: string) => {
    if (!user) {
      toast.error(t('common.signInRequired', 'Please sign in to bookmark articles'));
      return;
    }

    const article = articles.find(a => a.id === articleId) || selectedArticle;
    if (!article) return;

    try {
      if (article.isBookmarked) {
        await unbookmarkArticle(articleId, user.id);
        updateArticleState(articleId, { isBookmarked: false });
      } else {
        await bookmarkArticle(articleId, user.id);
        updateArticleState(articleId, { isBookmarked: true });
      }
    } catch (error) {
      console.error('Error toggling bookmark:', error);
      toast.error(t('common.error', 'Failed to update bookmark. Please try again.'));
    }
  };

  const updateArticleState = (articleId: string, updates: Partial<KnowledgeArticle>) => {
    setArticles(articles.map(a => a.id === articleId ? { ...a, ...updates } : a));
    if (selectedArticle?.id === articleId) {
      setSelectedArticle({ ...selectedArticle, ...updates });
    }
  };

  const filteredArticles = articles.filter(article =>
    searchQuery === '' ||
    article.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    article.content.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Simple markdown-to-html converter for basic formatting
  const renderMarkdown = (content: string) => {
    return content
      .split('\n')
      .map((line, index) => {
        // Headers
        if (line.startsWith('# ')) {
          return <h1 key={index} className="text-2xl font-bold mt-6 mb-3 text-gray-900">{line.substring(2)}</h1>;
        }
        if (line.startsWith('## ')) {
          return <h2 key={index} className="text-xl font-bold mt-5 mb-2 text-gray-900">{line.substring(3)}</h2>;
        }
        if (line.startsWith('### ')) {
          return <h3 key={index} className="text-lg font-semibold mt-4 mb-2 text-gray-900">{line.substring(4)}</h3>;
        }

        // Lists
        if (line.startsWith('- ')) {
          return (
            <li key={index} className="ml-6 mb-1 text-gray-700">
              {line.substring(2)}
            </li>
          );
        }

        // Numbered lists
        const numberedMatch = line.match(/^(\d+)\.\s(.+)$/);
        if (numberedMatch) {
          return (
            <li key={index} className="ml-6 mb-1 text-gray-700" style={{ listStyleType: 'decimal' }}>
              {numberedMatch[2]}
            </li>
          );
        }

        // Bold text **text**
        let processedLine = line.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');

        // Empty lines
        if (line.trim() === '') {
          return <br key={index} />;
        }

        // Sanitize HTML to prevent XSS attacks
        const sanitizedHtml = DOMPurify.sanitize(processedLine, {
          ALLOWED_TAGS: ['strong', 'em', 'b', 'i'],
          ALLOWED_ATTR: []
        });

        // Regular paragraphs
        return (
          <p key={index} className="mb-3 text-gray-700 leading-relaxed" dangerouslySetInnerHTML={{ __html: sanitizedHtml }} />
        );
      });
  };

  // Filter videos by category and search
  const filteredVideos = videos.filter(video => {
    const matchesCategory = selectedCategory === 'all' || video.category === selectedCategory;
    const matchesSearch = searchQuery === '' ||
      video.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      video.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  // If a video is selected, show the video player
  if (selectedVideo) {
    return (
      <div className="max-w-4xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-4"
        >
          <TalkingButton
            voiceLabel="Back to videos"
            onClick={() => setSelectedVideo(null)}
            className="flex items-center gap-2 text-green-600 hover:text-green-700 font-medium mb-4"
          >
            <ArrowLeft size={20} />
            {t('common.back', 'Back')}
          </TalkingButton>

          <VideoPlayer
            video={selectedVideo}
            userId={user?.id}
            onComplete={() => {
              toast.success(t('learning.videoCompleted', 'Video completed! +30 XP'));
            }}
          />
        </motion.div>
      </div>
    );
  }

  if (selectedArticle) {
    return (
      <div className="max-w-4xl mx-auto">
        {/* Article View */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-xl shadow-md overflow-hidden"
        >
          {/* Header */}
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-start justify-between mb-4">
              <TalkingButton
                voiceLabel="Back to articles"
                onClick={() => setSelectedArticle(null)}
                className="flex items-center gap-2 text-green-600 hover:text-green-700 font-medium"
              >
                <ArrowLeft size={20} />
                {t('common.back', 'Back')}
              </TalkingButton>
              <ReadButton
                text={`${selectedArticle.title}. ${selectedArticle.content}`}
                size="sm"
              />
            </div>

            <h1 className="text-3xl font-bold text-gray-900 mb-3">
              {selectedArticle.title}
            </h1>

            <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600">
              <span className="flex items-center gap-1">
                <Eye size={16} />
                {selectedArticle.views} {t('knowledge.views', 'views')}
              </span>
              <span className="flex items-center gap-1">
                <Heart size={16} className={selectedArticle.isLiked ? 'fill-red-500 text-red-500' : ''} />
                {selectedArticle.likes} {t('knowledge.likes', 'likes')}
              </span>
              <span className="text-gray-400">•</span>
              <span>{t('knowledge.by', 'By')} {selectedArticle.author}</span>
            </div>
          </div>

          {/* Content */}
          <div className="p-6">
            <div className="prose max-w-none">
              {renderMarkdown(selectedArticle.content)}
            </div>

            {/* Crops Tags */}
            {selectedArticle.crops && selectedArticle.crops.length > 0 && (
              <div className="mt-8 pt-6 border-t border-gray-200">
                <h3 className="text-sm font-semibold text-gray-700 mb-2">
                  {t('knowledge.relevantCrops', 'Relevant Crops')}:
                </h3>
                <div className="flex flex-wrap gap-2">
                  {selectedArticle.crops.map((crop, index) => (
                    <span
                      key={index}
                      className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm capitalize"
                    >
                      {crop}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Actions Footer */}
          <div className="p-6 bg-gray-50 border-t border-gray-200 flex gap-3">
            <TalkingButton
              voiceLabel={selectedArticle.isLiked ? 'Unlike article' : 'Like article'}
              onClick={() => handleLike(selectedArticle.id)}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg font-medium transition-colors ${
                selectedArticle.isLiked
                  ? 'bg-red-50 text-red-600 hover:bg-red-100'
                  : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-300'
              }`}
            >
              <Heart size={20} className={selectedArticle.isLiked ? 'fill-current' : ''} />
              {selectedArticle.isLiked ? t('knowledge.liked', 'Liked') : t('knowledge.like', 'Like')}
            </TalkingButton>

            <TalkingButton
              voiceLabel={selectedArticle.isBookmarked ? 'Remove bookmark' : 'Bookmark article'}
              onClick={() => handleBookmark(selectedArticle.id)}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg font-medium transition-colors ${
                selectedArticle.isBookmarked
                  ? 'bg-yellow-50 text-yellow-600 hover:bg-yellow-100'
                  : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-300'
              }`}
            >
              <Bookmark size={20} className={selectedArticle.isBookmarked ? 'fill-current' : ''} />
              {selectedArticle.isBookmarked ? t('knowledge.bookmarked', 'Bookmarked') : t('knowledge.bookmark', 'Bookmark')}
            </TalkingButton>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {t('knowledge.title', 'Knowledge Base')}
          </h1>
          <p className="text-gray-600 mt-1">
            {t('knowledge.subtitle', 'Learn farming best practices and techniques')}
          </p>
        </div>
        <ReadButton
          text={t('knowledge.title', 'Knowledge Base')}
          size="sm"
        />
      </div>

      {/* Content Type Tabs - Articles / Videos */}
      <div className="flex gap-2 bg-gray-100 p-1 rounded-lg w-fit">
        <button
          onClick={() => setContentTab('articles')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
            contentTab === 'articles'
              ? 'bg-white text-green-700 shadow-sm'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <BookOpen size={18} />
          {t('knowledge.articles', 'Articles')}
        </button>
        <button
          onClick={() => setContentTab('videos')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
            contentTab === 'videos'
              ? 'bg-white text-green-700 shadow-sm'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <Video size={18} />
          {t('knowledge.videos', 'Videos')}
        </button>
      </div>

      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
        <input
          type="text"
          placeholder={contentTab === 'articles'
            ? t('knowledge.searchPlaceholder', 'Search articles...')
            : t('knowledge.searchVideos', 'Search videos...')
          }
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
        />
      </div>

      {/* Category Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        {categories.map((category) => {
          const Icon = category.icon;
          return (
            <TalkingButton
              key={category.id}
              voiceLabel={`Filter by ${category.label}`}
              onClick={() => setSelectedCategory(category.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium whitespace-nowrap transition-colors ${
                selectedCategory === category.id
                  ? 'bg-green-600 text-white'
                  : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-300'
              }`}
            >
              <Icon size={18} />
              {category.label}
            </TalkingButton>
          );
        })}
      </div>

      {/* Content Grid - Articles or Videos */}
      {contentTab === 'articles' ? (
        // Articles Grid
        loading ? (
          <div className="flex flex-col items-center justify-center py-12">
            <Loader className="text-green-600 animate-spin mb-3" size={32} />
            <p className="text-gray-500">{t('common.loading', 'Loading...')}</p>
          </div>
        ) : filteredArticles.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-xl shadow-md">
            <BookOpen className="mx-auto text-gray-300 mb-3" size={48} />
            <p className="text-gray-500">
              {t('knowledge.noArticles', 'No articles found')}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredArticles.map((article, index) => (
              <motion.div
                key={article.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <TalkingButton
                  voiceLabel={`Read article: ${article.title}`}
                  onClick={() => handleSelectArticle(article)}
                  className="block bg-white rounded-xl shadow-md hover:shadow-lg transition-shadow overflow-hidden h-full text-left"
                >
                  <div className="p-6">
                    <div className="flex items-start justify-between mb-3">
                      <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium capitalize">
                        {article.category.replace('_', ' ')}
                      </span>
                      <div className="flex items-center gap-3 text-gray-500 text-sm">
                        <span className="flex items-center gap-1">
                          <Eye size={14} />
                          {article.views}
                        </span>
                        <span className="flex items-center gap-1">
                          <Heart size={14} className={article.isLiked ? 'fill-red-500 text-red-500' : ''} />
                          {article.likes}
                        </span>
                      </div>
                    </div>

                    <h3 className="text-lg font-semibold text-gray-900 mb-2 line-clamp-2">
                      {article.title}
                    </h3>

                    <p className="text-gray-600 text-sm mb-4 line-clamp-3">
                      {article.content.replace(/#/g, '').substring(0, 150)}...
                    </p>

                    <div className="flex items-center justify-between text-xs text-gray-500">
                      <span>{article.author}</span>
                      {article.isBookmarked && (
                        <Bookmark size={14} className="fill-yellow-500 text-yellow-500" />
                      )}
                    </div>
                  </div>
                </TalkingButton>
              </motion.div>
            ))}
          </div>
        )
      ) : (
        // Videos Grid
        filteredVideos.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-xl shadow-md">
            <Video className="mx-auto text-gray-300 mb-3" size={48} />
            <p className="text-gray-500">
              {t('knowledge.noVideos', 'No videos found')}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredVideos.map((video, index) => (
              <motion.div
                key={video.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <VideoCard
                  video={video}
                  userId={user?.id}
                  onClick={() => setSelectedVideo(video)}
                />
              </motion.div>
            ))}
          </div>
        )
      )}
    </div>
  );
}
