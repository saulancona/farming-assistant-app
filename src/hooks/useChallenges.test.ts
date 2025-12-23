import { describe, it, expect } from 'vitest';
import {
  getChallengeTypeInfo,
  getPhotoTypeInfo,
  calculateChallengeTimeRemaining,
} from './useChallenges';

describe('useChallenges utility functions', () => {
  describe('getChallengeTypeInfo', () => {
    it('should return correct info for photo type', () => {
      const info = getChallengeTypeInfo('photo');
      expect(info.name).toBe('Photo');
      expect(info.nameSw).toBe('Picha');
      expect(info.icon).toBe('📷');
      expect(info.color).toBe('purple');
    });

    it('should return correct info for activity type', () => {
      const info = getChallengeTypeInfo('activity');
      expect(info.name).toBe('Activity');
      expect(info.nameSw).toBe('Shughuli');
      expect(info.icon).toBe('✅');
      expect(info.color).toBe('blue');
    });

    it('should return correct info for learning type', () => {
      const info = getChallengeTypeInfo('learning');
      expect(info.name).toBe('Learning');
      expect(info.nameSw).toBe('Kujifunza');
      expect(info.icon).toBe('📚');
      expect(info.color).toBe('emerald');
    });

    it('should return correct info for marketplace type', () => {
      const info = getChallengeTypeInfo('marketplace');
      expect(info.name).toBe('Marketplace');
      expect(info.nameSw).toBe('Soko');
      expect(info.icon).toBe('🏪');
      expect(info.color).toBe('amber');
    });

    it('should return correct info for community type', () => {
      const info = getChallengeTypeInfo('community');
      expect(info.name).toBe('Community');
      expect(info.nameSw).toBe('Jamii');
      expect(info.icon).toBe('👥');
      expect(info.color).toBe('pink');
    });

    it('should return activity as default for unknown type', () => {
      const info = getChallengeTypeInfo('unknown' as any);
      expect(info.name).toBe('Activity');
    });
  });

  describe('getPhotoTypeInfo', () => {
    it('should return correct info for pest type', () => {
      const info = getPhotoTypeInfo('pest');
      expect(info.name).toBe('Pest/Disease');
      expect(info.nameSw).toBe('Wadudu/Ugonjwa');
      expect(info.icon).toBe('🐛');
    });

    it('should return correct info for crop type', () => {
      const info = getPhotoTypeInfo('crop');
      expect(info.name).toBe('Crop');
      expect(info.nameSw).toBe('Mazao');
      expect(info.icon).toBe('🌾');
    });

    it('should return correct info for soil type', () => {
      const info = getPhotoTypeInfo('soil');
      expect(info.name).toBe('Soil');
      expect(info.nameSw).toBe('Udongo');
      expect(info.icon).toBe('🪴');
    });

    it('should return correct info for harvest type', () => {
      const info = getPhotoTypeInfo('harvest');
      expect(info.name).toBe('Harvest');
      expect(info.nameSw).toBe('Mavuno');
      expect(info.icon).toBe('🧺');
    });

    it('should return correct info for field type', () => {
      const info = getPhotoTypeInfo('field');
      expect(info.name).toBe('Field');
      expect(info.nameSw).toBe('Shamba');
      expect(info.icon).toBe('🏞️');
    });

    it('should return other as default for unknown type', () => {
      const info = getPhotoTypeInfo('unknown' as any);
      expect(info.name).toBe('Other');
      expect(info.icon).toBe('📸');
    });
  });

  describe('calculateChallengeTimeRemaining', () => {
    it('should return "Ongoing" for undefined end date', () => {
      expect(calculateChallengeTimeRemaining(undefined)).toBe('Ongoing');
    });

    it('should return "Expired" for past date', () => {
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 5);
      expect(calculateChallengeTimeRemaining(pastDate.toISOString())).toBe('Expired');
    });

    it('should return "Ends today" for today', () => {
      const today = new Date();
      // Set to end of today to ensure it's still "today"
      today.setHours(23, 59, 59, 999);
      const result = calculateChallengeTimeRemaining(today.toISOString());
      expect(['Ends today', '1 day left']).toContain(result);
    });

    it('should return "1 day left" for tomorrow', () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(12, 0, 0, 0);
      const result = calculateChallengeTimeRemaining(tomorrow.toISOString());
      expect(['1 day left', '2 days left']).toContain(result);
    });

    it('should return "X days left" for future dates', () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 10);
      const result = calculateChallengeTimeRemaining(futureDate.toISOString());
      expect(result).toMatch(/\d+ days left/);
    });
  });
});
