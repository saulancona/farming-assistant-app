import { create } from 'zustand';
import type { Conversation } from '../types';

export type Tab = 'dashboard' | 'fields' | 'expenses' | 'income' | 'tasks' | 'inventory' | 'settings' | 'weather' | 'markets' | 'pestcontrol' | 'aichat' | 'community' | 'messages' | 'knowledge' | 'marketplace' | 'analytics' | 'calendar' | 'rewards' | 'learning' | 'missions' | 'shop' | 'referrals' | 'challenges' | 'teams' | 'story-quests' | 'harvests' | 'costs';

interface UIState {
  activeTab: Tab;
  isMobileMenuOpen: boolean;
  isLoading: boolean;
  showAuthModal: boolean;
  farmLocation: string;
  pendingConversation: Conversation | null; // For passing conversation between pages

  // Actions
  setActiveTab: (tab: Tab) => void;
  setIsMobileMenuOpen: (isOpen: boolean) => void;
  setIsLoading: (isLoading: boolean) => void;
  setShowAuthModal: (show: boolean) => void;
  setFarmLocation: (location: string) => void;
  setPendingConversation: (conversation: Conversation | null) => void;
  toggleMobileMenu: () => void;
  closeMobileMenu: () => void;
}

export const useUIStore = create<UIState>((set) => ({
  // Initial state
  activeTab: 'dashboard',
  isMobileMenuOpen: false,
  isLoading: true,
  showAuthModal: false,
  farmLocation: 'Nairobi, Kenya',
  pendingConversation: null,

  // Basic setters
  setActiveTab: (activeTab) => set({ activeTab, isMobileMenuOpen: false }), // Auto-close mobile menu on tab change
  setIsMobileMenuOpen: (isMobileMenuOpen) => set({ isMobileMenuOpen }),
  setIsLoading: (isLoading) => set({ isLoading }),
  setShowAuthModal: (showAuthModal) => set({ showAuthModal }),
  setFarmLocation: (farmLocation) => set({ farmLocation }),
  setPendingConversation: (pendingConversation) => set({ pendingConversation }),

  // Combined actions
  toggleMobileMenu: () => set((state) => ({ isMobileMenuOpen: !state.isMobileMenuOpen })),
  closeMobileMenu: () => set({ isMobileMenuOpen: false }),
}));
