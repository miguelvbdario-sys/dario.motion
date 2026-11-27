"use client";

import { useEffect } from "react";
import { startLiteWatch } from "@/lib/lite";

/** Starts the frame-rate watch that can switch weak devices to lite mode (src/lib/lite.ts). */
export default function LiteWatch() {
  useEffect(() => startLiteWatch(), []);
  return null;
}
