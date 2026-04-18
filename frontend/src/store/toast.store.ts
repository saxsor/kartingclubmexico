import { create } from 'zustand';

export type ToastType = 'error' | 'success' | 'info';

interface Toast {
  id: string;
  type: ToastType;
  message: string;
  exiting?: boolean;
}

interface ToastStore {
  toasts: Toast[];
  add: (type: ToastType, message: string) => void;
  startExit: (id: string) => void;
  remove: (id: string) => void;
}

export const useToastStore = create<ToastStore>((set, get) => ({
  toasts: [],
  add: (type, message) => {
    const id = Math.random().toString(36).slice(2);
    set((s) => ({ toasts: [...s.toasts, { id, type, message }] }));
    setTimeout(() => get().startExit(id), 3800);
  },
  startExit: (id) => {
    set((s) => ({ toasts: s.toasts.map((t) => t.id === id ? { ...t, exiting: true } : t) }));
    setTimeout(() => get().remove(id), 200);
  },
  remove: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}));

export const toast = {
  error: (msg: string) => useToastStore.getState().add('error', msg),
  success: (msg: string) => useToastStore.getState().add('success', msg),
  info: (msg: string) => useToastStore.getState().add('info', msg),
};
