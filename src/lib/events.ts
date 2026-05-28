import { listen } from "@tauri-apps/api/event";
import { useStore } from "../store";
import { togglePanel } from "./ipc";

export function listenToEvents(): () => void {
  const unlisteners: Array<() => void> = [];

  // Window state changed (used by hotkey/tray — Rust toggles directly)
  // IPC-driven toggles get state from the return value directly
  const unlistenState = listen<{ state: string }>("window-state-changed", (event) => {
    const mode = event.payload.state as "dormant" | "expanded";
    useStore.getState().setWindowMode(mode);
  });
  unlisteners.push(() => { unlistenState.then((fn) => fn()); });

  // Blur: Rust detects real blur (150ms delay, excludes resize)
  const unlistenBlur = listen<Record<string, never>>("window-blur", () => {
    const { pinned, windowMode } = useStore.getState();
    if (!pinned && windowMode === "expanded") {
      togglePanel().then((result) => {
        useStore.getState().setWindowMode(result as "dormant" | "expanded");
      });
    }
  });
  unlisteners.push(() => { unlistenBlur.then((fn) => fn()); });

  return () => { unlisteners.forEach((fn) => fn()); };
}
