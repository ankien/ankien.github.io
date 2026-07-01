import { create } from "zustand";
import { setMuted, setVolume } from "./interaction/sounds";

interface SceneState {
  /** Global mute toggle for the synthesized tap sounds. */
  muted: boolean;
  toggleMuted: () => void;

  /** Master SFX volume, 0..1. */
  volume: number;
  setVolume: (v: number) => void;

  /** Bumped to remount every movable prop back to its starting position. */
  resetNonce: number;
  reloadProps: () => void;
}

const INITIAL_VOLUME = 0.55;
setVolume(INITIAL_VOLUME);

export const useSceneStore = create<SceneState>((set) => ({
  muted: false,
  toggleMuted: () =>
    set((s) => {
      const muted = !s.muted;
      setMuted(muted);
      return { muted };
    }),

  volume: INITIAL_VOLUME,
  setVolume: (v) => {
    const volume = Math.min(1, Math.max(0, v));
    setVolume(volume);
    set({ volume });
  },

  resetNonce: 0,
  reloadProps: () => set((s) => ({ resetNonce: s.resetNonce + 1 })),
}));
