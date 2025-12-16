import { supabase } from '../lib/supabase';
import type { Field, Expense, Income, Task, InventoryItem, StorageBin, CommunityPost, Message, Conversation, KnowledgeArticle, MarketplaceListing, BusinessProfile, SellerReview, SavedSearch, SavedSearchCriteria } from '../types';

// Helper to get current user ID
async function getCurrentUserId(): Promise<string> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('User not authenticated');
  return user.id;
}

// Helper function to convert snake_case to camelCase
function toCamelCase(obj: any): any {
  if (Array.isArray(obj)) {
    return obj.map(item => toCamelCase(item));
  } else if (obj !== null && typeof obj === 'object') {
    return Object.keys(obj).reduce((acc, key) => {
      const camelKey = key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
      acc[camelKey] = toCamelCase(obj[key]);
      return acc;
    }, {} as any);
  }
  return obj;
}

// Helper function to convert camelCase to snake_case
function toSnakeCase(obj: any): any {
  if (Array.isArray(obj)) {
    return obj.map(item => toSnakeCase(item));
  } else if (obj !== null && typeof obj === 'object') {
    return Object.keys(obj).reduce((acc, key) => {
      const snakeKey = key.replace(/([A-Z])/g, '_$1').toLowerCase();
      acc[snakeKey] = toSnakeCase(obj[key]);
      return acc;
    }, {} as any);
  }
  return obj;
}

// ============================================
// FIELDS
// ============================================

export async function getFields(): Promise<Field[]> {
  const userId = await getCurrentUserId();
  const { data, error } = await supabase
    .from('fields')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return toCamelCase(data || []);
}

export async function addField(field: Omit<Field, 'id'>): Promise<Field> {
  const userId = await getCurrentUserId();
  const { data, error } = await supabase
    .from('fields')
    .insert([toSnakeCase({ ...field, user_id: userId })])
    .select()
    .single();

  if (error) throw error;
  return toCamelCase(data);
}

export async function updateField(id: string, updates: Partial<Field>): Promise<Field> {
  const userId = await getCurrentUserId();
  const { data, error } = await supabase
    .from('fields')
    .update(toSnakeCase(updates))
    .eq('id', id)
    .eq('user_id', userId)
    .select()
    .single();

  if (error) throw error;
  return toCamelCase(data);
}

export async function deleteField(id: string): Promise<void> {
  const userId = await getCurrentUserId();
  const { error } = await supabase
    .from('fields')
    .delete()
    .eq('id', id)
    .eq('user_id', userId);

  if (error) throw error;
}

// ============================================
// EXPENSES
// ============================================

export async function getExpenses(): Promise<Expense[]> {
  const userId = await getCurrentUserId();
  const { data, error } = await supabase
    .from('expenses')
    .select('*')
    .eq('user_id', userId)
    .order('date', { ascending: false });

  if (error) throw error;
  return toCamelCase(data || []);
}

export async function addExpense(expense: Omit<Expense, 'id'>): Promise<Expense> {
  const userId = await getCurrentUserId();
  const { data, error } = await supabase
    .from('expenses')
    .insert([toSnakeCase({ ...expense, user_id: userId })])
    .select()
    .single();

  if (error) throw error;
  return toCamelCase(data);
}

export async function updateExpense(id: string, updates: Partial<Expense>): Promise<Expense> {
  const userId = await getCurrentUserId();
  const { data, error} = await supabase
    .from('expenses')
    .update(toSnakeCase(updates))
    .eq('id', id)
    .eq('user_id', userId)
    .select()
    .single();

  if (error) throw error;
  return toCamelCase(data);
}

export async function deleteExpense(id: string): Promise<void> {
  const userId = await getCurrentUserId();
  const { error } = await supabase
    .from('expenses')
    .delete()
    .eq('id', id)
    .eq('user_id', userId);

  if (error) throw error;
}

// ============================================
// INCOME (Phase 2)
// ============================================

export async function getIncome(): Promise<Income[]> {
  const userId = await getCurrentUserId();
  const { data, error } = await supabase
    .from('income')
    .select('*')
    .eq('user_id', userId)
    .order('date', { ascending: false });

  if (error) throw error;
  return toCamelCase(data || []);
}

export async function addIncome(income: Omit<Income, 'id'>): Promise<Income> {
  const userId = await getCurrentUserId();
  const { data, error } = await supabase
    .from('income')
    .insert([toSnakeCase({ ...income, user_id: userId })])
    .select()
    .single();

  if (error) throw error;
  return toCamelCase(data);
}

export async function updateIncome(id: string, updates: Partial<Income>): Promise<Income> {
  const userId = await getCurrentUserId();
  const { data, error } = await supabase
    .from('income')
    .update(toSnakeCase(updates))
    .eq('id', id)
    .eq('user_id', userId)
    .select()
    .single();

  if (error) throw error;
  return toCamelCase(data);
}

export async function deleteIncome(id: string): Promise<void> {
  const userId = await getCurrentUserId();
  const { error } = await supabase
    .from('income')
    .delete()
    .eq('id', id)
    .eq('user_id', userId);

  if (error) throw error;
}

// ============================================
// TASKS (Phase 2)
// ============================================

export async function getTasks(): Promise<Task[]> {
  const userId = await getCurrentUserId();
  const { data, error } = await supabase
    .from('tasks')
    .select('*')
    .eq('user_id', userId)
    .order('due_date', { ascending: true });

  if (error) throw error;
  return toCamelCase(data || []);
}

export async function addTask(task: Omit<Task, 'id'>): Promise<Task> {
  const userId = await getCurrentUserId();
  const { data, error } = await supabase
    .from('tasks')
    .insert([toSnakeCase({ ...task, user_id: userId })])
    .select()
    .single();

  if (error) throw error;
  return toCamelCase(data);
}

export async function updateTask(id: string, updates: Partial<Task>): Promise<Task> {
  const userId = await getCurrentUserId();
  const { data, error } = await supabase
    .from('tasks')
    .update(toSnakeCase(updates))
    .eq('id', id)
    .eq('user_id', userId)
    .select()
    .single();

  if (error) throw error;
  return toCamelCase(data);
}

export async function deleteTask(id: string): Promise<void> {
  const userId = await getCurrentUserId();
  const { error } = await supabase
    .from('tasks')
    .delete()
    .eq('id', id)
    .eq('user_id', userId);

  if (error) throw error;
}

// ============================================
// INVENTORY (Phase 2)
// ============================================

export async function getInventory(): Promise<InventoryItem[]> {
  const userId = await getCurrentUserId();
  const { data, error } = await supabase
    .from('inventory')
    .select('*')
    .eq('user_id', userId)
    .order('name', { ascending: true });

  if (error) throw error;
  return toCamelCase(data || []);
}

export async function addInventoryItem(item: Omit<InventoryItem, 'id'>): Promise<InventoryItem> {
  const userId = await getCurrentUserId();
  const { data, error } = await supabase
    .from('inventory')
    .insert([toSnakeCase({ ...item, user_id: userId })])
    .select()
    .single();

  if (error) throw error;
  return toCamelCase(data);
}

export async function updateInventoryItem(id: string, updates: Partial<InventoryItem>): Promise<InventoryItem> {
  const userId = await getCurrentUserId();
  const { data, error } = await supabase
    .from('inventory')
    .update(toSnakeCase(updates))
    .eq('id', id)
    .eq('user_id', userId)
    .select()
    .single();

  if (error) throw error;
  return toCamelCase(data);
}

export async function deleteInventoryItem(id: string): Promise<void> {
  const userId = await getCurrentUserId();
  const { error } = await supabase
    .from('inventory')
    .delete()
    .eq('id', id)
    .eq('user_id', userId);

  if (error) throw error;
}

// ============================================
// STORAGE BINS (Phase 2)
// ============================================

export async function getStorageBins(): Promise<StorageBin[]> {
  const userId = await getCurrentUserId();
  const { data, error } = await supabase
    .from('storage_bins')
    .select('*')
    .eq('user_id', userId)
    .order('name', { ascending: true });

  if (error) throw error;
  return toCamelCase(data || []);
}

export async function addStorageBin(bin: Omit<StorageBin, 'id'>): Promise<StorageBin> {
  const userId = await getCurrentUserId();
  const { data, error } = await supabase
    .from('storage_bins')
    .insert([toSnakeCase({ ...bin, user_id: userId })])
    .select()
    .single();

  if (error) throw error;
  return toCamelCase(data);
}

export async function updateStorageBin(id: string, updates: Partial<StorageBin>): Promise<StorageBin> {
  const userId = await getCurrentUserId();
  const { data, error } = await supabase
    .from('storage_bins')
    .update(toSnakeCase(updates))
    .eq('id', id)
    .eq('user_id', userId)
    .select()
    .single();

  if (error) throw error;
  return toCamelCase(data);
}

export async function deleteStorageBin(id: string): Promise<void> {
  const userId = await getCurrentUserId();
  const { error } = await supabase
    .from('storage_bins')
    .delete()
    .eq('id', id)
    .eq('user_id', userId);

  if (error) throw error;
}

// ============================================
// COMMUNITY POSTS (Phase 3)
// ============================================

export async function getCommunityPosts(filterType?: string): Promise<CommunityPost[]> {
  let query = supabase
    .from('community_posts')
    .select('*')
    .order('created_at', { ascending: false });

  if (filterType && filterType !== 'all') {
    query = query.eq('type', filterType);
  }

  const { data, error } = await query;

  if (error) throw error;
  return toCamelCase(data || []);
}

export async function addCommunityPost(post: Omit<CommunityPost, 'id' | 'createdAt' | 'likesCount' | 'commentsCount'>): Promise<CommunityPost> {
  const userId = await getCurrentUserId();
  const { data, error } = await supabase
    .from('community_posts')
    .insert([{ ...toSnakeCase(post), user_id: userId }])
    .select()
    .single();

  if (error) throw error;
  return toCamelCase(data);
}

export async function updateCommunityPost(id: string, updates: Partial<CommunityPost>): Promise<CommunityPost> {
  const { data, error } = await supabase
    .from('community_posts')
    .update(toSnakeCase(updates))
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return toCamelCase(data);
}

export async function deleteCommunityPost(id: string): Promise<void> {
  const { error } = await supabase
    .from('community_posts')
    .delete()
    .eq('id', id);

  if (error) throw error;
}

export async function likeCommunityPost(postId: string, userId: string): Promise<void> {
  const { error } = await supabase
    .from('post_likes')
    .insert([{ post_id: postId, user_id: userId }]);

  if (error) throw error;
}

export async function unlikeCommunityPost(postId: string, userId: string): Promise<void> {
  const { error } = await supabase
    .from('post_likes')
    .delete()
    .eq('post_id', postId)
    .eq('user_id', userId);

  if (error) throw error;
}

export async function hasUserLikedPost(postId: string, userId: string): Promise<boolean> {
  const { data, error } = await supabase
    .from('post_likes')
    .select('id')
    .eq('post_id', postId)
    .eq('user_id', userId)
    .single();

  if (error && error.code !== 'PGRST116') throw error; // PGRST116 is "no rows returned"
  return !!data;
}

// ============================================
// CONVERSATIONS (Phase 3)
// ============================================

export async function getConversations(userId: string): Promise<Conversation[]> {
  const { data, error } = await supabase
    .from('conversations')
    .select('*')
    .contains('participant_ids', [userId])
    .order('last_message_at', { ascending: false });

  if (error) throw error;
  return toCamelCase(data || []);
}

export async function getConversation(id: string): Promise<Conversation> {
  const { data, error } = await supabase
    .from('conversations')
    .select('*')
    .eq('id', id)
    .single();

  if (error) throw error;
  return toCamelCase(data);
}

export async function findOrCreateConversation(participantIds: string[]): Promise<Conversation> {
  // Try to find existing conversation
  const { data: existing, error: findError } = await supabase
    .from('conversations')
    .select('*')
    .contains('participant_ids', participantIds)
    .limit(1)
    .single();

  if (existing && !findError) {
    return toCamelCase(existing);
  }

  // Create new conversation
  const { data: newConversation, error: createError } = await supabase
    .from('conversations')
    .insert([{ participant_ids: participantIds }])
    .select()
    .single();

  if (createError) throw createError;
  return toCamelCase(newConversation);
}

export async function updateConversation(id: string, updates: Partial<Conversation>): Promise<Conversation> {
  const { data, error } = await supabase
    .from('conversations')
    .update(toSnakeCase(updates))
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return toCamelCase(data);
}

// ============================================
// MESSAGES (Phase 3)
// ============================================

export async function getMessages(conversationId: string): Promise<Message[]> {
  const { data, error } = await supabase
    .from('messages')
    .select('*')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true });

  if (error) throw error;
  return toCamelCase(data || []);
}

export async function sendMessage(message: Omit<Message, 'id' | 'createdAt'>): Promise<Message> {
  const { data, error } = await supabase
    .from('messages')
    .insert([toSnakeCase(message)])
    .select()
    .single();

  if (error) throw error;

  // Update conversation's last_message and last_message_at
  await supabase
    .from('conversations')
    .update({
      last_message: message.content,
      last_message_at: new Date().toISOString(),
    })
    .eq('id', message.conversationId);

  return toCamelCase(data);
}

export async function markMessageAsRead(messageId: string): Promise<void> {
  const { error } = await supabase
    .from('messages')
    .update({ read: true })
    .eq('id', messageId);

  if (error) throw error;
}

export async function markConversationAsRead(conversationId: string, userId: string): Promise<void> {
  const { error } = await supabase
    .from('messages')
    .update({ read: true })
    .eq('conversation_id', conversationId)
    .neq('sender_id', userId);

  if (error) throw error;
}

export async function getUnreadCount(conversationId: string, userId: string): Promise<number> {
  const { count, error } = await supabase
    .from('messages')
    .select('*', { count: 'exact', head: true })
    .eq('conversation_id', conversationId)
    .eq('read', false)
    .neq('sender_id', userId);

  if (error) throw error;
  return count || 0;
}

// ============================================
// KNOWLEDGE ARTICLES (Phase 3)
// ============================================

export async function getKnowledgeArticles(filterCategory?: string): Promise<KnowledgeArticle[]> {
  let query = supabase
    .from('knowledge_articles')
    .select('*')
    .order('created_at', { ascending: false });

  if (filterCategory && filterCategory !== 'all') {
    query = query.eq('category', filterCategory);
  }

  const { data, error } = await query;

  if (error) throw error;
  return toCamelCase(data || []);
}

export async function getKnowledgeArticle(id: string): Promise<KnowledgeArticle> {
  const { data, error } = await supabase
    .from('knowledge_articles')
    .select('*')
    .eq('id', id)
    .single();

  if (error) throw error;

  // Increment view count
  await supabase.rpc('increment_article_views', { article_id_param: id });

  return toCamelCase(data);
}

export async function addKnowledgeArticle(article: Omit<KnowledgeArticle, 'id' | 'createdAt' | 'views' | 'likes'>): Promise<KnowledgeArticle> {
  const { data, error } = await supabase
    .from('knowledge_articles')
    .insert([toSnakeCase(article)])
    .select()
    .single();

  if (error) throw error;
  return toCamelCase(data);
}

export async function updateKnowledgeArticle(id: string, updates: Partial<KnowledgeArticle>): Promise<KnowledgeArticle> {
  const { data, error } = await supabase
    .from('knowledge_articles')
    .update(toSnakeCase(updates))
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return toCamelCase(data);
}

export async function deleteKnowledgeArticle(id: string): Promise<void> {
  const { error } = await supabase
    .from('knowledge_articles')
    .delete()
    .eq('id', id);

  if (error) throw error;
}

export async function likeKnowledgeArticle(articleId: string, userId: string): Promise<void> {
  const { error } = await supabase
    .from('article_likes')
    .insert([{ article_id: articleId, user_id: userId }]);

  if (error) throw error;
}

export async function unlikeKnowledgeArticle(articleId: string, userId: string): Promise<void> {
  const { error } = await supabase
    .from('article_likes')
    .delete()
    .eq('article_id', articleId)
    .eq('user_id', userId);

  if (error) throw error;
}

export async function hasUserLikedArticle(articleId: string, userId: string): Promise<boolean> {
  const { data, error } = await supabase
    .from('article_likes')
    .select('id')
    .eq('article_id', articleId)
    .eq('user_id', userId)
    .single();

  if (error && error.code !== 'PGRST116') throw error; // PGRST116 is "no rows returned"
  return !!data;
}

export async function bookmarkArticle(articleId: string, userId: string): Promise<void> {
  const { error } = await supabase
    .from('article_bookmarks')
    .insert([{ article_id: articleId, user_id: userId }]);

  if (error) throw error;
}

export async function unbookmarkArticle(articleId: string, userId: string): Promise<void> {
  const { error } = await supabase
    .from('article_bookmarks')
    .delete()
    .eq('article_id', articleId)
    .eq('user_id', userId);

  if (error) throw error;
}

export async function hasUserBookmarkedArticle(articleId: string, userId: string): Promise<boolean> {
  const { data, error } = await supabase
    .from('article_bookmarks')
    .select('id')
    .eq('article_id', articleId)
    .eq('user_id', userId)
    .single();

  if (error && error.code !== 'PGRST116') throw error; // PGRST116 is "no rows returned"
  return !!data;
}

export async function getUserBookmarkedArticles(userId: string): Promise<KnowledgeArticle[]> {
  const { data, error } = await supabase
    .from('article_bookmarks')
    .select('article_id, knowledge_articles(*)')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) throw error;

  // Extract the articles from the joined data
  const articles = data?.map((item: any) => item.knowledge_articles).filter(Boolean) || [];
  return toCamelCase(articles);
}

// ============================================
// MARKETPLACE (Phase 4)
// ============================================

export async function getMarketplaceListings(filters?: {
  cropType?: string;
  location?: string;
  status?: string;
}): Promise<MarketplaceListing[]> {
  let query = supabase
    .from('marketplace_listings')
    .select('*')
    .order('created_at', { ascending: false });

  if (filters?.cropType) {
    query = query.ilike('crop_type', `%${filters.cropType}%`);
  }

  if (filters?.location) {
    query = query.ilike('location', `%${filters.location}%`);
  }

  if (filters?.status) {
    query = query.eq('status', filters.status);
  } else {
    // Default to showing only active listings
    query = query.eq('status', 'active');
  }

  const { data, error } = await query;

  if (error) throw error;

  // Add isOwner flag for each listing
  const userId = await getCurrentUserId().catch(() => null);
  const listings = toCamelCase(data || []).map((listing: MarketplaceListing) => ({
    ...listing,
    isOwner: userId ? listing.userId === userId : false,
  }));

  return listings;
}

export async function getMyMarketplaceListings(): Promise<MarketplaceListing[]> {
  const userId = await getCurrentUserId();
  const { data, error } = await supabase
    .from('marketplace_listings')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return toCamelCase(data || []).map((listing: MarketplaceListing) => ({
    ...listing,
    isOwner: true,
  }));
}

export async function getMarketplaceListing(id: string): Promise<MarketplaceListing> {
  const { data, error } = await supabase
    .from('marketplace_listings')
    .select('*')
    .eq('id', id)
    .single();

  if (error) throw error;

  // Increment view count
  await supabase.rpc('increment_listing_views', { listing_id_param: id });

  const userId = await getCurrentUserId().catch(() => null);
  return {
    ...toCamelCase(data),
    isOwner: userId ? data.user_id === userId : false,
  };
}

export async function addMarketplaceListing(listing: Omit<MarketplaceListing, 'id' | 'createdAt' | 'viewsCount' | 'isOwner'>): Promise<MarketplaceListing> {
  const userId = await getCurrentUserId();

  // Get user info
  const { data: { user } } = await supabase.auth.getUser();
  const userName = user?.user_metadata?.name || user?.email || 'Anonymous';

  // Get business profile info if exists
  const businessProfile = await getBusinessProfile(userId);

  const listingData = {
    ...toSnakeCase(listing),
    user_id: userId,
    user_name: userName,
    // Include business profile info if available
    seller_business_name: businessProfile?.businessName || null,
    seller_business_type: businessProfile?.businessType || null,
    seller_rating: businessProfile?.rating || 0,
    seller_total_ratings: businessProfile?.totalRatings || 0,
    seller_verification_status: businessProfile?.verificationStatus || 'unverified',
    seller_badges: businessProfile?.verificationBadges || [],
    seller_whatsapp: businessProfile?.whatsappNumber || null,
  };

  const { data, error } = await supabase
    .from('marketplace_listings')
    .insert([listingData])
    .select()
    .single();

  if (error) throw error;
  return {
    ...toCamelCase(data),
    isOwner: true,
  };
}

export async function updateMarketplaceListing(id: string, updates: Partial<MarketplaceListing>): Promise<MarketplaceListing> {
  // Verify ownership
  const listing = await getMarketplaceListing(id);
  const userId = await getCurrentUserId();

  if (listing.userId !== userId) {
    throw new Error('You can only edit your own listings');
  }

  const { data, error } = await supabase
    .from('marketplace_listings')
    .update(toSnakeCase(updates))
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return {
    ...toCamelCase(data),
    isOwner: true,
  };
}

export async function deleteMarketplaceListing(id: string): Promise<void> {
  // Verify ownership
  const listing = await getMarketplaceListing(id);
  const userId = await getCurrentUserId();

  if (listing.userId !== userId) {
    throw new Error('You can only delete your own listings');
  }

  const { error } = await supabase
    .from('marketplace_listings')
    .delete()
    .eq('id', id);

  if (error) throw error;
}

export async function markListingAsSold(id: string): Promise<MarketplaceListing> {
  return updateMarketplaceListing(id, { status: 'sold' });
}

export async function markListingAsReserved(id: string): Promise<MarketplaceListing> {
  return updateMarketplaceListing(id, { status: 'reserved' });
}

// ============================================
// BUSINESS PROFILES
// ============================================

export async function getBusinessProfile(userId?: string): Promise<BusinessProfile | null> {
  const targetUserId = userId || await getCurrentUserId();
  const { data, error } = await supabase
    .from('business_profiles')
    .select('*')
    .eq('user_id', targetUserId)
    .single();

  if (error && error.code !== 'PGRST116') throw error; // PGRST116 is "no rows returned"
  return data ? toCamelCase(data) : null;
}

export async function getBusinessProfileById(profileId: string): Promise<BusinessProfile | null> {
  const { data, error } = await supabase
    .from('business_profiles')
    .select('*')
    .eq('id', profileId)
    .single();

  if (error && error.code !== 'PGRST116') throw error;
  return data ? toCamelCase(data) : null;
}

export async function createBusinessProfile(profile: Omit<BusinessProfile, 'id' | 'createdAt' | 'rating' | 'totalRatings' | 'totalTransactions'>): Promise<BusinessProfile> {
  const userId = await getCurrentUserId();

  // Check if profile already exists
  const existing = await getBusinessProfile(userId);
  if (existing) {
    throw new Error('Business profile already exists. Use updateBusinessProfile instead.');
  }

  const profileData = {
    ...toSnakeCase(profile),
    user_id: userId,
    rating: 0,
    total_ratings: 0,
    total_transactions: 0,
  };

  const { data, error } = await supabase
    .from('business_profiles')
    .insert([profileData])
    .select()
    .single();

  if (error) throw error;
  return toCamelCase(data);
}

export async function updateBusinessProfile(id: string, updates: Partial<BusinessProfile>): Promise<BusinessProfile> {
  const userId = await getCurrentUserId();

  // Verify ownership
  const profile = await getBusinessProfileById(id);
  if (!profile || profile.userId !== userId) {
    throw new Error('You can only update your own business profile');
  }

  const { data, error } = await supabase
    .from('business_profiles')
    .update({
      ...toSnakeCase(updates),
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return toCamelCase(data);
}

export async function searchBusinessProfiles(filters?: {
  businessType?: string;
  location?: string;
  verifiedOnly?: boolean;
  minRating?: number;
}): Promise<BusinessProfile[]> {
  let query = supabase
    .from('business_profiles')
    .select('*')
    .eq('is_active', true)
    .order('rating', { ascending: false });

  if (filters?.businessType) {
    query = query.eq('business_type', filters.businessType);
  }

  if (filters?.location) {
    query = query.or(`city.ilike.%${filters.location}%,region.ilike.%${filters.location}%,country.ilike.%${filters.location}%`);
  }

  if (filters?.verifiedOnly) {
    query = query.eq('verification_status', 'verified');
  }

  if (filters?.minRating) {
    query = query.gte('rating', filters.minRating);
  }

  const { data, error } = await query;

  if (error) throw error;
  return toCamelCase(data || []);
}

export async function getTopSellers(limit: number = 10): Promise<BusinessProfile[]> {
  const { data, error } = await supabase
    .from('business_profiles')
    .select('*')
    .eq('is_active', true)
    .in('business_type', ['farmer', 'aggregator', 'cooperative'])
    .gte('total_transactions', 1)
    .order('rating', { ascending: false })
    .order('total_transactions', { ascending: false })
    .limit(limit);

  if (error) throw error;
  return toCamelCase(data || []);
}

// ============================================
// SELLER REVIEWS
// ============================================

export async function getSellerReviews(sellerId: string): Promise<SellerReview[]> {
  const { data, error } = await supabase
    .from('seller_reviews')
    .select('*')
    .eq('seller_id', sellerId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return toCamelCase(data || []);
}

export async function addSellerReview(review: Omit<SellerReview, 'id' | 'createdAt' | 'helpful'>): Promise<SellerReview> {
  const userId = await getCurrentUserId();
  const { data: { user } } = await supabase.auth.getUser();
  const buyerName = user?.user_metadata?.name || user?.email || 'Anonymous';

  const reviewData = {
    ...toSnakeCase(review),
    buyer_id: userId,
    buyer_name: buyerName,
    helpful: 0,
  };

  const { data, error } = await supabase
    .from('seller_reviews')
    .insert([reviewData])
    .select()
    .single();

  if (error) throw error;

  // Update seller's average rating
  await updateSellerRating(review.sellerId);

  return toCamelCase(data);
}

export async function updateSellerReview(id: string, updates: Partial<SellerReview>): Promise<SellerReview> {
  const userId = await getCurrentUserId();

  // Verify ownership
  const { data: existing } = await supabase
    .from('seller_reviews')
    .select('buyer_id, seller_id')
    .eq('id', id)
    .single();

  if (!existing || existing.buyer_id !== userId) {
    throw new Error('You can only edit your own reviews');
  }

  const { data, error } = await supabase
    .from('seller_reviews')
    .update({
      ...toSnakeCase(updates),
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;

  // Update seller's average rating
  await updateSellerRating(existing.seller_id);

  return toCamelCase(data);
}

export async function deleteSellerReview(id: string): Promise<void> {
  const userId = await getCurrentUserId();

  // Verify ownership
  const { data: existing } = await supabase
    .from('seller_reviews')
    .select('buyer_id, seller_id')
    .eq('id', id)
    .single();

  if (!existing || existing.buyer_id !== userId) {
    throw new Error('You can only delete your own reviews');
  }

  const { error } = await supabase
    .from('seller_reviews')
    .delete()
    .eq('id', id);

  if (error) throw error;

  // Update seller's average rating
  await updateSellerRating(existing.seller_id);
}

export async function addSellerResponse(reviewId: string, response: string): Promise<SellerReview> {
  const userId = await getCurrentUserId();

  // Verify the current user is the seller being reviewed
  const { data: review } = await supabase
    .from('seller_reviews')
    .select('seller_id')
    .eq('id', reviewId)
    .single();

  if (!review) throw new Error('Review not found');

  const sellerProfile = await getBusinessProfile(userId);
  if (!sellerProfile || sellerProfile.userId !== review.seller_id) {
    throw new Error('Only the seller can respond to their reviews');
  }

  const { data, error } = await supabase
    .from('seller_reviews')
    .update({
      seller_response: response,
      seller_response_at: new Date().toISOString(),
    })
    .eq('id', reviewId)
    .select()
    .single();

  if (error) throw error;
  return toCamelCase(data);
}

export async function markReviewHelpful(reviewId: string): Promise<void> {
  const { error } = await supabase.rpc('increment_review_helpful', { review_id_param: reviewId });
  if (error) throw error;
}

async function updateSellerRating(sellerId: string): Promise<void> {
  // Calculate new average rating
  const { data: reviews, error } = await supabase
    .from('seller_reviews')
    .select('overall_rating')
    .eq('seller_id', sellerId);

  if (error) throw error;

  if (reviews && reviews.length > 0) {
    const avgRating = reviews.reduce((sum: number, r: { overall_rating: number }) => sum + r.overall_rating, 0) / reviews.length;

    await supabase
      .from('business_profiles')
      .update({
        rating: Math.round(avgRating * 10) / 10, // Round to 1 decimal
        total_ratings: reviews.length,
      })
      .eq('user_id', sellerId);
  }
}

// ============================================
// SAVED SEARCHES
// ============================================

export async function getSavedSearches(): Promise<SavedSearch[]> {
  const userId = await getCurrentUserId();
  const { data, error } = await supabase
    .from('saved_searches')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return toCamelCase(data || []);
}

export async function getSavedSearch(id: string): Promise<SavedSearch> {
  const userId = await getCurrentUserId();
  const { data, error } = await supabase
    .from('saved_searches')
    .select('*')
    .eq('id', id)
    .eq('user_id', userId)
    .single();

  if (error) throw error;
  return toCamelCase(data);
}

export async function createSavedSearch(search: {
  name: string;
  description?: string;
  criteria: SavedSearchCriteria;
  alertsEnabled?: boolean;
  alertFrequency?: 'instant' | 'daily' | 'weekly';
  alertMethod?: 'in_app' | 'email' | 'sms' | 'whatsapp';
}): Promise<SavedSearch> {
  const userId = await getCurrentUserId();

  const searchData = {
    user_id: userId,
    name: search.name,
    description: search.description,
    criteria: search.criteria,
    alerts_enabled: search.alertsEnabled || false,
    alert_frequency: search.alertFrequency || 'daily',
    alert_method: search.alertMethod || 'in_app',
    new_matches_count: 0,
    total_matches_found: 0,
    is_active: true,
  };

  const { data, error } = await supabase
    .from('saved_searches')
    .insert([searchData])
    .select()
    .single();

  if (error) throw error;
  return toCamelCase(data);
}

export async function updateSavedSearch(id: string, updates: Partial<SavedSearch>): Promise<SavedSearch> {
  const userId = await getCurrentUserId();

  const { data, error } = await supabase
    .from('saved_searches')
    .update({
      ...toSnakeCase(updates),
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .eq('user_id', userId)
    .select()
    .single();

  if (error) throw error;
  return toCamelCase(data);
}

export async function deleteSavedSearch(id: string): Promise<void> {
  const userId = await getCurrentUserId();
  const { error } = await supabase
    .from('saved_searches')
    .delete()
    .eq('id', id)
    .eq('user_id', userId);

  if (error) throw error;
}

// ============================================
// ORDERS
// ============================================

export interface CreateOrderData {
  deliveryMethod: 'pickup' | 'delivery';
  deliveryAddress?: string;
  deliveryCity?: string;
  deliveryRegion?: string;
  deliveryDate?: string;
  deliveryTimeSlot?: string;
  deliveryInstructions?: string;
  paymentMethod: 'mpesa' | 'bank_transfer' | 'cash_on_delivery' | 'credit';
  buyerName: string;
  buyerPhone: string;
  buyerEmail?: string;
  buyerNotes?: string;
  items: Array<{
    listingId: string;
    sellerId: string;
    sellerName: string;
    sellerPhone?: string;
    sellerWhatsapp?: string;
    productName: string;
    variety?: string;
    quantity: number;
    unit: string;
    pricePerUnit: number;
    totalPrice: number;
  }>;
  subtotal: number;
  deliveryFee: number;
  serviceFee: number;
  total: number;
}

export interface OrderWithItems {
  id: string;
  orderNumber: string;
  buyerId: string;
  buyerName: string;
  buyerPhone: string;
  buyerEmail?: string;
  deliveryMethod: 'pickup' | 'delivery';
  deliveryAddress?: string;
  deliveryCity?: string;
  deliveryRegion?: string;
  deliveryDate?: string;
  deliveryTimeSlot?: string;
  deliveryInstructions?: string;
  subtotal: number;
  deliveryFee: number;
  serviceFee: number;
  total: number;
  paymentMethod: string;
  paymentStatus: string;
  status: string;
  buyerNotes?: string;
  createdAt: string;
  updatedAt?: string;
  confirmedAt?: string;
  shippedAt?: string;
  deliveredAt?: string;
  cancelledAt?: string;
  cancellationReason?: string;
  items: Array<{
    id: string;
    orderId: string;
    listingId?: string;
    sellerId: string;
    sellerName: string;
    sellerPhone?: string;
    sellerWhatsapp?: string;
    productName: string;
    variety?: string;
    quantity: number;
    unit: string;
    pricePerUnit: number;
    totalPrice: number;
    itemStatus: string;
    sellerNotes?: string;
  }>;
  statusHistory?: Array<{
    id: string;
    status: string;
    note?: string;
    createdAt: string;
  }>;
}

// Generate order number on client side (backup if DB function fails)
function generateOrderNumberClient(): string {
  const year = new Date().getFullYear();
  const timestamp = Date.now().toString().slice(-6);
  return `AGR-${year}-${timestamp}`;
}

export async function createOrder(orderData: CreateOrderData): Promise<OrderWithItems> {
  const userId = await getCurrentUserId();

  // Generate order number
  let orderNumber: string;
  try {
    const { data: numberData, error: numberError } = await supabase.rpc('generate_order_number');
    if (numberError) throw numberError;
    orderNumber = numberData;
  } catch {
    orderNumber = generateOrderNumberClient();
  }

  // Create the order
  const { data: order, error: orderError } = await supabase
    .from('orders')
    .insert({
      order_number: orderNumber,
      buyer_id: userId,
      buyer_name: orderData.buyerName,
      buyer_phone: orderData.buyerPhone,
      buyer_email: orderData.buyerEmail,
      delivery_method: orderData.deliveryMethod,
      delivery_address: orderData.deliveryAddress,
      delivery_city: orderData.deliveryCity,
      delivery_region: orderData.deliveryRegion,
      delivery_date: orderData.deliveryDate,
      delivery_time_slot: orderData.deliveryTimeSlot,
      delivery_instructions: orderData.deliveryInstructions,
      subtotal: orderData.subtotal,
      delivery_fee: orderData.deliveryFee,
      service_fee: orderData.serviceFee,
      total: orderData.total,
      payment_method: orderData.paymentMethod,
      payment_status: 'pending',
      status: 'pending',
      buyer_notes: orderData.buyerNotes,
    })
    .select()
    .single();

  if (orderError) throw orderError;

  // Create order items
  const orderItems = orderData.items.map(item => ({
    order_id: order.id,
    listing_id: item.listingId,
    seller_id: item.sellerId,
    seller_name: item.sellerName,
    seller_phone: item.sellerPhone,
    seller_whatsapp: item.sellerWhatsapp,
    product_name: item.productName,
    variety: item.variety,
    quantity: item.quantity,
    unit: item.unit,
    price_per_unit: item.pricePerUnit,
    total_price: item.totalPrice,
    item_status: 'pending',
  }));

  const { data: items, error: itemsError } = await supabase
    .from('order_items')
    .insert(orderItems)
    .select();

  if (itemsError) throw itemsError;

  // Add initial status to history
  await supabase.from('order_status_history').insert({
    order_id: order.id,
    status: 'pending',
    note: 'Order placed',
    changed_by: userId,
  });

  // Deduct quantities from listings
  for (const item of orderData.items) {
    if (item.listingId) {
      // Get current listing quantity
      const { data: listing } = await supabase
        .from('marketplace_listings')
        .select('quantity, status')
        .eq('id', item.listingId)
        .single();

      if (listing) {
        const newQuantity = Math.max(0, listing.quantity - item.quantity);
        const newStatus = newQuantity === 0 ? 'sold' : listing.status;

        // Update the listing with reduced quantity
        await supabase
          .from('marketplace_listings')
          .update({
            quantity: newQuantity,
            status: newStatus,
            updated_at: new Date().toISOString(),
          })
          .eq('id', item.listingId);
      }
    }
  }

  return toCamelCase({
    ...order,
    items: items || [],
  });
}

export async function getBuyerOrders(): Promise<OrderWithItems[]> {
  const userId = await getCurrentUserId();

  const { data: orders, error } = await supabase
    .from('orders')
    .select(`
      *,
      order_items (*)
    `)
    .eq('buyer_id', userId)
    .order('created_at', { ascending: false });

  if (error) throw error;

  return toCamelCase(orders || []).map((order: any) => ({
    ...order,
    items: order.orderItems || [],
  }));
}

export async function getSellerOrders(): Promise<OrderWithItems[]> {
  const userId = await getCurrentUserId();

  // First get order items for this seller
  const { data: items, error: itemsError } = await supabase
    .from('order_items')
    .select('*')
    .eq('seller_id', userId)
    .order('created_at', { ascending: false });

  if (itemsError) {
    console.error('Error fetching order items for seller:', itemsError);
    // Return empty array instead of throwing to avoid breaking the UI
    return [];
  }

  if (!items || items.length === 0) {
    return [];
  }

  // Get unique order IDs
  const orderIds = [...new Set(items.map((item: any) => item.order_id))];

  // Fetch orders separately (this works because we have a policy for sellers to view orders containing their items)
  const { data: orders, error: ordersError } = await supabase
    .from('orders')
    .select('*')
    .in('id', orderIds);

  // Create a map of orders (even if empty)
  const ordersById = new Map<string, any>();

  if (ordersError) {
    console.error('Error fetching orders for seller:', ordersError);
    // If we can't get orders, create placeholders from items
  } else {
    (orders || []).forEach((order: any) => {
      ordersById.set(order.id, { ...order, items: [] });
    });
  }

  // Add items to their respective orders, creating placeholder orders if needed
  items.forEach((item: any) => {
    const orderId = item.order_id;
    if (!ordersById.has(orderId)) {
      // Create placeholder order from item data
      ordersById.set(orderId, {
        id: orderId,
        order_number: `Order-${orderId.slice(0, 8)}`,
        buyer_name: 'Buyer',
        buyer_phone: '',
        buyer_email: '',
        status: 'pending',
        payment_status: 'pending',
        delivery_method: 'delivery',
        subtotal: 0,
        delivery_fee: 0,
        service_fee: 0,
        total: 0,
        created_at: item.created_at,
        items: [],
      });
    }
    ordersById.get(orderId).items.push(item);
  });

  // Calculate totals for placeholder orders
  ordersById.forEach((order) => {
    if (order.subtotal === 0) {
      order.subtotal = order.items.reduce((sum: number, item: any) => sum + (item.total_price || 0), 0);
      order.total = order.subtotal;
    }
  });

  return toCamelCase(Array.from(ordersById.values()));
}

export async function getOrder(orderId: string): Promise<OrderWithItems | null> {
  const userId = await getCurrentUserId();

  const { data: order, error } = await supabase
    .from('orders')
    .select(`
      *,
      order_items (*),
      order_status_history (*)
    `)
    .eq('id', orderId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null; // Not found
    throw error;
  }

  // Check if user is buyer or seller
  const isBuyer = order.buyer_id === userId;
  const isSeller = order.order_items?.some((item: any) => item.seller_id === userId);

  if (!isBuyer && !isSeller) {
    throw new Error('Unauthorized to view this order');
  }

  return toCamelCase({
    ...order,
    items: order.order_items || [],
    statusHistory: order.order_status_history || [],
  });
}

export async function updateOrderStatus(
  orderId: string,
  newStatus: string,
  note?: string
): Promise<void> {
  const { error } = await supabase.rpc('update_order_status', {
    p_order_id: orderId,
    p_new_status: newStatus,
    p_note: note,
  });

  if (error) throw error;
}

export async function updateOrderItemStatus(
  itemId: string,
  newStatus: string,
  sellerNotes?: string
): Promise<void> {
  const userId = await getCurrentUserId();

  const { error } = await supabase
    .from('order_items')
    .update({
      item_status: newStatus,
      seller_notes: sellerNotes,
    })
    .eq('id', itemId)
    .eq('seller_id', userId);

  if (error) throw error;
}

export async function cancelOrder(orderId: string, reason: string): Promise<void> {
  const userId = await getCurrentUserId();

  const { error } = await supabase
    .from('orders')
    .update({
      status: 'cancelled',
      cancelled_at: new Date().toISOString(),
      cancellation_reason: reason,
    })
    .eq('id', orderId)
    .eq('buyer_id', userId)
    .in('status', ['pending', 'confirmed']); // Can only cancel if not yet shipped

  if (error) throw error;

  // Add to status history
  await supabase.from('order_status_history').insert({
    order_id: orderId,
    status: 'cancelled',
    note: reason,
    changed_by: userId,
  });
}

// ============================================
// SUBSCRIPTIONS
// ============================================

export interface SubscriptionData {
  name: string;
  frequency: 'daily' | 'weekly' | 'biweekly' | 'monthly';
  dayOfWeek?: number;
  dayOfMonth?: number;
  preferredTimeSlot?: string;
  deliveryMethod: 'pickup' | 'delivery';
  deliveryAddress?: string;
  deliveryCity?: string;
  deliveryRegion?: string;
  deliveryInstructions?: string;
  paymentMethod: 'mpesa' | 'bank_transfer' | 'cash_on_delivery' | 'credit';
  items: Array<{
    preferredSellerId?: string;
    categoryId?: string;
    subcategoryId?: string;
    productName: string;
    variety?: string;
    quantity: number;
    unit: string;
    maxPricePerUnit?: number;
    qualityPreference?: 'premium' | 'grade_a' | 'grade_b' | 'standard' | 'any';
  }>;
}

export interface Subscription {
  id: string;
  buyerId: string;
  name: string;
  frequency: string;
  dayOfWeek?: number;
  dayOfMonth?: number;
  preferredTimeSlot?: string;
  deliveryMethod: string;
  deliveryAddress?: string;
  deliveryCity?: string;
  deliveryRegion?: string;
  deliveryInstructions?: string;
  paymentMethod: string;
  status: string;
  nextOrderDate?: string;
  lastOrderDate?: string;
  totalOrdersPlaced: number;
  createdAt: string;
  updatedAt?: string;
  items: Array<{
    id: string;
    subscriptionId: string;
    preferredSellerId?: string;
    categoryId?: string;
    subcategoryId?: string;
    productName: string;
    variety?: string;
    quantity: number;
    unit: string;
    maxPricePerUnit?: number;
    qualityPreference?: string;
    isActive: boolean;
  }>;
}

// Calculate next order date based on frequency
function calculateNextOrderDate(frequency: string, dayOfWeek?: number, dayOfMonth?: number): string {
  const now = new Date();
  let nextDate = new Date();

  switch (frequency) {
    case 'daily':
      nextDate.setDate(now.getDate() + 1);
      break;
    case 'weekly':
      const currentDay = now.getDay();
      const targetDay = dayOfWeek ?? 1; // Default to Monday
      let daysUntil = targetDay - currentDay;
      if (daysUntil <= 0) daysUntil += 7;
      nextDate.setDate(now.getDate() + daysUntil);
      break;
    case 'biweekly':
      const currentDay2 = now.getDay();
      const targetDay2 = dayOfWeek ?? 1;
      let daysUntil2 = targetDay2 - currentDay2;
      if (daysUntil2 <= 0) daysUntil2 += 14;
      nextDate.setDate(now.getDate() + daysUntil2);
      break;
    case 'monthly':
      const targetDayOfMonth = dayOfMonth ?? 1;
      nextDate.setMonth(now.getMonth() + 1);
      nextDate.setDate(Math.min(targetDayOfMonth, new Date(nextDate.getFullYear(), nextDate.getMonth() + 1, 0).getDate()));
      break;
  }

  return nextDate.toISOString().split('T')[0];
}

export async function createSubscription(data: SubscriptionData): Promise<Subscription> {
  const userId = await getCurrentUserId();

  const nextOrderDate = calculateNextOrderDate(data.frequency, data.dayOfWeek, data.dayOfMonth);

  // Create subscription
  const { data: subscription, error: subError } = await supabase
    .from('order_subscriptions')
    .insert({
      buyer_id: userId,
      name: data.name,
      frequency: data.frequency,
      day_of_week: data.dayOfWeek,
      day_of_month: data.dayOfMonth,
      preferred_time_slot: data.preferredTimeSlot,
      delivery_method: data.deliveryMethod,
      delivery_address: data.deliveryAddress,
      delivery_city: data.deliveryCity,
      delivery_region: data.deliveryRegion,
      delivery_instructions: data.deliveryInstructions,
      payment_method: data.paymentMethod,
      status: 'active',
      next_order_date: nextOrderDate,
    })
    .select()
    .single();

  if (subError) throw subError;

  // Create subscription items
  const items = data.items.map(item => ({
    subscription_id: subscription.id,
    preferred_seller_id: item.preferredSellerId,
    category_id: item.categoryId,
    subcategory_id: item.subcategoryId,
    product_name: item.productName,
    variety: item.variety,
    quantity: item.quantity,
    unit: item.unit,
    max_price_per_unit: item.maxPricePerUnit,
    quality_preference: item.qualityPreference || 'any',
    is_active: true,
  }));

  const { data: subItems, error: itemsError } = await supabase
    .from('subscription_items')
    .insert(items)
    .select();

  if (itemsError) throw itemsError;

  return toCamelCase({
    ...subscription,
    items: subItems || [],
  });
}

export async function getSubscriptions(): Promise<Subscription[]> {
  const userId = await getCurrentUserId();

  const { data, error } = await supabase
    .from('order_subscriptions')
    .select(`
      *,
      subscription_items (*)
    `)
    .eq('buyer_id', userId)
    .order('created_at', { ascending: false });

  if (error) throw error;

  return toCamelCase(data || []).map((sub: any) => ({
    ...sub,
    items: sub.subscriptionItems || [],
  }));
}

export async function updateSubscriptionStatus(
  subscriptionId: string,
  status: 'active' | 'paused' | 'cancelled'
): Promise<void> {
  const userId = await getCurrentUserId();

  const updates: any = { status };
  if (status === 'paused') updates.paused_at = new Date().toISOString();
  if (status === 'cancelled') updates.cancelled_at = new Date().toISOString();

  const { error } = await supabase
    .from('order_subscriptions')
    .update(updates)
    .eq('id', subscriptionId)
    .eq('buyer_id', userId);

  if (error) throw error;
}

export async function deleteSubscription(subscriptionId: string): Promise<void> {
  const userId = await getCurrentUserId();

  const { error } = await supabase
    .from('order_subscriptions')
    .delete()
    .eq('id', subscriptionId)
    .eq('buyer_id', userId);

  if (error) throw error;
}
