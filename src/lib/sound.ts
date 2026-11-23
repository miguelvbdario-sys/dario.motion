/**
 * Optional interface sounds, synthesised with Web Audio (no files to load).
 * Off by default; the visitor turns them on with the speaker button in the
 * timeline bar, and the choice is remembered on this device.
 */

const KEY = "site-sound";
const EVENT = "site:sound";
let ctx: AudioContext | null = null;

export function soundOn(): boolean {
  try {
    return localStorage.getItem(KEY) === "on";
  } catch {
    return false;
  }
}

export function setSound(on: boolean) {
  try {
    localStorage.setItem(KEY, on ? "on" : "off");
  } catch {
    // Storage blocked: the choice lasts for this page only.
  }
  window.dispatchEvent(new CustomEvent(EVENT, { detail: on }));
  if (on) tick();
}

export function onSoundChange(cb: (on: boolean) => void) {
  const h = (e: Event) => cb((e as CustomEvent<boolean>).detail);
  window.addEventListener(EVENT, h);
  return () => window.removeEventListener(EVENT, h);
}

function audio(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!ctx) {
    const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
  }
  if (ctx.state === "suspended") ctx.resume().catch(() => {});
  return ctx;
}

/** A short tone with a fast attack and decay. */
function tone(freq: number, dur: number, gain: number, type: OscillatorType = "sine", glideTo?: number) {
  const a = audio();
  if (!a) return;
  const t = a.currentTime;
  const osc = a.createOscillator();
  const g = a.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t);
  if (glideTo) osc.frequency.exponentialRampToValueAtTime(glideTo, t + dur);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(gain, t + 0.006);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  osc.connect(g).connect(a.destination);
  osc.start(t);
  osc.stop(t + dur + 0.02);
}

/** Button / link press: a soft, short tick. */
export function tick() {
  if (!soundOn()) return;
  tone(1800, 0.035, 0.05, "triangle");
}

/** Opening something (a card, the player): a small rising blip. */
export function open() {
  if (!soundOn()) return;
  tone(520, 0.12, 0.06, "sine", 880);
}

/** Goal on the scoreboard: two quick broadcast beeps. */
export function goal() {
  if (!soundOn()) return;
  tone(988, 0.09, 0.08, "square");
  setTimeout(() => tone(1319, 0.14, 0.08, "square"), 110);
}
