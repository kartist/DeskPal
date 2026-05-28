import { create } from "zustand";

interface ToastState {
  message: string;
  visible: boolean;
  show: (msg: string, duration?: number) => void;
  hide: () => void;
}

export const useToast = create<ToastState>((set) => ({
  message: "",
  visible: false,
  show: (msg, duration = 1500) => {
    set({ message: msg, visible: true });
    setTimeout(() => {
      set({ visible: false, message: "" });
    }, duration);
  },
  hide: () => set({ visible: false, message: "" }),
}));
