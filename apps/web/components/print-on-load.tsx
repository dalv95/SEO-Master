"use client";

import { useEffect } from "react";

/** Opens the browser print dialog (→ "Save as PDF") once fonts are ready. */
export function PrintOnLoad() {
  useEffect(() => {
    let cancelled = false;
    document.fonts.ready.then(() => !cancelled && setTimeout(() => window.print(), 300));
    return () => {
      cancelled = true;
    };
  }, []);
  return null;
}

export function PrintButton({ children }: { children: React.ReactNode }) {
  return (
    <button
      onClick={() => window.print()}
      className="rounded-md bg-signal px-4 py-2 text-sm font-semibold text-signal-ink hover:opacity-90"
    >
      {children}
    </button>
  );
}
