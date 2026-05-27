import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const useTaskStore = create(
  persist(
    (set, get) => ({
      taskTemplates: [],

      setTaskTemplates: (templates) => set({ taskTemplates: templates }),
      
      addTaskTemplate: (task) => set((state) => ({
        taskTemplates: [...state.taskTemplates, { id: Date.now(), text: task, createdAt: new Date().toISOString() }]
      })),
      
      removeTaskTemplate: (id) => set((state) => ({
        taskTemplates: state.taskTemplates.filter(t => t.id !== id)
      })),
    }),
    {
      name: 'qcesd-tasks',
    }
  )
);