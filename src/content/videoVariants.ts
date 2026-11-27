/*
 * Muted loops shown small (≤ ~640px wide) that have a lighter 1280px copy
 * next to them (<base>-sm.mp4, no audio). Inline loops play the copy; the
 * fullscreen player keeps the original 1080p file (with its sound).
 * Decoding several 1080p loops at once made weaker GPUs and phones stutter.
 */
const SMALL = new Set([
  "/broadcast/nba-style/final-flamengo",
  "/broadcast/nba-style/final-palmeiras",
  "/broadcast/world-cup/escalacao-arg-esp",
  "/broadcast/world-cup/escalacao-bra-por",
  "/broadcast/champions/halftime",
  "/broadcast/champions/escudo-city",
  "/broadcast/champions/placar",
  "/broadcast/bora-copar/vinheta",
  "/broadcast/bora-copar/bumper",
  "/broadcast/bora-copar/live-1",
  "/broadcast/bora-copar/live-2",
]);

/** The file an inline (muted) loop should play for this base path. */
export const inlineSrc = (base: string) => `${base}${SMALL.has(base) ? "-sm" : ""}.mp4`;
