"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";

/**
 * SUSTAINMETRIC wordmark + dropdown nav.
 *
 * Drops in at the top-left of app pages (/app/map, /pave, /skin). The landing
 * page `/` keeps its own unclickable wordmark as the intentional hero moment.
 * The dropdown lets a demo visitor reach PLATFORM, PAVE, SKIN, or HOME from
 * any working surface without having to hit the back button.
 */

interface BrandNavProps {
  /** Visual variant — "overlay" adds a subtle dark backdrop for map/use on top of imagery */
  variant?: "plain" | "overlay";
}

export default function BrandNav({ variant = "plain" }: BrandNavProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (!ref.current) return;
      if (!ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const backdrop =
    variant === "overlay" ? "bg-bg/80 backdrop-blur" : "";

  return (
    <div ref={ref} className="relative pointer-events-auto">
      <button
        onClick={() => setOpen((v) => !v)}
        className={`font-headline text-xs font-medium uppercase tracking-nav text-text-primary hover:text-text-secondary transition-colors duration-rail flex items-center gap-1.5 px-2 py-1 ${backdrop}`}
        aria-haspopup="menu"
        aria-expanded={open}
      >
        SUSTAINMETRIC
        <span className="font-mono text-[9px] text-text-tertiary">
          {open ? "▲" : "▼"}
        </span>
      </button>

      {open && (
        <div className="absolute top-full left-0 mt-1 min-w-[180px] bg-bg border border-white/20 py-1 shadow-lg">
          <NavLink href="/" onClick={() => setOpen(false)}>
            HOME
          </NavLink>
          <NavLink href="/app/map" onClick={() => setOpen(false)}>
            PLATFORM
          </NavLink>
          <div className="h-px bg-white/10 my-1" />
          <NavLink href="/pave" onClick={() => setOpen(false)}>
            PAVE
            <span className="ml-2 font-mono text-[9px] text-text-tertiary">
              ROADS
            </span>
          </NavLink>
          <NavLink href="/skin" onClick={() => setOpen(false)}>
            SKIN
            <span className="ml-2 font-mono text-[9px] text-text-tertiary">
              ROOFTOPS
            </span>
          </NavLink>
        </div>
      )}
    </div>
  );
}

function NavLink({
  href,
  onClick,
  children,
}: {
  href: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className="block px-4 py-2 font-headline text-[11px] uppercase tracking-[0.08em] text-text-primary hover:bg-white/[0.06] transition-colors"
    >
      {children}
    </Link>
  );
}
