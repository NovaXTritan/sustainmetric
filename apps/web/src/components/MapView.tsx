"use client";

import { useEffect, useRef } from "react";
import maplibregl from "maplibre-gl";
import { useMapStore } from "@/lib/store";
import { createQuery, getQuery } from "@/lib/api";

type AnalyzeFn = (lat: number, lng: number) => Promise<void>;

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

// CARTO Dark Matter vector style — sharp labels at every zoom level.
// The previous raster-tile variant pixelated label text past zoom 14
// and made neighborhood/street names illegible during analysis.
const MAP_STYLE_URL =
  "https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json";

const DELHI: [number, number] = [77.209, 28.6139];

/** Stream query updates via SSE — provides real-time fetcher completion events */
interface FetchCompletePayload {
  source: string;
  freshness_seconds: number;
  has_error: boolean;
  error_message?: string;
  summary?: string;
  thumb_url?: string;
}

function streamQueryProgress(
  queryId: string,
  onFetchComplete: (payload: FetchCompletePayload) => void,
  onComplete: (analysis: unknown) => void,
  onError: (msg: string) => void,
): () => void {
  const url = `${API_BASE}/api/v1/queries/${queryId}/stream`;
  const es = new EventSource(url);

  const seenSources = new Set<string>();

  es.addEventListener("fetch_complete", (e) => {
    try {
      const data = JSON.parse((e as MessageEvent).data);
      if (!seenSources.has(data.source)) {
        seenSources.add(data.source);
        onFetchComplete(data);
      }
    } catch {}
  });

  es.addEventListener("analysis_complete", (e) => {
    try {
      const data = JSON.parse((e as MessageEvent).data);
      if (data.analysis) onComplete(data.analysis);
    } catch {}
  });

  es.addEventListener("done", () => {
    es.close();
  });

  es.addEventListener("error", (e) => {
    try {
      const msgEvent = e as MessageEvent;
      if (msgEvent.data) {
        const data = JSON.parse(msgEvent.data);
        onError(data.message || "Stream error");
      }
    } catch {}
  });

  es.onerror = () => {
    es.close();
  };

  return () => es.close();
}

export default function MapView() {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const markerRef = useRef<maplibregl.Marker | null>(null);
  const streamCleanupRef = useRef<(() => void) | null>(null);
  const analyzeRef = useRef<AnalyzeFn | null>(null);
  const flyTarget = useMapStore((s) => s.flyTarget);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    let map: maplibregl.Map;
    try {
      map = new maplibregl.Map({
        container: containerRef.current,
        style: MAP_STYLE_URL,
        center: DELHI,
        zoom: 11,
        minZoom: 3,
        maxZoom: 18,
      });
    } catch (err) {
      console.error("MapLibre init failed:", err);
      return;
    }

    map.addControl(
      new maplibregl.NavigationControl({ showCompass: false }),
      "top-left",
    );

    // Shared analysis trigger — used by both map clicks and search-bar selections
    const runAnalysis: AnalyzeFn = async (lat, lng) => {
      const store = useMapStore.getState();

      if (streamCleanupRef.current) {
        streamCleanupRef.current();
        streamCleanupRef.current = null;
      }

      if (markerRef.current) markerRef.current.remove();
      markerRef.current = new maplibregl.Marker({ color: "#FF4D2E" })
        .setLngLat([lng, lat])
        .addTo(map);

      store.selectPoint(lat, lng);

      try {
        const t0 = performance.now();
        const query = await createQuery(lat, lng);
        store.setQueryId(query.id);
        store.setQueryStatus(query.status);

        if (query.served_from_cache && query.status === "completed") {
          store.setServedFromCache(true);
          const full = await getQuery(query.id);
          if (full.output?.analysis) {
            store.setAnalysis(full.output.analysis);
            console.log(`Cache hit in ${Math.round(performance.now() - t0)}ms`);
          }
          return;
        }

        streamCleanupRef.current = streamQueryProgress(
          query.id,
          (payload) => {
            store.addFetchStatus({
              source: payload.source,
              freshness_seconds: payload.freshness_seconds ?? 0,
              fetched_at: new Date().toISOString(),
              has_error: payload.has_error ?? false,
              error_message: payload.error_message,
              summary: payload.summary,
              thumb_url: payload.thumb_url,
            });
          },
          (analysis) => {
            store.setAnalysis(analysis as never);
            console.log(
              `Fresh analysis in ${Math.round(performance.now() - t0)}ms`,
            );
          },
          (msg) => {
            store.setError(msg);
          },
        );
      } catch (err) {
        console.error("Query failed:", err);
        store.setError(
          err instanceof Error ? err.message : "Failed to create query",
        );
      }
    };

    analyzeRef.current = runAnalysis;

    map.on("click", (e) => {
      void runAnalysis(e.lngLat.lat, e.lngLat.lng);
    });

    mapRef.current = map;

    return () => {
      if (streamCleanupRef.current) streamCleanupRef.current();
      map.remove();
      mapRef.current = null;
      analyzeRef.current = null;
    };
  }, []);

  // React to fly requests dispatched by SearchBar
  useEffect(() => {
    if (!flyTarget || !mapRef.current || !analyzeRef.current) return;
    mapRef.current.flyTo({
      center: [flyTarget.lon, flyTarget.lat],
      zoom: 15,
      speed: 1.4,
    });
    void analyzeRef.current(flyTarget.lat, flyTarget.lon);
  }, [flyTarget]);

  return <div ref={containerRef} className="absolute inset-0" />;
}
