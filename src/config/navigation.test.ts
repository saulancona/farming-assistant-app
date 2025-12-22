import { describe, it, expect } from 'vitest';
import {
  navigationItems,
  navigationCategories,
  getNavigationItemsByCategory,
  voiceLabelKeys
} from './navigation';

describe('navigation config', () => {
  it('should have all navigation categories defined', () => {
    expect(navigationCategories).toHaveLength(7);
    const categoryIds = navigationCategories.map(c => c.id);
    expect(categoryIds).toContain('home');
    expect(categoryIds).toContain('farm');
    expect(categoryIds).toContain('money');
    expect(categoryIds).toContain('market');
    expect(categoryIds).toContain('learn');
    expect(categoryIds).toContain('rewards');
    expect(categoryIds).toContain('settings');
  });

  it('should have navigation items for each category', () => {
    const categories = ['home', 'farm', 'money', 'market', 'learn', 'rewards', 'settings'] as const;
    categories.forEach(category => {
      const items = getNavigationItemsByCategory(category);
      expect(items.length).toBeGreaterThan(0);
    });
  });

  it('should have all required properties for navigation items', () => {
    navigationItems.forEach(item => {
      expect(item).toHaveProperty('id');
      expect(item).toHaveProperty('labelKey');
      expect(item).toHaveProperty('labelDefault');
      expect(item).toHaveProperty('icon');
      expect(item).toHaveProperty('category');
    });
  });

  it('should have voice labels for all tabs', () => {
    navigationItems.forEach(item => {
      expect(voiceLabelKeys[item.id]).toBeDefined();
    });
  });

  it('should include all gamification features in rewards category', () => {
    const rewardsItems = getNavigationItemsByCategory('rewards');
    const rewardIds = rewardsItems.map(r => r.id);

    expect(rewardIds).toContain('rewards');
    expect(rewardIds).toContain('missions');
    expect(rewardIds).toContain('challenges');
    expect(rewardIds).toContain('referrals');
    expect(rewardIds).toContain('shop');
    expect(rewardIds).toContain('teams');
    expect(rewardIds).toContain('story-quests');
  });
});
