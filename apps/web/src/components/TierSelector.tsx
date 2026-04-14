"use client";

import { useEffect, useState } from "react";
import { readTier, writeTier, type Tier } from "@/lib/tier";

interface TierSelectorProps {
  /** Called once the user has selected a tier (or when we detect one already saved). */
  onReady: (tier: Tier) => void;
}

interface TierOption {
  id: Tier;
  label: string;
  tagline: string;
  body: string;
  quota: string;
}

const OPTIONS: TierOption[] = [
  {
    id: "individual",
    label: "INDIVIDUAL",
    tagline: "HOMEOWNERS · SMALL BUSINESS",
    body: "Run site analysis for your own property. Get recommendations for cool roofs, small green walls, and rooftop interventions that pay back in electricity bills.",
    quota: "50 QUERIES / MONTH",
  },
  {
    id: "community",
    label: "COMMUNITY",
    tagline: "RWAS · SCHOOLS · ASSOCIATIONS",
    body: "Analyze and plan shared interventions for streets, chowks, and pocket parks across your locality. Pool resources for cluster-scale projects.",
    quota: "500 QUERIES / MONTH",
  },
  {
    id: "corporate",
    label: "CORPORATE",
    tagline: "SEBI BRSR-MANDATED · ENTERPRISE",
    body: "Full portfolio analysis, BRSR Principle 6 audit certificate generation, and corridor-scale Adopt-a-Kilometer commitments with annuity-based corporate sponsorship.",
    quota: "5000 QUERIES / MONTH",
  },
];

export default function TierSelector({ onReady }: TierSelectorProps) {
  const [resolved, setResolved] = useState(false);
  const [selected, setSelected] = useState<Tier | null>(null);
  const [needsChoice, setNeedsChoice] = useState(false);

  useEffect(() => {
    const existing = readTier();
    if (existing) {
      setSelected(existing);
      onReady(existing);
      setResolved(true);
      return;
    }
    setNeedsChoice(true);
    setResolved(true);
  }, [onReady]);

  function handleSelect(tier: Tier) {
    writeTier(tier);
    setSelected(tier);
    setNeedsChoice(false);
    onReady(tier);
  }

  if (!resolved || !needsChoice || selected) return null;

  return (
    <div className="fixed inset-0 z-[70] bg-bg overflow-y-auto animate-fadeIn">
      <div className="min-h-full max-w-[1100px] mx-auto px-[6%] py-16">
        <div className="mb-12">
          <div className="font-mono text-[10px] tracking-[0.12em] text-accent-cool mb-3">
            WELCOME TO SUSTAINMETRIC
          </div>
          <h1 className="font-headline text-3xl uppercase leading-[0.95] tracking-headline font-medium text-text-primary mb-6 max-w-[720px]">
            WHO IS ANALYZING
            <br />
            THESE CITIES TODAY?
          </h1>
          <p className="font-body text-sm leading-relaxed text-text-secondary max-w-[620px]">
            Sustainmetric adapts its analysis depth, quota, and reporting format to three
            distinct user tiers. Choose the one that describes you — you can switch at any
            time from the About overlay.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-px bg-border">
          {OPTIONS.map((opt) => (
            <button
              key={opt.id}
              onClick={() => handleSelect(opt.id)}
              className="bg-bg p-6 text-left flex flex-col gap-4 border border-transparent hover:border-accent-cool/60 transition-colors duration-rail ease-rail group min-h-[340px]"
            >
              <div>
                <div className="font-mono text-[9px] tracking-[0.12em] text-accent-cool mb-2">
                  {opt.tagline}
                </div>
                <div className="font-headline text-xl uppercase tracking-button text-text-primary">
                  {opt.label}
                </div>
              </div>
              <p className="text-sm text-text-secondary leading-relaxed flex-1">
                {opt.body}
              </p>
              <div className="pt-4 border-t border-border/60 flex items-center justify-between">
                <span className="font-mono text-[10px] tracking-[0.08em] text-text-tertiary">
                  {opt.quota}
                </span>
                <span className="font-headline text-[10px] uppercase tracking-[0.12em] text-accent-cool group-hover:translate-x-0.5 transition-transform duration-rail">
                  SELECT →
                </span>
              </div>
            </button>
          ))}
        </div>

        <p className="mt-10 font-mono text-[10px] text-text-tertiary leading-relaxed max-w-[620px]">
          Your choice is stored in this browser only. If you are signed in, it is also
          recorded against your tenant row for audit purposes. No real billing occurs in
          this demonstration build.
        </p>
      </div>
    </div>
  );
}
