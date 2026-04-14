/**
 * Customer tier persistence — localStorage-primary with best-effort backend sync.
 *
 * The demo visits sustainmetric.web.app without authentication. Tier selection
 * happens on first visit and persists in localStorage. If an authenticated
 * session exists, POST /api/v1/me/tier is fired as a background non-blocking
 * call to update the tenant row; errors are swallowed (the UI never depends
 * on the backend tier write).
 */

import { updateTier, type CustomerTier } from "./api";

export const TIER_STORAGE_KEY = "sustainmetric.tier";

export type Tier = CustomerTier;

export function readTier(): Tier | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(TIER_STORAGE_KEY);
    if (raw === "individual" || raw === "community" || raw === "corporate") {
      return raw;
    }
    return null;
  } catch {
    return null;
  }
}

export function writeTier(tier: Tier): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(TIER_STORAGE_KEY, tier);
  } catch {
    // Private mode or storage disabled — UI continues without persistence.
  }
  // Fire-and-forget background sync. Never blocks UI. Never surfaces errors.
  void updateTier(tier).catch(() => undefined);
}

export function clearTier(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(TIER_STORAGE_KEY);
  } catch {
    // Ignore.
  }
}
