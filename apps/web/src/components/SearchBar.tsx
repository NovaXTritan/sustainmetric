"use client";

import { useEffect, useRef, useState } from "react";
import { geocode, type GeocodeResult } from "@/lib/api";
import { useMapStore } from "@/lib/store";

const DEBOUNCE_MS = 300;

export default function SearchBar() {
  const requestFlyTo = useMapStore((s) => s.requestFlyTo);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<GeocodeResult[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Debounced search
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!query || query.trim().length < 2) {
      setResults([]);
      setOpen(false);
      setError(null);
      return;
    }
    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      setError(null);
      try {
        const { results: r } = await geocode(query.trim());
        setResults(r);
        setOpen(true);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Search failed");
        setResults([]);
        setOpen(true);
      } finally {
        setLoading(false);
      }
    }, DEBOUNCE_MS);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query]);

  // Close on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (!containerRef.current) return;
      if (!containerRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  function handleSelect(r: GeocodeResult) {
    setQuery(r.display_name);
    setOpen(false);
    requestFlyTo(r.lat, r.lon);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" && results.length > 0) {
      e.preventDefault();
      handleSelect(results[0]);
    }
    if (e.key === "Escape") {
      setOpen(false);
    }
  }

  return (
    <div
      ref={containerRef}
      className="fixed left-1/2 -translate-x-1/2 z-40"
      style={{ top: 60, width: 400 }}
    >
      <div className="relative">
        {/* Search icon */}
        <div className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none">
          <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
            <circle cx="5.5" cy="5.5" r="4.5" stroke="rgba(255,255,255,0.4)" strokeWidth="1.2" />
            <line x1="9" y1="9" x2="12" y2="12" stroke="rgba(255,255,255,0.4)" strokeWidth="1.2" />
          </svg>
        </div>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => results.length > 0 && setOpen(true)}
          placeholder="SEARCH ANY LOCATION IN INDIA"
          className="w-full bg-bg/95 backdrop-blur border border-white/20 pl-10 pr-4 text-sm font-body text-white placeholder:text-white/40 focus:border-white/60 focus:outline-none transition-colors"
          style={{ height: 40 }}
          aria-label="Search location"
        />
        {loading && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2 font-mono text-[9px] text-white/40 uppercase tracking-[0.08em]">
            …
          </div>
        )}
      </div>

      {open && (
        <div className="absolute left-0 right-0 mt-1 bg-bg/95 backdrop-blur border border-white/20 max-h-[320px] overflow-y-auto">
          {error ? (
            <div className="px-4 py-3 font-mono text-[10px] text-accent-heat tracking-[0.08em]">
              {error}
            </div>
          ) : results.length === 0 ? (
            <div className="px-4 py-3 font-mono text-[10px] text-white/40 tracking-[0.08em] uppercase">
              {loading ? "SEARCHING…" : "NO LOCATIONS FOUND"}
            </div>
          ) : (
            results.map((r, i) => (
              <button
                key={`${r.lat},${r.lon},${i}`}
                onClick={() => handleSelect(r)}
                className="w-full text-left px-4 py-2.5 text-[13px] text-white/90 hover:bg-white/[0.06] border-b border-white/[0.06] last:border-b-0 leading-snug transition-colors"
              >
                {r.display_name}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
