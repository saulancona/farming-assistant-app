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
  Trash2,
  ChevronLeft,
  UserPlus,
  UserMinus,
  Globe,
  Lock,
  Leaf,
  Smartphone,
  TrendingUp,
  MapPin,
  Check
} from 'lucide-react';
import type { CommunityPost, FarmerGroup, GroupCategory } from '../types';
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
  hasUserLikedPost,
  getAllGroups,
  getUserGroups,
  joinGroup,
  leaveGroup,
  getGroupPosts,
  addGroupPost,
  createGroup
} from '../services/database';
import { useUpdateChallengeProgress } from '../hooks/useChallenges';
import { useMessagingOperations } from '../hooks/useMessages';
import { useUIStore } from '../store/uiStore';

type ViewMode = 'feed' | 'groups' | 'my-groups' | 'group-detail';

const GROUP_CATEGORIES: { id: GroupCategory | 'all'; label: string; icon: React.ReactNode }[] = [
  { id: 'all', label: 'All Groups', icon: <Globe size={16} /> },
  { id: 'crop_specific', label: 'Crops', icon: <Leaf size={16} /> },
  { id: 'regional', label: 'Regional', icon: <MapPin size={16} /> },
  { id: 'organic', label: 'Organic', icon: <Leaf size={16} /> },
  { id: 'livestock', label: 'Livestock', icon: '🐄' },
  { id: 'technology', label: 'Tech', icon: <Smartphone size={16} /> },
  { id: 'marketing', label: 'Marketing', icon: <TrendingUp size={16} /> },
  { id: 'women_farmers', label: 'Women', icon: '👩‍🌾' },
  { id: 'youth_farmers', label: 'Youth', icon: '🌱' },
];

export default function Community() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const updateChallengeProgress = useUpdateChallengeProgress();
  const { startConversation } = useMessagingOperations();
  const setActiveTab = useUIStore((state) => state.setActiveTab);
  const setPendingConversation = useUIStore((state) => state.setPendingConversation);

  // View state
  const [viewMode, setViewMode] = useState<ViewMode>('feed');
  const [selectedGroup, setSelectedGroup] = useState<FarmerGroup | null>(null);

  // Posts state
  const [posts, setPosts] = useState<CommunityPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showNewPostModal, setShowNewPostModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [editingPost, setEditingPost] = useState<CommunityPost | null>(null);
  const [postMenuOpen, setPostMenuOpen] = useState<string | null>(null);

  // Groups state
  const [allGroups, setAllGroups] = useState<FarmerGroup[]>([]);
  const [myGroups, setMyGroups] = useState<FarmerGroup[]>([]);
  const [groupSearchQuery, setGroupSearchQuery] = useState('');
  const [selectedGroupCategory, setSelectedGroupCategory] = useState<GroupCategory | 'all'>('all');
  const [joiningGroup, setJoiningGroup] = useState<string | null>(null);
  const [showCreateGroupModal, setShowCreateGroupModal] = useState(false);

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

  // New group form state
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupDescription, setNewGroupDescription] = useState('');
  const [newGroupCategory, setNewGroupCategory] = useState<GroupCategory>('general');
  const [newGroupIcon, setNewGroupIcon] = useState('🌾');

  const postCategories = [
    { id: 'all', label: t('common.all', 'All'), icon: MessageCircle },
    { id: 'question', label: t('community.questions', 'Questions'), icon: MessageCircle },
    { id: 'tip', label: t('community.tips', 'Tips'), icon: BookOpen },
    { id: 'success_story', label: t('community.stories', 'Success Stories'), icon: Award },
    { id: 'discussion', label: t('community.discussions', 'Discussions'), icon: Users }
  ];

  // Load data on mount
  useEffect(() => {
    loadPosts();
    loadGroups();
  }, [selectedCategory, selectedGroup]);

  useEffect(() => {
    if (user) {
      loadMyGroups();
    }
  }, [user]);

  const loadPosts = async () => {
    try {
      setLoading(true);
      const filterType = selectedCategory === 'all' ? undefined : selectedCategory;

      let loadedPosts: CommunityPost[];
      if (selectedGroup) {
        loadedPosts = await getGroupPosts(selectedGroup.id, filterType);
      } else {
        loadedPosts = await getCommunityPosts(filterType);
      }

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

  const loadGroups = async () => {
    try {
      const groups = await getAllGroups();
      setAllGroups(groups);
    } catch (error) {
      console.error('Error loading groups:', error);
    }
  };

  const loadMyGroups = async () => {
    if (!user) return;
    try {
      const groups = await getUserGroups(user.id);
      setMyGroups(groups);
    } catch (error) {
      console.error('Error loading my groups:', error);
    }
  };

  const handleJoinGroup = async (group: FarmerGroup) => {
    if (!user) {
      toast.error(t('community.signInToJoin', 'Please sign in to join groups'));
      return;
    }

    setJoiningGroup(group.id);
    try {
      await joinGroup(group.id);
      toast.success(t('community.joinedGroup', `You joined ${group.name}!`));

      // Update local state
      setMyGroups(prev => [...prev, { ...group, isMember: true, userRole: 'member' }]);
      setAllGroups(prev => prev.map(g =>
        g.id === group.id ? { ...g, memberCount: g.memberCount + 1, isMember: true } : g
      ));
    } catch (error) {
      console.error('Error joining group:', error);
      toast.error(t('community.joinError', 'Failed to join group'));
    } finally {
      setJoiningGroup(null);
    }
  };

  const handleLeaveGroup = async (group: FarmerGroup) => {
    if (!user) return;

    try {
      await leaveGroup(group.id);
      toast.success(t('community.leftGroup', `You left ${group.name}`));

      // Update local state
      setMyGroups(prev => prev.filter(g => g.id !== group.id));
      setAllGroups(prev => prev.map(g =>
        g.id === group.id ? { ...g, memberCount: Math.max(g.memberCount - 1, 0), isMember: false } : g
      ));

      if (selectedGroup?.id === group.id) {
        setSelectedGroup(null);
        setViewMode('groups');
      }
    } catch (error) {
      console.error('Error leaving group:', error);
      toast.error(t('community.leaveError', 'Failed to leave group'));
    }
  };

  const handleViewGroup = (group: FarmerGroup) => {
    setSelectedGroup(group);
    setViewMode('group-detail');
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
            return { ...p, likesCount: p.likesCount - 1, isLiked: false };
          }
          return p;
        }));
      } else {
        await likeCommunityPost(postId, user.id);
        setPosts(posts.map(p => {
          if (p.id === postId) {
            return { ...p, likesCount: p.likesCount + 1, isLiked: true };
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

      const postData = {
        authorId: user.id,
        authorName: user.user_metadata?.full_name || user.email || 'Anonymous',
        authorAvatar: user.user_metadata?.avatar_url,
        type: newPostType,
        title: newPostTitle.trim(),
        content: newPostContent.trim(),
        tags
      };

      let newPost: CommunityPost;
      if (selectedGroup) {
        newPost = await addGroupPost(postData, selectedGroup.id);
      } else {
        newPost = await addCommunityPost(postData);
      }

      setPosts([newPost, ...posts]);

      updateChallengeProgress.mutate({
        userId: user.id,
        action: 'community_post',
      });

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

  const handleCreateGroup = async () => {
    if (!user) {
      toast.error('Please sign in to create groups');
      return;
    }

    if (!newGroupName.trim()) {
      toast.error('Please enter a group name');
      return;
    }

    try {
      const newGroup = await createGroup({
        name: newGroupName.trim(),
        description: newGroupDescription.trim() || undefined,
        category: newGroupCategory,
        iconEmoji: newGroupIcon
      });

      toast.success(t('community.groupCreated', 'Group created successfully!'));
      setAllGroups([newGroup, ...allGroups]);
      setMyGroups([newGroup, ...myGroups]);

      // Reset form
      setNewGroupName('');
      setNewGroupDescription('');
      setNewGroupCategory('general');
      setNewGroupIcon('🌾');
      setShowCreateGroupModal(false);

      // View the new group
      handleViewGroup(newGroup);
    } catch (error) {
      console.error('Error creating group:', error);
      toast.error('Failed to create group. Please try again.');
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

  const filteredGroups = allGroups.filter(group => {
    const matchesSearch = groupSearchQuery === '' ||
      group.name.toLowerCase().includes(groupSearchQuery.toLowerCase()) ||
      group.description?.toLowerCase().includes(groupSearchQuery.toLowerCase());
    const matchesCategory = selectedGroupCategory === 'all' || group.category === selectedGroupCategory;
    return matchesSearch && matchesCategory;
  });

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));

    if (diffInHours < 1) return 'Just now';
    if (diffInHours < 24) return `${diffInHours}h ago`;
    if (diffInHours < 48) return 'Yesterday';
    return date.toLocaleDateString();
  };

  const isGroupMember = (groupId: string) => myGroups.some(g => g.id === groupId);

  // Render Groups List
  const renderGroupsList = () => (
    <div className="space-y-6">
      {/* Search and Filter */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
          <input
            type="text"
            placeholder={t('community.searchGroups', 'Search groups...')}
            value={groupSearchQuery}
            onChange={(e) => setGroupSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
          />
        </div>
      </div>

      {/* Category Filter */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        {GROUP_CATEGORIES.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setSelectedGroupCategory(cat.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg whitespace-nowrap transition-colors ${
              selectedGroupCategory === cat.id
                ? 'bg-green-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {typeof cat.icon === 'string' ? <span>{cat.icon}</span> : cat.icon}
            {cat.label}
          </button>
        ))}
      </div>

      {/* Groups Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredGroups.map((group) => (
          <motion.div
            key={group.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-xl shadow-md overflow-hidden hover:shadow-lg transition-shadow"
          >
            <div className="p-5">
              <div className="flex items-start gap-3">
                <div className="text-4xl">{group.iconEmoji}</div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-gray-900 truncate">{group.name}</h3>
                  <p className="text-sm text-gray-500 flex items-center gap-1">
                    <Users size={14} />
                    {group.memberCount} {t('community.members', 'members')}
                  </p>
                </div>
                <span title={group.isPublic ? "Public" : "Private"}>
                  {group.isPublic ? (
                    <Globe size={16} className="text-gray-400" />
                  ) : (
                    <Lock size={16} className="text-gray-400" />
                  )}
                </span>
              </div>
              <p className="text-sm text-gray-600 mt-3 line-clamp-2">{group.description}</p>

              {/* Tags */}
              {group.tags && group.tags.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-3">
                  {group.tags.slice(0, 3).map((tag) => (
                    <span key={tag} className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded-full">
                      #{tag}
                    </span>
                  ))}
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-2 mt-4">
                <button
                  onClick={() => handleViewGroup(group)}
                  className="flex-1 px-4 py-2 text-sm font-medium text-green-600 border border-green-600 rounded-lg hover:bg-green-50 transition-colors"
                >
                  {t('community.viewGroup', 'View')}
                </button>
                {isGroupMember(group.id) ? (
                  <button
                    onClick={() => handleLeaveGroup(group)}
                    className="flex items-center gap-1 px-4 py-2 text-sm font-medium text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <Check size={16} />
                    {t('community.joined', 'Joined')}
                  </button>
                ) : (
                  <button
                    onClick={() => handleJoinGroup(group)}
                    disabled={joiningGroup === group.id}
                    className="flex items-center gap-1 px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
                  >
                    <UserPlus size={16} />
                    {joiningGroup === group.id ? '...' : t('community.join', 'Join')}
                  </button>
                )}
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {filteredGroups.length === 0 && (
        <div className="bg-white rounded-xl shadow-md p-12 text-center">
          <Users className="mx-auto text-gray-400 mb-4" size={48} />
          <h3 className="text-xl font-semibold text-gray-900 mb-2">
            {t('community.noGroups', 'No groups found')}
          </h3>
          <p className="text-gray-600">
            {t('community.createFirstGroup', 'Be the first to create a group!')}
          </p>
        </div>
      )}
    </div>
  );

  // Render My Groups
  const renderMyGroups = () => (
    <div className="space-y-6">
      {myGroups.length === 0 ? (
        <div className="bg-white rounded-xl shadow-md p-12 text-center">
          <Users className="mx-auto text-gray-400 mb-4" size={48} />
          <h3 className="text-xl font-semibold text-gray-900 mb-2">
            {t('community.noJoinedGroups', "You haven't joined any groups yet")}
          </h3>
          <p className="text-gray-600 mb-4">
            {t('community.joinGroupsDesc', 'Join groups to connect with farmers who share your interests')}
          </p>
          <button
            onClick={() => setViewMode('groups')}
            className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
          >
            {t('community.browseGroups', 'Browse Groups')}
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {myGroups.map((group) => (
            <motion.div
              key={group.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-xl shadow-md overflow-hidden hover:shadow-lg transition-shadow cursor-pointer"
              onClick={() => handleViewGroup(group)}
            >
              <div className="p-5">
                <div className="flex items-start gap-3">
                  <div className="text-4xl">{group.iconEmoji}</div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-gray-900 truncate">{group.name}</h3>
                    <p className="text-sm text-gray-500 flex items-center gap-1">
                      <Users size={14} />
                      {group.memberCount} {t('community.members', 'members')}
                    </p>
                    {group.userRole && (
                      <span className={`inline-block mt-1 px-2 py-0.5 rounded text-xs font-medium ${
                        group.userRole === 'admin' ? 'bg-purple-100 text-purple-700' :
                        group.userRole === 'moderator' ? 'bg-blue-100 text-blue-700' :
                        'bg-gray-100 text-gray-600'
                      }`}>
                        {group.userRole}
                      </span>
                    )}
                  </div>
                </div>
                <p className="text-sm text-gray-600 mt-3 line-clamp-2">{group.description}</p>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );

  // Render Group Detail (Posts Feed within a group)
  const renderGroupDetail = () => {
    if (!selectedGroup) return null;

    return (
      <div className="space-y-6">
        {/* Group Header */}
        <div className="bg-white rounded-xl shadow-md p-6">
          <button
            onClick={() => {
              setSelectedGroup(null);
              setViewMode('groups');
            }}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4"
          >
            <ChevronLeft size={20} />
            {t('common.back', 'Back to Groups')}
          </button>
          <div className="flex items-start gap-4">
            <div className="text-5xl">{selectedGroup.iconEmoji}</div>
            <div className="flex-1">
              <h2 className="text-2xl font-bold text-gray-900">{selectedGroup.name}</h2>
              <p className="text-gray-600 mt-1">{selectedGroup.description}</p>
              <div className="flex items-center gap-4 mt-3 text-sm text-gray-500">
                <span className="flex items-center gap-1">
                  <Users size={16} />
                  {selectedGroup.memberCount} {t('community.members', 'members')}
                </span>
                <span className="flex items-center gap-1">
                  <MessageCircle size={16} />
                  {selectedGroup.postCount} {t('community.posts', 'posts')}
                </span>
              </div>
            </div>
            {isGroupMember(selectedGroup.id) ? (
              <button
                onClick={() => handleLeaveGroup(selectedGroup)}
                className="flex items-center gap-2 px-4 py-2 text-red-600 border border-red-300 rounded-lg hover:bg-red-50 transition-colors"
              >
                <UserMinus size={18} />
                {t('community.leaveGroup', 'Leave Group')}
              </button>
            ) : (
              <button
                onClick={() => handleJoinGroup(selectedGroup)}
                disabled={joiningGroup === selectedGroup.id}
                className="flex items-center gap-2 px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
              >
                <UserPlus size={18} />
                {joiningGroup === selectedGroup.id ? '...' : t('community.joinGroup', 'Join Group')}
              </button>
            )}
          </div>
        </div>

        {/* Post Button */}
        {isGroupMember(selectedGroup.id) && (
          <button
            onClick={() => setShowNewPostModal(true)}
            className="w-full bg-white rounded-xl shadow-md p-4 text-left text-gray-500 hover:bg-gray-50 transition-colors flex items-center gap-3"
          >
            <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
              <Plus className="text-green-600" size={20} />
            </div>
            {t('community.writePost', 'Write something to share with the group...')}
          </button>
        )}

        {/* Posts Feed */}
        {renderPostsFeed()}
      </div>
    );
  };

  // Render Posts Feed
  const renderPostsFeed = () => (
    <div className="space-y-4">
      {/* Search and Filter for posts */}
      {!selectedGroup && (
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
            {postCategories.map((category) => (
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
      )}

      {/* Posts List */}
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
            <p className="mt-2 text-gray-600">{t('common.loading', 'Loading...')}</p>
          </div>
        </div>
      ) : filteredPosts.length === 0 ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="bg-white rounded-xl shadow-md p-12 text-center"
        >
          <MessageCircle className="mx-auto text-gray-400 mb-4" size={48} />
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
            transition={{ delay: index * 0.05 }}
            className="bg-white rounded-xl shadow-md p-6 hover:shadow-lg transition-shadow"
          >
            {/* Post Header */}
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-start gap-3 flex-1">
                <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                  {post.authorAvatar ? (
                    <img src={post.authorAvatar} alt={post.authorName} className="w-12 h-12 rounded-full" />
                  ) : (
                    <span className="text-green-700 font-semibold">{post.authorName.charAt(0)}</span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-semibold text-gray-900">{post.authorName}</h3>
                    <span className="text-sm text-gray-400">• {formatDate(post.createdAt)}</span>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`inline-block mt-1 px-2 py-0.5 rounded text-xs font-medium ${
                      post.type === 'question' ? 'bg-blue-100 text-blue-700' :
                      post.type === 'tip' ? 'bg-purple-100 text-purple-700' :
                      post.type === 'success_story' ? 'bg-yellow-100 text-yellow-700' :
                      'bg-gray-100 text-gray-700'
                    }`}>
                      {post.type.replace('_', ' ').toUpperCase()}
                    </span>
                    {post.groupName && (
                      <span className="text-xs text-gray-500">in {post.groupName}</span>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <ReadButton text={`${post.title}. ${post.content}`} size="sm" />
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
                  <span key={tag} className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-full">
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
                onClick={async (e) => {
                  e.stopPropagation();
                  if (!user) {
                    toast.error(t('messages.signInRequired', 'Please sign in to send messages'));
                    return;
                  }
                  if (post.authorId === user.id) {
                    toast.error(t('messages.cantMessageSelf', 'You cannot message yourself'));
                    return;
                  }
                  try {
                    const conversation = await startConversation({
                      recipientId: post.authorId,
                      recipientName: post.authorName,
                    });
                    setPendingConversation(conversation);
                    setActiveTab('messages');
                    toast.success(t('messages.conversationStarted', `Chat with ${post.authorName} opened`));
                  } catch (error) {
                    console.error('Failed to start conversation:', error);
                    toast.error(t('messages.failedToStart', 'Failed to start conversation'));
                  }
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
  );

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
        <div className="flex gap-2">
          {viewMode === 'groups' && (
            <TalkingButton
              voiceLabel="Create a new group"
              onClick={() => setShowCreateGroupModal(true)}
              className="flex items-center gap-2 px-4 py-2 border border-green-600 text-green-600 rounded-lg hover:bg-green-50 transition-colors"
            >
              <Plus size={20} />
              {t('community.createGroup', 'Create Group')}
            </TalkingButton>
          )}
          {(viewMode === 'feed' || viewMode === 'group-detail') && !selectedGroup && (
            <TalkingButton
              voiceLabel="Create New Post"
              onClick={() => setShowNewPostModal(true)}
              className="flex items-center gap-2 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors shadow-md"
            >
              <Plus size={20} />
              {t('community.newPost', 'New Post')}
            </TalkingButton>
          )}
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex gap-2 border-b border-gray-200 pb-4">
        <button
          onClick={() => { setViewMode('feed'); setSelectedGroup(null); }}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            viewMode === 'feed' && !selectedGroup
              ? 'bg-green-600 text-white'
              : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          <MessageCircle size={18} className="inline mr-2" />
          {t('community.allPosts', 'All Posts')}
        </button>
        <button
          onClick={() => setViewMode('groups')}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            viewMode === 'groups'
              ? 'bg-green-600 text-white'
              : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          <Globe size={18} className="inline mr-2" />
          {t('community.browseGroups', 'Browse Groups')}
        </button>
        <button
          onClick={() => setViewMode('my-groups')}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            viewMode === 'my-groups'
              ? 'bg-green-600 text-white'
              : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          <Users size={18} className="inline mr-2" />
          {t('community.myGroups', 'My Groups')} {myGroups.length > 0 && `(${myGroups.length})`}
        </button>
      </div>

      {/* Quick Stats - Only show on feed view */}
      {viewMode === 'feed' && !selectedGroup && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-100">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <MessageCircle className="text-blue-600" size={20} />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{posts.filter(p => p.type === 'question').length}</p>
                <p className="text-sm text-gray-600">{t('community.questions', 'Questions')}</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-100">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <BookOpen className="text-purple-600" size={20} />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{posts.filter(p => p.type === 'tip').length}</p>
                <p className="text-sm text-gray-600">{t('community.tips', 'Tips')}</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-100">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <Users className="text-green-600" size={20} />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{myGroups.length}</p>
                <p className="text-sm text-gray-600">{t('community.groupsJoined', 'Groups Joined')}</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-100">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-yellow-100 rounded-lg">
                <Award className="text-yellow-600" size={20} />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{posts.length}</p>
                <p className="text-sm text-gray-600">{t('community.totalPosts', 'Total Posts')}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      {viewMode === 'feed' && !selectedGroup && renderPostsFeed()}
      {viewMode === 'groups' && renderGroupsList()}
      {viewMode === 'my-groups' && renderMyGroups()}
      {viewMode === 'group-detail' && renderGroupDetail()}

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
                {selectedGroup
                  ? t('community.createPostInGroup', `Post in ${selectedGroup.name}`)
                  : t('community.createPost', 'Create New Post')}
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
                  onChange={(e) => setNewPostType(e.target.value as typeof newPostType)}
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

      {/* Create Group Modal */}
      {showCreateGroupModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-xl shadow-xl p-6 max-w-lg w-full max-h-[90vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-bold text-gray-900">
                {t('community.createNewGroup', 'Create New Group')}
              </h2>
              <button
                onClick={() => setShowCreateGroupModal(false)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X size={24} />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('community.groupIcon', 'Group Icon')}
                </label>
                <div className="flex gap-2 flex-wrap">
                  {['🌾', '🌽', '🍅', '🥬', '🐄', '🐓', '🌿', '🌱', '💰', '🤝', '👩‍🌾', '👨‍🌾'].map((emoji) => (
                    <button
                      key={emoji}
                      type="button"
                      onClick={() => setNewGroupIcon(emoji)}
                      className={`text-2xl p-2 rounded-lg transition-colors ${
                        newGroupIcon === emoji ? 'bg-green-100 ring-2 ring-green-500' : 'bg-gray-100 hover:bg-gray-200'
                      }`}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('community.groupName', 'Group Name')} *
                </label>
                <input
                  type="text"
                  value={newGroupName}
                  onChange={(e) => setNewGroupName(e.target.value)}
                  placeholder={t('community.groupNamePlaceholder', 'e.g. Tomato Farmers Kenya')}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('community.groupDescription', 'Description')}
                </label>
                <textarea
                  rows={3}
                  value={newGroupDescription}
                  onChange={(e) => setNewGroupDescription(e.target.value)}
                  placeholder={t('community.groupDescPlaceholder', 'What is this group about?')}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('community.groupCategory', 'Category')}
                </label>
                <select
                  value={newGroupCategory}
                  onChange={(e) => setNewGroupCategory(e.target.value as GroupCategory)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                >
                  <option value="crop_specific">Crop Specific</option>
                  <option value="regional">Regional</option>
                  <option value="organic">Organic Farming</option>
                  <option value="livestock">Livestock</option>
                  <option value="technology">Technology</option>
                  <option value="marketing">Marketing & Sales</option>
                  <option value="women_farmers">Women Farmers</option>
                  <option value="youth_farmers">Youth Farmers</option>
                  <option value="general">General</option>
                </select>
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => setShowCreateGroupModal(false)}
                  className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
                >
                  {t('common.cancel', 'Cancel')}
                </button>
                <button
                  onClick={handleCreateGroup}
                  className="flex-1 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium flex items-center justify-center gap-2"
                >
                  <Plus size={18} />
                  {t('community.createGroup', 'Create Group')}
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
