"use client";

import { useEffect } from "react";

/** Opens the print dialog as soon as a dedicated print page mounts -- the whole reason to be on this page is to print it. */
export function AutoPrint() {
  useEffect(() => {
    window.print();
  }, []);
  return null;
}
