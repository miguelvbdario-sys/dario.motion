/**
 * Optional interface sounds in the site's CRT / broadcast-glitch theme,
 * synthesised with Web Audio (no files to load). Off by default; the visitor
 * turns them on with the speaker button in the timeline bar, and the choice is
 * remembered on this device.
 *
 * One sound per kind of action, each with a little random variation so a
 * repeated action never sounds identical:
 *   tick      buttons / links      a short burst of static, like a relay click
 *   channel   tabs, picking items  a channel change: static + a pitched blip
 *   swoosh    carousels, arrows    filtered noise sliding past
 *   crtOn     opening a card       a tube powering up: thump + rising whine
 *   crtOff    closing a card       the picture collapsing: falling zip
 *   glitch    the open glitch      bit-crushed digital stutter
 *   playerOn  opening the player   a degauss hum that settles
 *   goal      a goal               two broadcast beeps over a crowd of static
 *   power     turning sound on     a small power-on chirp
 */

const KEY = "site-sound";
const EVENT = "site:sound";
let ctx: AudioContext | null = null;
let noiseBuf: AudioBuffer | null = null;
let master: GainNode | null = null;
/** Time each sound last played (sounds that fire in bursts are rate-limited). */
const lastAt: Record<string, number> = {};

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
  if (on) power();
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
    master = ctx.createGain();
    master.gain.value = 0.9;
    master.connect(ctx.destination);
    // One second of white noise, reused by every static-based sound.
    noiseBuf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  }
  if (ctx.state === "suspended") ctx.resume().catch(() => {});
  return ctx;
}

/** Plays only when sound is on and `name` didn't just play (min gap in ms). */
function ready(name: string, gap = 40): AudioContext | null {
  if (!soundOn()) return null;
  const now = performance.now();
  if (now - (lastAt[name] ?? 0) < gap) return null;
  lastAt[name] = now;
  return audio();
}

const vary = (v: number, amount = 0.08) => v * (1 + (Math.random() * 2 - 1) * amount);

/** Envelope: fast attack to `peak`, exponential decay over `dur`. */
function env(a: AudioContext, start: number, peak: number, dur: number, attack = 0.004) {
  const g = a.createGain();
  g.gain.setValueAtTime(0.0001, start);
  g.gain.exponentialRampToValueAtTime(peak, start + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, start + dur);
  g.connect(master!);
  return g;
}

function osc(a: AudioContext, type: OscillatorType, f0: number, f1: number | null, start: number, dur: number, peak: number) {
  const o = a.createOscillator();
  o.type = type;
  o.frequency.setValueAtTime(f0, start);
  if (f1) o.frequency.exponentialRampToValueAtTime(f1, start + dur);
  o.connect(env(a, start, peak, dur));
  o.start(start);
  o.stop(start + dur + 0.03);
}

/** Filtered noise: bandpass at `f0` (sliding to `f1`), `q` sharpness. */
function noise(a: AudioContext, start: number, dur: number, peak: number, f0: number, f1: number | null = null, q = 1) {
  const src = a.createBufferSource();
  src.buffer = noiseBuf;
  src.loop = true;
  const bp = a.createBiquadFilter();
  bp.type = "bandpass";
  bp.Q.value = q;
  bp.frequency.setValueAtTime(f0, start);
  if (f1) bp.frequency.exponentialRampToValueAtTime(f1, start + dur);
  src.connect(bp).connect(env(a, start, peak, dur, 0.002));
  src.start(start, Math.random() * 0.8);
  src.stop(start + dur + 0.03);
}

/** Button / link press: a short burst of static, like a relay. */
export function tick() {
  const a = ready("tick");
  if (!a) return;
  const t = a.currentTime;
  noise(a, t, vary(0.03, 0.3), 0.18, vary(3200, 0.25), null, 2.5);
  osc(a, "square", vary(2400, 0.1), null, t, 0.012, 0.025);
}

/** Tab / item change: a TV channel switch, static then a short pitched blip. */
export function channel() {
  const a = ready("channel", 60);
  if (!a) return;
  const t = a.currentTime;
  noise(a, t, 0.07, 0.22, 1800, 5200, 0.8);
  osc(a, "sine", vary(880, 0.06), vary(1320, 0.06), t + 0.05, 0.07, 0.07);
}

/** Carousel step / arrows: filtered noise sliding past. */
export function swoosh(dir: 1 | -1 = 1) {
  const a = ready("swoosh", 80);
  if (!a) return;
  const t = a.currentTime;
  const [f0, f1] = dir > 0 ? [600, 3400] : [3400, 600];
  noise(a, t, vary(0.22, 0.1), 0.16, vary(f0, 0.1), vary(f1, 0.1), 1.6);
}

/** Opening a card: a tube powering up, low thump + rising whine + a breath of static. */
export function crtOn() {
  const a = ready("crtOn", 150);
  if (!a) return;
  const t = a.currentTime;
  osc(a, "sine", 90, 45, t, 0.18, 0.2);
  osc(a, "sawtooth", vary(400, 0.05), vary(2600, 0.05), t + 0.02, 0.28, 0.03);
  noise(a, t + 0.04, 0.3, 0.07, 4000, 7000, 0.7);
}

/** Closing a card: the picture collapsing to a line, a falling zip. */
export function crtOff() {
  const a = ready("crtOff", 150);
  if (!a) return;
  const t = a.currentTime;
  osc(a, "triangle", vary(1800, 0.05), 120, t, 0.16, 0.08);
  noise(a, t, 0.12, 0.1, 5000, 400, 1.2);
}

/** The card-open glitch: a bit-crushed digital stutter (quick on/off squares). */
export function glitch() {
  const a = ready("glitch", 200);
  if (!a) return;
  const t = a.currentTime;
  for (let i = 0; i < 5; i++) {
    const s = t + i * 0.045 + Math.random() * 0.012;
    osc(a, "square", vary(i % 2 ? 220 : 1760, 0.2), null, s, 0.025, 0.035);
    noise(a, s, 0.02, 0.08, vary(6000, 0.3), null, 4);
  }
}

/** Opening the fullscreen player: a degauss hum that wobbles and settles. */
export function playerOn() {
  const a = ready("playerOn", 300);
  if (!a) return;
  const t = a.currentTime;
  const o = a.createOscillator();
  o.type = "sawtooth";
  o.frequency.setValueAtTime(60, t);
  const lfo = a.createOscillator();
  const depth = a.createGain();
  lfo.frequency.value = 14;
  depth.gain.setValueAtTime(18, t);
  depth.gain.exponentialRampToValueAtTime(0.5, t + 0.45);
  lfo.connect(depth).connect(o.frequency);
  const lp = a.createBiquadFilter();
  lp.type = "lowpass";
  lp.frequency.value = 500;
  o.connect(lp).connect(env(a, t, 0.12, 0.5, 0.02));
  o.start(t);
  lfo.start(t);
  o.stop(t + 0.55);
  lfo.stop(t + 0.55);
  osc(a, "sine", 1500, 3000, t + 0.08, 0.2, 0.025);
}

/** Goal: two broadcast beeps over a short crowd-like roar of static. */
export function goal() {
  const a = ready("goal", 300);
  if (!a) return;
  const t = a.currentTime;
  osc(a, "square", 988, null, t, 0.09, 0.07);
  osc(a, "square", 1319, null, t + 0.11, 0.16, 0.07);
  noise(a, t + 0.05, 0.9, 0.06, 900, 1400, 0.5);
}

/** Turning sound on: a small rising chirp (the only sound that confirms the toggle). */
export function power() {
  const a = audio();
  if (!a) return;
  const t = a.currentTime;
  osc(a, "sine", 440, 1760, t, 0.12, 0.08);
  noise(a, t, 0.06, 0.05, 3000, null, 2);
}

/** Back-compat name: opening something. */
export const open = crtOn;
