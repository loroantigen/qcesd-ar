import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const useStore = create(
  persist(
    (set) => ({
      user: null,
      userData: null,
      isLoading: true,
      sidebarOpen: true,
      darkMode: false,
      setUser: (user) => set({ user }),
      setUserData: (userData) => set({ userData }),
      setIsLoading: (isLoading) => set({ isLoading }),
      toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
      toggleDarkMode: () => set((state) => ({ darkMode: !state.darkMode })),
    }),
    {
      name: 'qcesd-storage',
      partialize: (state) => ({ darkMode: state.darkMode, sidebarOpen: state.sidebarOpen }),
    }
  )
);