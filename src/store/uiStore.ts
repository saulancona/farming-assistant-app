import { create } from 'zustand';

export type Tab = 'dashboard' | 'fields' | 'expenses' | 'income' | 'tasks' | 'inventory' | 'storage' | 'settings' | 'weather' | 'markets' | 'pestcontrol' | 'aichat' | 'community' | 'messages' | 'knowledge' | 'marketplace' | 'analytics' | 'calendar' | 'rewards' | 'learning' | 'missions' | 'shop' | 'referrals' | 'challenges' | 'photo-challenges' | 'teams' | 'story-quests';

interface UIState {
  activeTab: Tab;
  isMobileMenuOpen: boolean;
  isLoading: boolean;
  showAuthModal: boolean;
  farmLocation: string;

  // Actions
  setActiveTab: (tab: Tab) => void;
  setIsMobileMenuOpen: (isOpen: boolean) => void;
  setIsLoading: (isLoading: boolean) => void;
  setShowAuthModal: (show: boolean) => void;
  setFarmLocation: (location: string) => void;
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

  // Basic setters
  setActiveTab: (activeTab) => set({ activeTab, isMobileMenuOpen: false }), // Auto-close mobile menu on tab change
  setIsMobileMenuOpen: (isMobileMenuOpen) => set({ isMobileMenuOpen }),
  setIsLoading: (isLoading) => set({ isLoading }),
  setShowAuthModal: (showAuthModal) => set({ showAuthModal }),
  setFarmLocation: (farmLocation) => set({ farmLocation }),

  // Combined actions
  toggleMobileMenu: () => set((state) => ({ isMobileMenuOpen: !state.isMobileMenuOpen })),
  closeMobileMenu: () => set({ isMobileMenuOpen: false }),
}));
