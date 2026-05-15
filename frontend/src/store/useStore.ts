import { create } from 'zustand';
import type { AppMode, RackComponent, Port } from '../types';

interface Store {
  selectedRackId: number | null;
  setSelectedRackId: (id: number | null) => void;

  mode: AppMode;
  setMode: (mode: AppMode) => void;

  selectedComponentId: number | null;
  setSelectedComponentId: (id: number | null) => void;

  // Cable mode: track first selected port
  cableSourcePort: { compId: number; port: Port } | null;
  setCableSourcePort: (v: { compId: number; port: Port } | null) => void;

  showFace: 'front' | 'back' | 'free';
  setShowFace: (f: 'front' | 'back' | 'free') => void;
}

export const useStore = create<Store>((set) => ({
  selectedRackId: null,
  setSelectedRackId: (id) => set({ selectedRackId: id, selectedComponentId: null }),

  mode: 'select',
  setMode: (mode) => set({ mode, cableSourcePort: null }),

  selectedComponentId: null,
  setSelectedComponentId: (id) => set({ selectedComponentId: id }),

  cableSourcePort: null,
  setCableSourcePort: (v) => set({ cableSourcePort: v }),

  showFace: 'free',
  setShowFace: (f) => set({ showFace: f }),
}));
