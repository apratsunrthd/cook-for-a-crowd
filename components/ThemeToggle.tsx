"use client";

import { useSyncExternalStore } from "react";

// A tiny external store over document.documentElement's "dark" class --
// useSyncExternalStore (rather than state-in-an-effect) is what lets this
// read a client-only value without a hydration-mismatch warning: React
// renders `getServerSnapshot()`'s value first, then reconciles against the
// real DOM once mounted.
let listeners: Array<() => void> = [];

function subscribe(callback: () => void) {
  listeners.push(callback);
  return () => {
    listeners = listeners.filter((listener) => listener !== callback);
  };
}

function getSnapshot() {
  return document.documentElement.classList.contains("dark");
}

function getServerSnapshot() {
  return false;
}

export function ThemeToggle() {
  const isDark = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  function toggle() {
    const next = !document.documentElement.classList.contains("dark");
    document.documentElement.classList.toggle("dark", next);
    localStorage.setItem("theme", next ? "dark" : "light");
    listeners.forEach((listener) => listener());
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      title={isDark ? "Switch to light mode" : "Switch to dark mode"}
      className="rounded-md border border-black/20 dark:border-white/20 px-2 py-1.5 text-sm leading-none print:hidden"
    >
      {isDark ? "☀️" : "🌙"}
    </button>
  );
}
