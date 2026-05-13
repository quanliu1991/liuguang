import { create } from 'zustand';
import type { DigitalTwinData, ResourceSummary, FragmentAlert, ScheduleSuggestion } from '../types';

interface DigitalTwinState {
  twinData: DigitalTwinData | null;
  summary: ResourceSummary | null;
  selectedServerIndex: number | null;
  selectedGpuIndex: number | null;
  selectedService: { service_name: string; model: string } | null;
  fragmentAlerts: FragmentAlert[];
  scheduleSuggestions: ScheduleSuggestion[];
  loading: boolean;
  showFragmentPanel: boolean;
  showSuggestionsPanel: boolean;
  hoveredServerIndex: number | null;
  hoveredGpuInfo: { serverIdx: number; gpuIdx: number } | null;
  setTwinData: (data: DigitalTwinData) => void;
  setSummary: (summary: ResourceSummary) => void;
  setSelectedServer: (index: number | null) => void;
  setSelectedGpu: (index: number | null) => void;
  setSelectedService: (service: { service_name: string; model: string } | null) => void;
  setLoading: (loading: boolean) => void;
  setShowFragmentPanel: (show: boolean) => void;
  setShowSuggestionsPanel: (show: boolean) => void;
  setHoveredServer: (index: number | null) => void;
  setHoveredGpu: (info: { serverIdx: number; gpuIdx: number } | null) => void;
}

export const useDigitalTwinStore = create<DigitalTwinState>((set) => ({
  twinData: null,
  summary: null,
  selectedServerIndex: null,
  selectedGpuIndex: null,
  selectedService: null,
  fragmentAlerts: [],
  scheduleSuggestions: [],
  loading: true,
  showFragmentPanel: false,
  showSuggestionsPanel: false,
  hoveredServerIndex: null,
  hoveredGpuInfo: null,
  setTwinData: (data) => set({ twinData: data }),
  setSummary: (summary) => set({ summary }),
  setSelectedServer: (index) => set({ selectedServerIndex: index, selectedGpuIndex: null, selectedService: null }),
  setSelectedGpu: (index) => set({ selectedGpuIndex: index, selectedService: null }),
  setSelectedService: (service) => set({ selectedService: service }),
  setLoading: (loading) => set({ loading }),
  setShowFragmentPanel: (show) => set({ showFragmentPanel: show, showSuggestionsPanel: false }),
  setShowSuggestionsPanel: (show) => set({ showSuggestionsPanel: show, showFragmentPanel: false }),
  setHoveredServer: (index) => set({ hoveredServerIndex: index }),
  setHoveredGpu: (info) => set({ hoveredGpuInfo: info }),
}));
