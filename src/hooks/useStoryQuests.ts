import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import type {
  StoryQuestTemplate,
  UserStoryQuest,
  FeaturedStory,
  PriorityBuyerAccess,
  StoryMilestoneType,
} from '../types';

// ============================================
// GET STORY QUEST TEMPLATES
// ============================================

export function useStoryQuestTemplates(cropType?: string) {
  return useQuery({
    queryKey: ['storyQuestTemplates', cropType],
    queryFn: async (): Promise<StoryQuestTemplate[]> => {
      const { data, error } = await supabase.rpc('get_story_quest_templates', {
        p_crop_type: cropType || null,
      });

      if (error) throw error;

      return (data || []).map((row: Record<string, unknown>) => ({
        id: row.id as string,
        name: row.name as string,
        nameSw: row.nameSw as string | undefined,
        description: row.description as string | undefined,
        descriptionSw: row.descriptionSw as string | undefined,
        cropType: row.cropType as string,
        pointsReward: (row.pointsReward as number) || 30,
        xpReward: (row.xpReward as number) || 50,
        badgeName: (row.badgeName as string) || 'Yield Champion',
        badgeIcon: (row.badgeIcon as string) || '🏆',
        expectedDays: (row.expectedDays as number) || 90,
        grantsPriorityAccess: row.grantsPriorityAccess as boolean,
        featureStoryEligible: row.featureStoryEligible as boolean,
      }));
    },
    staleTime: 300000, // 5 minutes
  });
}

// ============================================
// GET USER'S STORY QUESTS
// ============================================

export function useUserStoryQuests(userId: string | undefined) {
  return useQuery({
    queryKey: ['userStoryQuests', userId],
    queryFn: async (): Promise<UserStoryQuest[]> => {
      if (!userId) return [];

      const { data, error } = await supabase.rpc('get_user_story_quests', {
        p_user_id: userId,
      });

      if (error) throw error;

      return (data || []).map((row: Record<string, unknown>) => ({
        id: row.id as string,
        templateId: row.templateId as string,
        fieldId: row.fieldId as string | undefined,
        status: row.status as UserStoryQuest['status'],
        milestonesCompleted: (row.milestonesCompleted as number) || 0,
        startedAt: row.startedAt as string,
        targetDate: row.targetDate as string,
        completedAt: row.completedAt as string | undefined,
        pointsAwarded: (row.pointsAwarded as number) || 0,
        xpAwarded: (row.xpAwarded as number) || 0,
        badgeAwarded: row.badgeAwarded as boolean,
        priorityAccessGranted: row.priorityAccessGranted as boolean,
        priorityAccessExpires: row.priorityAccessExpires as string | undefined,
        template: row.template as StoryQuestTemplate,
        photos: (row.photos as UserStoryQuest['photos']) || [],
      }));
    },
    enabled: !!userId,
  });
}

// ============================================
// START STORY QUEST
// ============================================

export function useStartStoryQuest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      userId,
      templateId,
      fieldId,
    }: {
      userId: string;
      templateId: string;
      fieldId?: string;
    }) => {
      const { data, error } = await supabase.rpc('start_story_quest', {
        p_user_id: userId,
        p_template_id: templateId,
        p_field_id: fieldId || null,
      });

      if (error) throw error;
      if (!data.success) throw new Error(data.error || 'Failed to start story quest');

      return {
        questId: data.quest_id as string,
        cropType: data.crop_type as string,
        targetDate: data.target_date as string,
      };
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['userStoryQuests', variables.userId] });
    },
  });
}

// ============================================
// UPLOAD MILESTONE PHOTO
// ============================================

export function useUploadMilestonePhoto() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      userId,
      questId,
      milestoneType,
      photoUrl,
      caption,
      latitude,
      longitude,
    }: {
      userId: string;
      questId: string;
      milestoneType: StoryMilestoneType;
      photoUrl: string;
      caption?: string;
      latitude?: number;
      longitude?: number;
    }) => {
      const { data, error } = await supabase.rpc('upload_milestone_photo', {
        p_user_id: userId,
        p_quest_id: questId,
        p_milestone_type: milestoneType,
        p_photo_url: photoUrl,
        p_caption: caption || null,
        p_latitude: latitude || null,
        p_longitude: longitude || null,
      });

      if (error) throw error;
      if (!data.success) throw new Error(data.error || 'Failed to upload photo');

      return {
        photoId: data.photo_id as string,
        milestonesCompleted: data.milestones_completed as number,
        xpAwarded: data.xp_awarded as number,
        questCompleted: data.quest_completed as boolean,
      };
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['userStoryQuests', variables.userId] });
      queryClient.invalidateQueries({ queryKey: ['rewardsProfile', variables.userId] });
    },
  });
}

// ============================================
// GET FEATURED STORIES
// ============================================

export function useFeaturedStories(limit: number = 10) {
  return useQuery({
    queryKey: ['featuredStories', limit],
    queryFn: async (): Promise<FeaturedStory[]> => {
      const { data, error } = await supabase.rpc('get_featured_stories', {
        p_limit: limit,
      });

      if (error) throw error;

      return (data || []).map((row: Record<string, unknown>) => ({
        id: row.id as string,
        title: row.title as string,
        titleSw: row.titleSw as string | undefined,
        summary: row.summary as string | undefined,
        summarySw: row.summarySw as string | undefined,
        viewCount: (row.viewCount as number) || 0,
        likeCount: (row.likeCount as number) || 0,
        publishedAt: row.publishedAt as string,
        farmer: row.farmer as FeaturedStory['farmer'],
        quest: row.quest as FeaturedStory['quest'],
        photos: (row.photos as FeaturedStory['photos']) || [],
      }));
    },
    staleTime: 60000, // 1 minute
  });
}

// ============================================
// CHECK PRIORITY BUYER ACCESS
// ============================================

export function usePriorityBuyerAccess(userId: string | undefined) {
  return useQuery({
    queryKey: ['priorityBuyerAccess', userId],
    queryFn: async (): Promise<PriorityBuyerAccess> => {
      if (!userId) {
        return { hasAccess: false, message: 'Not logged in' };
      }

      const { data, error } = await supabase.rpc('check_priority_access', {
        p_user_id: userId,
      });

      if (error) throw error;

      return {
        hasAccess: data.hasAccess as boolean,
        expiresAt: data.expiresAt as string | undefined,
        connectionsUsed: data.connectionsUsed as number | undefined,
        message: data.message as string | undefined,
      };
    },
    enabled: !!userId,
    staleTime: 300000, // 5 minutes
  });
}

// ============================================
// HELPER FUNCTIONS
// ============================================

export const MILESTONE_CONFIG: Record<
  StoryMilestoneType,
  { order: number; labelEn: string; labelSw: string; icon: string; description: string }
> = {
  land_before: {
    order: 1,
    labelEn: 'Land Before Planting',
    labelSw: 'Ardhi Kabla ya Kupanda',
    icon: '🌍',
    description: 'Take a photo of your prepared land before planting',
  },
  germination: {
    order: 2,
    labelEn: 'Germination',
    labelSw: 'Kuota',
    icon: '🌱',
    description: 'Capture your crops as they begin to sprout',
  },
  flowering: {
    order: 3,
    labelEn: 'Flowering',
    labelSw: 'Kutoa Maua',
    icon: '🌸',
    description: 'Document the flowering stage of your crops',
  },
  pre_harvest: {
    order: 4,
    labelEn: 'Before Harvest',
    labelSw: 'Kabla ya Kuvuna',
    icon: '🌾',
    description: 'Show your crops ready for harvest',
  },
  storage: {
    order: 5,
    labelEn: 'Storage/Harvest',
    labelSw: 'Uhifadhi/Mavuno',
    icon: '🏆',
    description: 'Final photo of your harvested and stored produce',
  },
};

export function getMilestoneLabel(type: StoryMilestoneType, isSwahili: boolean = false): string {
  const config = MILESTONE_CONFIG[type];
  return isSwahili ? config.labelSw : config.labelEn;
}

export function getMilestoneIcon(type: StoryMilestoneType): string {
  return MILESTONE_CONFIG[type].icon;
}

export function getMilestoneOrder(type: StoryMilestoneType): number {
  return MILESTONE_CONFIG[type].order;
}

export function getNextMilestone(
  completedMilestones: StoryMilestoneType[]
): StoryMilestoneType | null {
  const milestoneOrder: StoryMilestoneType[] = [
    'land_before',
    'germination',
    'flowering',
    'pre_harvest',
    'storage',
  ];

  for (const milestone of milestoneOrder) {
    if (!completedMilestones.includes(milestone)) {
      return milestone;
    }
  }

  return null; // All completed
}

export function calculateQuestProgress(milestonesCompleted: number): number {
  return Math.min(100, Math.round((milestonesCompleted / 5) * 100));
}

export function getCropIcon(cropType: string): string {
  const icons: Record<string, string> = {
    maize: '🌽',
    beans: '🫘',
    tomatoes: '🍅',
    rice: '🍚',
    cassava: '🥔',
    sweet_potato: '🍠',
    coffee: '☕',
    vegetables: '🥬',
    wheat: '🌾',
    sorghum: '🌾',
    millet: '🌾',
  };
  return icons[cropType.toLowerCase()] || '🌱';
}

export function getCropLabel(cropType: string, isSwahili: boolean = false): string {
  const labels: Record<string, { en: string; sw: string }> = {
    maize: { en: 'Maize', sw: 'Mahindi' },
    beans: { en: 'Beans', sw: 'Maharage' },
    tomatoes: { en: 'Tomatoes', sw: 'Nyanya' },
    rice: { en: 'Rice', sw: 'Mpunga' },
    cassava: { en: 'Cassava', sw: 'Muhogo' },
    sweet_potato: { en: 'Sweet Potato', sw: 'Viazi Vitamu' },
    coffee: { en: 'Coffee', sw: 'Kahawa' },
    vegetables: { en: 'Vegetables', sw: 'Mboga' },
    wheat: { en: 'Wheat', sw: 'Ngano' },
    sorghum: { en: 'Sorghum', sw: 'Mtama' },
    millet: { en: 'Millet', sw: 'Uwele' },
  };

  const label = labels[cropType.toLowerCase()];
  if (!label) return cropType;
  return isSwahili ? label.sw : label.en;
}
