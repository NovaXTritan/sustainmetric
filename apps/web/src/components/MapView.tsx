"use client";

import { useEffect, useRef } from "react";
import maplibregl from "maplibre-gl";
import { useMapStore } from "@/lib/store";
import { createQuery, getQuery } from "@/lib/api";

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

// CARTO Dark Matter — no API key, fast CDN
const MAP_STYLE: maplibregl.StyleSpecification = {
  version: 8,
  sources: {
    carto: {
      type: "raster",
      tiles: [
        "https://a.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}@2x.png",
        "https://b.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}@2x.png",
        "https://c.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}@2x.png",
        "https://d.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}@2x.png",
      ],
      tileSize: 256,
      attribution:
        '© <a href="https://www.openstreetmap.org/copyright">OSM</a> © <a href="https://carto.com/attributions">CARTO</a>',
    },
  },
  layers: [
    {
      id: "carto-layer",
      type: "raster",
      source: "carto",
      minzoom: 0,
      maxzoom: 19,
    },
  ],
};

const DELHI: [number, number] = [77.209, 28.6139];

/** Stream query updates via SSE — provides real-time fetcher completion events */
function streamQueryProgress(
  queryId: string,
  onFetchComplete: (source: string, freshness: number, hasError: boolean) => void,
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
        onFetchComplete(
          data.source,
          data.freshness_seconds ?? 0,
          data.has_error ?? false,
        );
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

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    let map: maplibregl.Map;
    try {
      map = new maplibregl.Map({
        container: containerRef.current,
        style: MAP_STYLE,
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

    map.on("click", async (e) => {
      const { lng, lat } = e.lngLat;
      const store = useMapStore.getState();

      // Close previous stream if any
      if (streamCleanupRef.current) {
        streamCleanupRef.current();
        streamCleanupRef.current = null;
      }

      // Drop marker
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

        // Cache hit — instant
        if (query.served_from_cache && query.status === "completed") {
          store.setServedFromCache(true);
          const full = await getQuery(query.id);
          if (full.output?.analysis) {
            store.setAnalysis(full.output.analysis);
            console.log(`Cache hit in ${Math.round(performance.now() - t0)}ms`);
          }
          return;
        }

        // Live stream the progress via SSE
        streamCleanupRef.current = streamQueryProgress(
          query.id,
          (source, freshness, hasError) => {
            store.addFetchStatus({
              source,
              freshness_seconds: freshness,
              fetched_at: new Date().toISOString(),
              has_error: hasError,
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
    });

    mapRef.current = map;

    return () => {
      if (streamCleanupRef.current) streamCleanupRef.current();
      map.remove();
      mapRef.current = null;
    };
  }, []);

  return <div ref={containerRef} className="absolute inset-0" />;
}
