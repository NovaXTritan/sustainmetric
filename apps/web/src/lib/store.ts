/**
 * Zustand store for map + analysis state.
 */

import { create } from "zustand";
import type { SiteAnalysis } from "./api";

export interface FetchStatus {
  source: string;
  freshness_seconds: number;
  fetched_at: string;
  has_error: boolean;
  error_message?: string;
  summary?: string;
  thumb_url?: string;
}

interface MapStore {
  // Map state
  selectedLat: number | null;
  selectedLon: number | null;
  panelOpen: boolean;

  // Query state
  queryId: string | null;
  queryStatus: string | null;
  fetchStatuses: FetchStatus[];
  analysis: SiteAnalysis | null;
  servedFromCache: boolean;
  error: string | null;
  loading: boolean;

  // Cross-component fly target — set by SearchBar, consumed by MapView
  flyTarget: { lat: number; lon: number; ts: number } | null;

  // Actions
  selectPoint: (lat: number, lon: number) => void;
  closePanel: () => void;
  setQueryId: (id: string) => void;
  setQueryStatus: (status: string) => void;
  addFetchStatus: (status: FetchStatus) => void;
  setAnalysis: (analysis: SiteAnalysis) => void;
  setServedFromCache: (cached: boolean) => void;
  setError: (error: string | null) => void;
  setLoading: (loading: boolean) => void;
  requestFlyTo: (lat: number, lon: number) => void;
  reset: () => void;
}

export const useMapStore = create<MapStore>((set) => ({
  selectedLat: null,
  selectedLon: null,
  panelOpen: false,
  queryId: null,
  queryStatus: null,
  fetchStatuses: [],
  analysis: null,
  servedFromCache: false,
  error: null,
  loading: false,
  flyTarget: null,

  selectPoint: (lat, lon) =>
    set({
      selectedLat: lat,
      selectedLon: lon,
      panelOpen: true,
      queryId: null,
      queryStatus: null,
      fetchStatuses: [],
      analysis: null,
      servedFromCache: false,
      error: null,
      loading: true,
    }),

  closePanel: () =>
    set({ panelOpen: false, loading: false }),

  setQueryId: (id) => set({ queryId: id }),
  setQueryStatus: (status) => set({ queryStatus: status }),
  addFetchStatus: (status) =>
    set((state) => ({
      fetchStatuses: [
        ...state.fetchStatuses.filter((s) => s.source !== status.source),
        status,
      ],
    })),
  setAnalysis: (analysis) => set({ analysis, loading: false }),
  setServedFromCache: (cached) => set({ servedFromCache: cached }),
  setError: (error) => set({ error, loading: false }),
  setLoading: (loading) => set({ loading }),
  requestFlyTo: (lat, lon) =>
    set({ flyTarget: { lat, lon, ts: Date.now() } }),
  reset: () =>
    set({
      selectedLat: null,
      selectedLon: null,
      panelOpen: false,
      queryId: null,
      queryStatus: null,
      fetchStatuses: [],
      analysis: null,
      servedFromCache: false,
      error: null,
      loading: false,
    }),
}));
