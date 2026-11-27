"use client";

import { Fragment } from "react";
import { useCalmVersion } from "@/lib/motion";

/**
 * Switching "turn off animations" rebuilds the page content in place (same
 * scroll position, no reload), so every effect sets itself up again with the
 * new choice. Until the first switch the key stays 0 (no extra work on load).
 */
export default function CalmRemount({ children }: { children: React.ReactNode }) {
  const version = useCalmVersion();
  return <Fragment key={version}>{children}</Fragment>;
}
