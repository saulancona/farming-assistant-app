import { describe, it, expect } from 'vitest';

// Test the toCamelCase helper function logic
describe('useRewards helper functions', () => {
  // Replicating the toCamelCase function for testing
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

  describe('toCamelCase', () => {
    it('should convert snake_case keys to camelCase', () => {
      const input = { user_id: '123', first_name: 'John' };
      const result = toCamelCase(input);
      expect(result).toEqual({ userId: '123', firstName: 'John' });
    });

    it('should handle nested objects', () => {
      const input = {
        user_profile: {
          user_name: 'john',
          last_login: '2024-01-01',
        },
      };
      const result = toCamelCase(input);
      expect(result).toEqual({
        userProfile: {
          userName: 'john',
          lastLogin: '2024-01-01',
        },
      });
    });

    it('should handle arrays of objects', () => {
      const input = [
        { user_id: '1', created_at: '2024-01-01' },
        { user_id: '2', created_at: '2024-01-02' },
      ];
      const result = toCamelCase(input);
      expect(result).toEqual([
        { userId: '1', createdAt: '2024-01-01' },
        { userId: '2', createdAt: '2024-01-02' },
      ]);
    });

    it('should handle primitive values', () => {
      expect(toCamelCase('hello')).toBe('hello');
      expect(toCamelCase(123)).toBe(123);
      expect(toCamelCase(null)).toBe(null);
      expect(toCamelCase(undefined)).toBe(undefined);
      expect(toCamelCase(true)).toBe(true);
    });

    it('should handle empty objects and arrays', () => {
      expect(toCamelCase({})).toEqual({});
      expect(toCamelCase([])).toEqual([]);
    });

    it('should handle keys with multiple underscores', () => {
      const input = { total_xp_earned: 100, daily_streak_count: 5 };
      const result = toCamelCase(input);
      expect(result).toEqual({ totalXpEarned: 100, dailyStreakCount: 5 });
    });

    it('should not modify keys without underscores', () => {
      const input = { userId: '123', name: 'John' };
      const result = toCamelCase(input);
      expect(result).toEqual({ userId: '123', name: 'John' });
    });
  });
});

describe('XP and Level calculations', () => {
  // Based on the level definitions in the app
  const levelDefinitions = [
    { level: 1, minXp: 0, maxXp: 99, title: 'Seedling', titleSw: 'Mche' },
    { level: 2, minXp: 100, maxXp: 249, title: 'Sprout', titleSw: 'Chipukizi' },
    { level: 3, minXp: 250, maxXp: 499, title: 'Grower', titleSw: 'Mkuzaji' },
    { level: 4, minXp: 500, maxXp: 999, title: 'Cultivator', titleSw: 'Mkulima' },
    { level: 5, minXp: 1000, maxXp: 1999, title: 'Farmer', titleSw: 'Mkulima Hodari' },
    { level: 6, minXp: 2000, maxXp: 3499, title: 'Expert Farmer', titleSw: 'Mtaalamu' },
    { level: 7, minXp: 3500, maxXp: 5499, title: 'Master Farmer', titleSw: 'Bingwa' },
    { level: 8, minXp: 5500, maxXp: 7999, title: 'Farm Champion', titleSw: 'Shujaa wa Kilimo' },
    { level: 9, minXp: 8000, maxXp: 11999, title: 'Agricultural Hero', titleSw: 'Shujaa wa Ukulima' },
    { level: 10, minXp: 12000, maxXp: Infinity, title: 'Legendary Farmer', titleSw: 'Mkulima wa Hekima' },
  ];

  function getLevelForXP(xp: number): number {
    for (let i = levelDefinitions.length - 1; i >= 0; i--) {
      if (xp >= levelDefinitions[i].minXp) {
        return levelDefinitions[i].level;
      }
    }
    return 1;
  }

  function getXPProgressToNextLevel(xp: number, currentLevel: number) {
    const currentLevelDef = levelDefinitions.find(l => l.level === currentLevel);
    const nextLevelDef = levelDefinitions.find(l => l.level === currentLevel + 1);

    if (!currentLevelDef) return { current: 0, needed: 100, percentage: 0 };
    if (!nextLevelDef) return { current: xp, needed: xp, percentage: 100 }; // Max level

    const xpInCurrentLevel = xp - currentLevelDef.minXp;
    const xpNeededForNextLevel = nextLevelDef.minXp - currentLevelDef.minXp;
    const percentage = Math.min((xpInCurrentLevel / xpNeededForNextLevel) * 100, 100);

    return {
      current: xpInCurrentLevel,
      needed: xpNeededForNextLevel,
      percentage: Math.round(percentage),
    };
  }

  describe('getLevelForXP', () => {
    it('should return level 1 for 0 XP', () => {
      expect(getLevelForXP(0)).toBe(1);
    });

    it('should return level 1 for 99 XP', () => {
      expect(getLevelForXP(99)).toBe(1);
    });

    it('should return level 2 for 100 XP', () => {
      expect(getLevelForXP(100)).toBe(2);
    });

    it('should return level 5 for 1500 XP', () => {
      expect(getLevelForXP(1500)).toBe(5);
    });

    it('should return level 10 for 12000+ XP', () => {
      expect(getLevelForXP(12000)).toBe(10);
      expect(getLevelForXP(50000)).toBe(10);
    });
  });

  describe('getXPProgressToNextLevel', () => {
    it('should calculate progress for level 1', () => {
      const progress = getXPProgressToNextLevel(50, 1);
      expect(progress.current).toBe(50);
      expect(progress.needed).toBe(100); // 100 - 0
      expect(progress.percentage).toBe(50);
    });

    it('should calculate progress for level 2', () => {
      const progress = getXPProgressToNextLevel(175, 2);
      expect(progress.current).toBe(75); // 175 - 100
      expect(progress.needed).toBe(150); // 250 - 100
      expect(progress.percentage).toBe(50);
    });

    it('should return 100% for max level', () => {
      const progress = getXPProgressToNextLevel(15000, 10);
      expect(progress.percentage).toBe(100);
    });

    it('should handle edge case at level boundary', () => {
      const progress = getXPProgressToNextLevel(100, 2);
      expect(progress.current).toBe(0);
      expect(progress.percentage).toBe(0);
    });
  });
});

describe('Streak calculations', () => {
  function calculateStreakBonus(streak: number): number {
    if (streak >= 30) return 50; // 50% bonus
    if (streak >= 14) return 30; // 30% bonus
    if (streak >= 7) return 20; // 20% bonus
    if (streak >= 3) return 10; // 10% bonus
    return 0;
  }

  describe('calculateStreakBonus', () => {
    it('should return 0% for streak less than 3', () => {
      expect(calculateStreakBonus(0)).toBe(0);
      expect(calculateStreakBonus(1)).toBe(0);
      expect(calculateStreakBonus(2)).toBe(0);
    });

    it('should return 10% for streak 3-6', () => {
      expect(calculateStreakBonus(3)).toBe(10);
      expect(calculateStreakBonus(5)).toBe(10);
      expect(calculateStreakBonus(6)).toBe(10);
    });

    it('should return 20% for streak 7-13', () => {
      expect(calculateStreakBonus(7)).toBe(20);
      expect(calculateStreakBonus(10)).toBe(20);
      expect(calculateStreakBonus(13)).toBe(20);
    });

    it('should return 30% for streak 14-29', () => {
      expect(calculateStreakBonus(14)).toBe(30);
      expect(calculateStreakBonus(20)).toBe(30);
      expect(calculateStreakBonus(29)).toBe(30);
    });

    it('should return 50% for streak 30+', () => {
      expect(calculateStreakBonus(30)).toBe(50);
      expect(calculateStreakBonus(100)).toBe(50);
    });
  });
});

describe('Achievement progress calculations', () => {
  function calculateAchievementProgress(
    currentValue: number,
    targetValue: number
  ): { progress: number; percentage: number; isComplete: boolean } {
    const progress = Math.min(currentValue, targetValue);
    const percentage = Math.round((progress / targetValue) * 100);
    const isComplete = currentValue >= targetValue;

    return { progress, percentage, isComplete };
  }

  describe('calculateAchievementProgress', () => {
    it('should calculate progress correctly for partial completion', () => {
      const result = calculateAchievementProgress(5, 10);
      expect(result.progress).toBe(5);
      expect(result.percentage).toBe(50);
      expect(result.isComplete).toBe(false);
    });

    it('should return 100% for completed achievements', () => {
      const result = calculateAchievementProgress(10, 10);
      expect(result.progress).toBe(10);
      expect(result.percentage).toBe(100);
      expect(result.isComplete).toBe(true);
    });

    it('should cap progress at target', () => {
      const result = calculateAchievementProgress(15, 10);
      expect(result.progress).toBe(10);
      expect(result.percentage).toBe(100);
      expect(result.isComplete).toBe(true);
    });

    it('should handle zero progress', () => {
      const result = calculateAchievementProgress(0, 10);
      expect(result.progress).toBe(0);
      expect(result.percentage).toBe(0);
      expect(result.isComplete).toBe(false);
    });
  });
});
