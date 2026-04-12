"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import AnalysisPanel from "@/components/AnalysisPanel";

// MapLibre must be loaded client-side only (no SSR)
const MapView = dynamic(() => import("@/components/MapView"), {
  ssr: false,
  loading: () => (
    <div className="absolute inset-0 bg-bg flex items-center justify-center">
      <div className="text-center">
        <div className="w-8 h-8 border border-text-tertiary border-t-text-primary rounded-full animate-spin mx-auto mb-4" />
        <p className="font-mono text-xs text-text-tertiary uppercase tracking-nav">
          LOADING MAP
        </p>
      </div>
    </div>
  ),
});

export default function MapPage() {
  return (
    <div className="h-screen w-screen bg-bg relative overflow-hidden">
      {/* Minimal top nav */}
      <nav className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 py-4 bg-gradient-to-b from-bg via-bg/80 to-transparent pointer-events-none">
        <Link
          href="/"
          className="font-headline text-xs font-medium uppercase tracking-nav text-text-primary pointer-events-auto hover:text-text-secondary transition-colors duration-rail"
        >
          SUSTAINMETRIC
        </Link>
        <div className="flex items-center gap-4 pointer-events-auto">
          <span className="font-mono text-xs text-text-tertiary uppercase">
            CLICK ANYWHERE ON THE MAP TO ANALYZE
          </span>
        </div>
      </nav>

      {/* Full-viewport map */}
      <MapView />

      {/* Analysis panel slides in from right */}
      <AnalysisPanel />
    </div>
  );
}
