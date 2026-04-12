"use client";

import { useEffect, useRef, useCallback } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { useMapStore } from "@/lib/store";
import { createQuery, getQuery } from "@/lib/api";

// CARTO Dark Matter tiles — free, no API key, dark theme
const CARTO_DARK_STYLE: maplibregl.StyleSpecification = {
  version: 8,
  name: "CARTO Dark Matter",
  sources: {
    "carto-dark": {
      type: "raster",
      tiles: [
        "https://basemaps.cartocdn.com/dark_all/{z}/{x}/{y}@2x.png",
      ],
      tileSize: 256,
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
    },
  },
  layers: [
    {
      id: "carto-dark-layer",
      type: "raster",
      source: "carto-dark",
      minzoom: 0,
      maxzoom: 20,
    },
  ],
};

// Delhi NCR center
const DELHI_CENTER: [number, number] = [77.209, 28.6139];
const DEFAULT_ZOOM = 11;

export default function MapView() {
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const markerRef = useRef<maplibregl.Marker | null>(null);

  const {
    selectPoint,
    setQueryId,
    setQueryStatus,
    addFetchStatus,
    setAnalysis,
    setServedFromCache,
    setError,
  } = useMapStore();

  const handleMapClick = useCallback(
    async (e: maplibregl.MapMouseEvent) => {
      const { lng, lat } = e.lngLat;

      // Drop marker
      if (markerRef.current) markerRef.current.remove();
      markerRef.current = new maplibregl.Marker({
        color: "#FF4D2E",
      })
        .setLngLat([lng, lat])
        .addTo(mapRef.current!);

      // Update store
      selectPoint(lat, lng);

      // Create query
      try {
        const query = await createQuery(lat, lng);
        setQueryId(query.id);
        setQueryStatus(query.status);

        if (query.served_from_cache && query.status === "completed") {
          setServedFromCache(true);
          // Fetch full result
          const full = await getQuery(query.id);
          if (full.output?.analysis) {
            setAnalysis(full.output.analysis);
          }
          return;
        }

        // Poll for completion
        pollQuery(query.id);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to create query");
      }
    },
    [selectPoint, setQueryId, setQueryStatus, setServedFromCache, setAnalysis, setError]
  );

  async function pollQuery(queryId: string) {
    const maxPolls = 60;
    for (let i = 0; i < maxPolls; i++) {
      await new Promise((r) => setTimeout(r, 500));

      try {
        const result = await getQuery(queryId);
        setQueryStatus(result.status);

        if (result.status === "completed" && result.output?.analysis) {
          setAnalysis(result.output.analysis);
          return;
        }

        if (result.status === "failed") {
          setError(result.error || "Analysis failed");
          return;
        }
      } catch {
        // Network error, keep polling
      }
    }

    setError("Analysis timed out after 30 seconds");
  }

  useEffect(() => {
    if (!mapContainer.current || mapRef.current) return;

    const map = new maplibregl.Map({
      container: mapContainer.current,
      style: CARTO_DARK_STYLE,
      center: DELHI_CENTER,
      zoom: DEFAULT_ZOOM,
      minZoom: 3,
      maxZoom: 18,
    });

    map.addControl(
      new maplibregl.NavigationControl({ showCompass: false }),
      "top-left"
    );

    map.on("click", handleMapClick);

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, [handleMapClick]);

  return (
    <div ref={mapContainer} className="absolute inset-0" />
  );
}
