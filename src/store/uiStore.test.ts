import { describe, it, expect, beforeEach } from 'vitest';
import { useUIStore } from './uiStore';

describe('uiStore', () => {
  beforeEach(() => {
    // Reset store state before each test
    useUIStore.setState({
      activeTab: 'dashboard',
      isMobileMenuOpen: false,
      isLoading: true,
      showAuthModal: false,
      farmLocation: 'Nairobi, Kenya',
    });
  });

  it('should have default state', () => {
    const state = useUIStore.getState();
    expect(state.activeTab).toBe('dashboard');
    expect(state.isMobileMenuOpen).toBe(false);
    expect(state.farmLocation).toBe('Nairobi, Kenya');
  });

  it('should set active tab', () => {
    const { setActiveTab } = useUIStore.getState();
    setActiveTab('fields');
    expect(useUIStore.getState().activeTab).toBe('fields');
  });

  it('should toggle mobile menu', () => {
    const { toggleMobileMenu } = useUIStore.getState();
    expect(useUIStore.getState().isMobileMenuOpen).toBe(false);
    toggleMobileMenu();
    expect(useUIStore.getState().isMobileMenuOpen).toBe(true);
    toggleMobileMenu();
    expect(useUIStore.getState().isMobileMenuOpen).toBe(false);
  });

  it('should close mobile menu when tab changes', () => {
    // First open the menu
    useUIStore.setState({ isMobileMenuOpen: true });
    expect(useUIStore.getState().isMobileMenuOpen).toBe(true);

    // Change tab - should auto-close menu
    const { setActiveTab } = useUIStore.getState();
    setActiveTab('markets');
    expect(useUIStore.getState().isMobileMenuOpen).toBe(false);
  });

  it('should set farm location', () => {
    const { setFarmLocation } = useUIStore.getState();
    setFarmLocation('Mombasa, Kenya');
    expect(useUIStore.getState().farmLocation).toBe('Mombasa, Kenya');
  });

  it('should toggle auth modal', () => {
    const { setShowAuthModal } = useUIStore.getState();
    expect(useUIStore.getState().showAuthModal).toBe(false);
    setShowAuthModal(true);
    expect(useUIStore.getState().showAuthModal).toBe(true);
  });
});
