"use client";

import { useEffect, useMemo, useState } from "react";
import {
  commitProject,
  getPackages,
  type CommitResponse,
  type InterventionPackage,
  type PackageId,
} from "@/lib/api";

// Area defaults per package — the prompt specifies these.
const DEFAULT_AREA_SQM: Record<PackageId, number> = {
  skin: 150,
  chowk: 2000,
  kilometer: 5000,
};

interface CommitModalProps {
  open: boolean;
  onClose: () => void;
  packageId: PackageId;
  /** Commit mode requires a completed query. Preview mode has no query and
   *  cannot persist — used from the About overlay's Execution Catalog. */
  mode?: "commit" | "preview";
  queryId?: string | null;
  interventionIndex?: number;
}

export default function CommitModal({
  open,
  onClose,
  packageId,
  mode = "commit",
  queryId = null,
  interventionIndex = 0,
}: CommitModalProps) {
  const isPreview = mode === "preview" || !queryId;
  const [pkg, setPkg] = useState<InterventionPackage | null>(null);
  const [areaSqm, setAreaSqm] = useState<number>(DEFAULT_AREA_SQM[packageId]);
  const [amountInr, setAmountInr] = useState<number>(0);
  const [partner, setPartner] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<CommitResponse | null>(null);
  const [err, setErr] = useState<string | null>(null);

  // Load package catalog on open
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    (async () => {
      try {
        const { packages } = await getPackages();
        if (cancelled) return;
        const found = packages.find((p) => p.id === packageId);
        if (found) {
          setPkg(found);
          const midpoint = Math.round(
            (found.cost_per_sqm_min_inr + found.cost_per_sqm_max_inr) / 2,
          );
          const defaultArea = DEFAULT_AREA_SQM[packageId];
          setAreaSqm(defaultArea);
          setAmountInr(defaultArea * midpoint);
          setPartner(found.implementation_partner_type);
        }
      } catch (e) {
        if (!cancelled) setErr(e instanceof Error ? e.message : "Failed to load package");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, packageId]);

  // Recompute amount midpoint if area changes and we have the package
  useEffect(() => {
    if (!pkg) return;
    const midpoint = Math.round(
      (pkg.cost_per_sqm_min_inr + pkg.cost_per_sqm_max_inr) / 2,
    );
    setAmountInr(areaSqm * midpoint);
  }, [areaSqm, pkg]);

  const platformFee = useMemo(
    () => Math.floor((amountInr * 10) / 100),
    [amountInr],
  );
  const partnerAmount = amountInr - platformFee;

  async function handleConfirm() {
    if (!queryId) {
      setErr("No query in context — click a location first.");
      return;
    }
    setSubmitting(true);
    setErr(null);
    try {
      const resp = await commitProject({
        query_id: queryId,
        intervention_option_index: interventionIndex,
        package_id: packageId,
        estimated_area_sqm: areaSqm,
        committed_amount_inr: amountInr,
      });
      setResult(resp);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Commit failed");
    } finally {
      setSubmitting(false);
    }
  }

  function handleDownloadPreview() {
    if (!result) return;
    const html = renderBrsrPreviewHtml(result);
    const blob = new Blob([html], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    window.open(url, "_blank");
  }

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="bg-bg border border-border w-full max-w-[600px] max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-5 border-b border-border flex items-center justify-between gap-3">
          <div className="font-headline text-[11px] uppercase tracking-[0.08em] text-text-primary">
            {result
              ? "COMMITMENT RECORDED · DEMONSTRATION"
              : isPreview
                ? "PACKAGE PREVIEW · NO COMMITMENT"
                : "COMMIT FUNDING · DEMONSTRATION FLOW"}
          </div>
          <button
            onClick={onClose}
            className="text-text-tertiary hover:text-text-primary text-sm leading-none w-5 h-5 flex items-center justify-center"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <div className="px-6 py-5 space-y-5">
          {!result && (
            <>
              <p className="text-[11px] text-text-tertiary leading-relaxed">
                {isPreview
                  ? "Package catalog preview. Shows hypothetical cost math and BRSR Principle 6 line items for this package. To record a demo commitment, run a site analysis from the map and click COMMIT FUNDING on the top-ranked recommendation."
                  : "This is a demonstration of the Sustainmetric commit flow. No real funds are transferred. The commit and audit trail are written to the database with the demo flag set."}
              </p>

              {pkg ? (
                <div className="border border-border p-4">
                  <div className="font-headline text-sm uppercase tracking-button text-text-primary mb-1.5">
                    {pkg.name}
                  </div>
                  <p className="text-xs text-text-secondary leading-relaxed">
                    {pkg.short_description}
                  </p>
                  <div className="mt-3 font-mono text-[10px] text-text-tertiary">
                    ₹{pkg.cost_per_sqm_min_inr}–{pkg.cost_per_sqm_max_inr}/sqm · {pkg.typical_timeline_months}mo typical timeline
                  </div>
                </div>
              ) : (
                <div className="font-mono text-[10px] text-text-tertiary">LOADING PACKAGE…</div>
              )}

              <div className="space-y-3">
                <Field label="SITE AREA (SQM)">
                  <input
                    type="number"
                    min={1}
                    value={areaSqm}
                    onChange={(e) => setAreaSqm(Math.max(1, Number(e.target.value) || 0))}
                    className="w-full bg-bg border border-border px-3 py-2 font-mono text-sm text-text-primary focus:border-accent-cool/60 focus:outline-none"
                  />
                </Field>
                <Field label="COMMITMENT AMOUNT (INR)">
                  <input
                    type="number"
                    min={1000}
                    value={amountInr}
                    onChange={(e) => setAmountInr(Math.max(1000, Number(e.target.value) || 0))}
                    className="w-full bg-bg border border-border px-3 py-2 font-mono text-sm text-text-primary focus:border-accent-cool/60 focus:outline-none"
                  />
                </Field>
                <Field label="IMPLEMENTATION PARTNER">
                  <select
                    value={partner}
                    onChange={(e) => setPartner(e.target.value)}
                    className="w-full bg-bg border border-border px-3 py-2 font-mono text-sm text-text-primary focus:border-accent-cool/60 focus:outline-none"
                  >
                    {pkg && (
                      <option value={pkg.implementation_partner_type}>
                        {humanizePartner(pkg.implementation_partner_type)}
                      </option>
                    )}
                    <option value="sustainmetric_field_team_v2">
                      Sustainmetric Field Team (V2)
                    </option>
                  </select>
                </Field>
              </div>

              <div className="border border-accent-cool/40 bg-accent-cool/[0.03] p-3 font-mono text-[11px] leading-relaxed">
                <div className="text-text-primary">
                  PLATFORM FEE (10%) · ₹{platformFee.toLocaleString("en-IN")}
                </div>
                <div className="text-text-secondary">
                  ROUTED TO EXECUTION PARTNER · ₹{partnerAmount.toLocaleString("en-IN")}
                </div>
              </div>

              {pkg && (
                <div>
                  <div className="font-mono text-[9px] tracking-[0.08em] text-text-tertiary mb-2">
                    BRSR PRINCIPLE 6 · PREVIEW LINE ITEMS
                  </div>
                  <ul className="space-y-1.5">
                    {pkg.brsr_principle_6_coverage.map((key) => (
                      <li
                        key={key}
                        className="text-[11px] text-text-secondary pl-3 border-l border-border font-mono leading-relaxed"
                      >
                        {humanizeBrsrKey(key)}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {err && (
                <div className="border border-accent-heat/30 p-3 text-[11px] text-accent-heat font-mono">
                  {err}
                </div>
              )}

              <div className="flex items-center justify-between gap-3 pt-2">
                <button
                  onClick={onClose}
                  className="border border-border px-5 py-2 font-headline text-[10px] uppercase tracking-[0.12em] text-text-primary hover:bg-bg-elevated transition-colors"
                >
                  {isPreview ? "CLOSE" : "CANCEL"}
                </button>
                {!isPreview && (
                  <button
                    onClick={handleConfirm}
                    disabled={submitting || !pkg}
                    className="border border-accent-cool/60 px-5 py-2 font-headline text-[10px] uppercase tracking-[0.12em] text-accent-cool hover:bg-accent-cool/10 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    {submitting ? "RECORDING…" : "CONFIRM COMMITMENT (DEMO) →"}
                  </button>
                )}
              </div>
            </>
          )}

          {result && (
            <>
              <div className="border border-accent-success/40 bg-accent-success/[0.04] p-4">
                <div className="font-mono text-[10px] text-accent-success tracking-[0.08em] mb-2">
                  ✓ PROJECT RECORDED
                </div>
                <div className="font-mono text-[11px] text-text-primary leading-relaxed break-all">
                  Project ID · {result.project_id}
                </div>
                <div className="mt-2 font-mono text-[10px] text-text-secondary">
                  ₹{result.committed_amount_inr.toLocaleString("en-IN")} committed against {result.package_name} — flagged is_demo_commitment.
                </div>
              </div>

              <div>
                <div className="font-mono text-[9px] tracking-[0.08em] text-text-tertiary mb-2">
                  BRSR PRINCIPLE 6 · RECORDED LINE ITEMS
                </div>
                <ul className="space-y-1.5">
                  {result.brsr_preview.map((line, i) => (
                    <li
                      key={i}
                      className="text-[11px] text-text-secondary pl-3 border-l border-border font-mono leading-relaxed"
                    >
                      {line}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="flex items-center justify-between gap-3 pt-2">
                <button
                  onClick={handleDownloadPreview}
                  className="border border-border px-5 py-2 font-headline text-[10px] uppercase tracking-[0.12em] text-text-primary hover:bg-bg-elevated transition-colors"
                >
                  DOWNLOAD BRSR PREVIEW (DEMO) →
                </button>
                <button
                  onClick={onClose}
                  className="border border-accent-cool/60 px-5 py-2 font-headline text-[10px] uppercase tracking-[0.12em] text-accent-cool hover:bg-accent-cool/10 transition-colors"
                >
                  CLOSE
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block font-mono text-[9px] tracking-[0.08em] text-text-tertiary mb-1">
        {label}
      </span>
      {children}
    </label>
  );
}

function humanizePartner(key: string): string {
  return key
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function humanizeBrsrKey(key: string): string {
  const map: Record<string, string> = {
    green_credits_generated_or_procured: "Green credits generated or procured",
    energy_intensity_ratios: "Energy intensity ratios",
    environmental_impact_assessment: "Environmental impact assessment",
    water_withdrawal_intensity: "Water withdrawal intensity",
    biodiversity_impact: "Biodiversity impact",
  };
  return map[key] || humanizePartner(key);
}

function renderBrsrPreviewHtml(r: CommitResponse): string {
  const rows = r.brsr_preview
    .map((line) => `<li style="margin-bottom:10px;padding-left:12px;border-left:2px solid #333;font-family:ui-monospace,monospace;font-size:12px">${escapeHtml(line)}</li>`)
    .join("");
  return `<!doctype html>
<html>
<head>
<meta charset="utf-8">
<title>BRSR Preview · ${escapeHtml(r.package_name)}</title>
<style>
body{background:#000;color:#fff;font-family:ui-sans-serif,system-ui,sans-serif;max-width:780px;margin:40px auto;padding:32px;line-height:1.6}
h1{font-size:14px;text-transform:uppercase;letter-spacing:0.12em;border-bottom:1px solid #333;padding-bottom:12px;margin-bottom:24px}
h2{font-size:11px;text-transform:uppercase;letter-spacing:0.08em;color:#888;margin-top:24px;margin-bottom:8px}
.kv{font-family:ui-monospace,monospace;font-size:12px;color:#ccc;margin:4px 0}
.demo{font-size:10px;color:#888;margin-top:32px;padding-top:16px;border-top:1px solid #333}
</style>
</head>
<body>
<h1>Sustainmetric · BRSR Principle 6 Preview</h1>
<div class="kv">Project ID · ${escapeHtml(r.project_id)}</div>
<div class="kv">Package · ${escapeHtml(r.package_name)}</div>
<div class="kv">Committed · ₹${r.committed_amount_inr.toLocaleString("en-IN")}</div>
<div class="kv">Platform Fee (10%) · ₹${r.platform_fee_inr.toLocaleString("en-IN")}</div>
<div class="kv">Routed to Execution Partner · ₹${r.execution_partner_amount_inr.toLocaleString("en-IN")}</div>
<div class="kv">Implementation Partner · ${escapeHtml(humanizePartner(r.implementation_partner_type))}</div>
<h2>Recorded Line Items</h2>
<ul style="list-style:none;padding:0">${rows}</ul>
<div class="demo">This is a demonstration preview generated by Sustainmetric V1. No real funds have been transferred. No real BRSR filing has been lodged. Generated ${new Date(r.created_at).toISOString()}.</div>
</body>
</html>`;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
