"use client";

import { useEffect, useRef } from "react";
import maplibregl from "maplibre-gl";
import { useMapStore } from "@/lib/store";
import { createQuery, getQuery } from "@/lib/api";

// CARTO Dark Matter raster tiles — free, no API key
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

export default function MapView() {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const markerRef = useRef<maplibregl.Marker | null>(null);

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
      "top-left"
    );

    map.on("click", async (e) => {
      const { lng, lat } = e.lngLat;
      const store = useMapStore.getState();

      // Drop marker
      if (markerRef.current) markerRef.current.remove();
      markerRef.current = new maplibregl.Marker({ color: "#FF4D2E" })
        .setLngLat([lng, lat])
        .addTo(map);

      store.selectPoint(lat, lng);

      try {
        const query = await createQuery(lat, lng);
        store.setQueryId(query.id);
        store.setQueryStatus(query.status);

        if (query.served_from_cache && query.status === "completed") {
          store.setServedFromCache(true);
          const full = await getQuery(query.id);
          if (full.output?.analysis) {
            store.setAnalysis(full.output.analysis);
          }
          return;
        }

        // Poll
        for (let i = 0; i < 120; i++) {
          await new Promise((r) => setTimeout(r, 1000));
          try {
            const result = await getQuery(query.id);
            store.setQueryStatus(result.status);
            if (result.status === "completed" && result.output?.analysis) {
              store.setAnalysis(result.output.analysis);
              return;
            }
            if (result.status === "failed") {
              store.setError(result.error || "Analysis failed");
              return;
            }
          } catch {}
        }
        store.setError("Analysis timed out after 2 minutes");
      } catch (err) {
        console.error("Query failed:", err);
        store.setError(err instanceof Error ? err.message : "Failed to create query");
      }
    });

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  return <div ref={containerRef} className="absolute inset-0" />;
}
