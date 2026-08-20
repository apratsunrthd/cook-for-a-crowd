"use client";

export function PrintButton() {
  return (
    <button
      onClick={() => window.print()}
      className="rounded-md border border-black/20 dark:border-white/20 px-3 py-1.5 text-sm font-medium print:hidden"
    >
      Print
    </button>
  );
}
