import {
  BASE_FRAMES,
  FRAME_SIZE,
  GOAL_SCORE_FRAME,
  SCOREBOARD_CROP,
  SCOREBOARD_FPS,
  SCORE_FONT,
  SCORE_LAYOUT,
  SHIELD_FRAMES,
  TEAM_FRAMES,
  TEAM_OFFSET,
  framePath,
  goalFramesOf,
  plateDelayOf,
} from "@/content/scoreboard";

/*
 * Plays the scoreboard: stacked frame sequences on one canvas, plus the score
 * and the clock drawn as live text.
 *
 *   base                 in → holds on its last frame → out (the in, reversed)
 *   score + clock        drawn on the base, fading in near the end of the in
 *   home / away plates   locked to the base: plate frame = base frame − 55
 *   goal                 on top, plays once (in and out), then clears
 *   shield mode          replaces the plates once the in is done (plates' last
 *                        frame = shield frame 0); off = reversed. OUT with the
 *                        shield on: shield reverses first, then the normal out.
 *
 * The clock starts at 00:00 when the in finishes and runs until OUT. Each goal
 * adds 1 to its side while the goal art covers the board. Everything resets
 * once the board is off air.
 */

export type Side = "home" | "away";
export type BoardStatus = "hidden" | "in" | "shown" | "out";
export type ShieldState = "off" | "turning-on" | "on" | "turning-off";

type Sequence = { images: HTMLImageElement[]; loaded: boolean[]; ready: Promise<void> };

const cache = new Map<string, Sequence>();

/** Load (once) every frame of a sequence folder. */
function load(folder: string, count: number): Sequence {
  let seq = cache.get(folder);
  if (seq) return seq;
  const images: HTMLImageElement[] = [];
  const loaded: boolean[] = new Array(count).fill(false);
  const ready = Promise.all(
    Array.from({ length: count }, (_, i) => {
      const img = new Image();
      img.decoding = "async";
      images.push(img);
      return new Promise<void>((resolve) => {
        img.onload = () => {
          loaded[i] = true;
          resolve();
        };
        img.onerror = () => resolve();
        img.src = framePath(folder, i);
      });
    }),
  ).then(() => undefined);
  seq = { images, loaded, ready };
  cache.set(folder, seq);
  return seq;
}

let fontReady: Promise<void> | null = null;
/** True once the score font is in: only then are its measurements cached. */
let fontLoaded = false;
function loadFont() {
  if (!fontReady) {
    const face = new FontFace(SCORE_FONT.family, `url(${SCORE_FONT.url})`);
    fontReady = face
      .load()
      .then((f) => {
        document.fonts.add(f);
        fontLoaded = true;
      })
      .catch(() => undefined);
  }
  return fontReady;
}

/** Font size, equal digit cell and baseline offset for one digit height. */
type DigitMetrics = { font: string; cell: number; mid: number; widths: Map<string, number> };

/** Ease-out from a to b: most of the change happens at the start. */
const easeOut = (a: number, b: number, x: number, power: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return 1 - Math.pow(1 - t, power);
};

const formatClock = (seconds: number) => {
  const s = Math.floor(seconds);
  return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
};

export class ScoreboardEngine {
  private readonly ctx: CanvasRenderingContext2D | null;
  /** Offscreen layer for the base + numbers, composited over the teams. */
  private readonly layer: HTMLCanvasElement;
  private readonly layerCtx: CanvasRenderingContext2D | null;
  private readonly base: Sequence;
  private readonly teams: Record<Side, { slug: string; seq: Sequence; shield: Sequence }>;
  private shieldFrame = 0;
  private shieldDir: 1 | -1 | 0 = 0;
  /** OUT was asked while the shield was on: the base waits for the shield to reverse. */
  private outAfterShield = false;
  /** frame −1 = waiting (frames loading, or the shield reversing first). */
  private goal: { seq: Sequence; frame: number; last: number; side: Side; scored: boolean; loaded: boolean } | null =
    null;

  private frame = 0;
  private direction: 1 | -1 | 0 = 0;
  private status: BoardStatus = "hidden";
  private dirty = true;

  private score: Record<Side, number> = { home: 0, away: 0 };
  private clock = 0;

  constructor(
    private readonly canvas: HTMLCanvasElement,
    home: string,
    away: string,
    private readonly onStatus: (status: BoardStatus) => void,
  ) {
    canvas.width = SCOREBOARD_CROP.width;
    canvas.height = SCOREBOARD_CROP.height;
    this.ctx = canvas.getContext("2d");
    this.layer = document.createElement("canvas");
    this.layer.width = SCOREBOARD_CROP.width;
    this.layer.height = SCOREBOARD_CROP.height;
    this.layerCtx = this.layer.getContext("2d");
    this.base = load("base", BASE_FRAMES);
    this.teams = {
      home: { slug: home, seq: load(`home/${home}`, TEAM_FRAMES), shield: load(`shield/home/${home}`, SHIELD_FRAMES) },
      away: { slug: away, seq: load(`away/${away}`, TEAM_FRAMES), shield: load(`shield/away/${away}`, SHIELD_FRAMES) },
    };
    loadFont().then(() => (this.dirty = true));
  }

  /** Resolves when the base, both current plates and the font are loaded. */
  ready() {
    return Promise.all([this.base.ready, this.teams.home.seq.ready, this.teams.away.seq.ready, loadFont()]);
  }

  /** Start loading a goal animation ahead of time. */
  preloadGoal(slug: string) {
    return load(`goal/${slug}`, goalFramesOf(slug)).ready;
  }

  playIn() {
    if (this.status === "shown" || this.status === "in") return;
    if (this.outAfterShield) {
      // IN again while the shield was reversing for an OUT: bring the shield back.
      this.outAfterShield = false;
      this.shieldDir = 1;
    }
    this.direction = 1;
    this.setStatus("in");
  }

  playOut() {
    if (this.status === "hidden" || this.status === "out") return;
    this.setStatus("out");
    if (this.shieldFrame > 0) {
      // Shield first, reversed; the base starts its out when it reaches frame 0.
      this.shieldDir = -1;
      this.outAfterShield = true;
    } else {
      this.direction = -1;
    }
  }

  /** Jump straight back to off air (board hidden, score/clock/shield cleared). */
  reset() {
    if (this.status === "hidden" && this.frame === 0) return;
    this.frame = 0;
    this.direction = 0;
    this.goal = null;
    this.score = { home: 0, away: 0 };
    this.clock = 0;
    this.shieldFrame = 0;
    this.shieldDir = 0;
    this.outAfterShield = false;
    this.dirty = true;
    this.setStatus("hidden");
  }

  /** Turn shield mode on or off (reverses mid-way if it's still moving). */
  async toggleShield() {
    if (!this.canShield) return;
    const { home, away } = this.teams;
    await Promise.all([home.shield.ready, away.shield.ready]);
    if (!this.canShield) return;
    const goingOn = this.shieldDir === 1 || (this.shieldDir === 0 && this.shieldFrame > 0);
    this.shieldDir = goingOn ? -1 : 1;
    this.dirty = true;
  }

  /** Swap a team plate. The new plate shows the frame that matches the base right away. */
  async setTeam(side: Side, slug: string) {
    const seq = load(`${side}/${slug}`, TEAM_FRAMES);
    const shield = load(`shield/${side}/${slug}`, SHIELD_FRAMES);
    await Promise.all([seq.ready, shield.ready]);
    this.teams[side] = { slug, seq, shield };
    this.dirty = true;
  }

  /**
   * Goal for one side. Only once the in has fully finished, one goal at a time.
   * With the shield on, the shield reverses first (the goal art only covers the
   * plates), then the goal plays.
   */
  async playGoal(side: Side) {
    if (!this.canGoal) return;
    const slug = this.teams[side].slug;
    const count = goalFramesOf(slug);
    if (!count) return;
    const seq = load(`goal/${slug}`, count);
    // Claim the slot now so a double click can't start two goals.
    this.goal = { seq, frame: -1, last: count - 1, side, scored: false, loaded: false };
    if (this.shieldFrame > 0) this.shieldDir = -1;
    await seq.ready;
    if (this.goal?.seq === seq) this.goal.loaded = true;
  }

  get canGoal() {
    return this.status === "shown" && this.goal === null && this.shieldDir === 0;
  }
  /** Shield mode can be switched once the in has fully finished, and not during a goal. */
  get canShield() {
    return this.status === "shown" && this.goal === null;
  }
  get shieldState(): ShieldState {
    if (this.shieldDir === 1) return "turning-on";
    if (this.shieldDir === -1) return "turning-off";
    return this.shieldFrame > 0 ? "on" : "off";
  }
  get baseFrame() {
    return Math.round(this.frame);
  }
  get clockSeconds() {
    return this.clock;
  }
  get scores() {
    return this.score;
  }

  /** Advance by `dt` seconds and redraw if anything moved. */
  tick(dt: number) {
    const step = dt * SCOREBOARD_FPS;
    const last = BASE_FRAMES - 1;

    if (this.direction !== 0) {
      this.frame += step * this.direction;
      if (this.frame >= last) {
        this.frame = last;
        this.direction = 0;
        this.setStatus("shown");
      } else if (this.frame <= 0) {
        this.frame = 0;
        this.direction = 0;
        this.goal = null;
        this.score = { home: 0, away: 0 };
        this.clock = 0;
        this.shieldFrame = 0;
        this.shieldDir = 0;
        this.setStatus("hidden");
      }
      this.dirty = true;
    }

    if (this.shieldDir !== 0) {
      this.shieldFrame += step * this.shieldDir;
      if (this.shieldFrame >= SHIELD_FRAMES - 1) {
        this.shieldFrame = SHIELD_FRAMES - 1;
        this.shieldDir = 0;
      } else if (this.shieldFrame <= 0) {
        this.shieldFrame = 0;
        this.shieldDir = 0;
        if (this.outAfterShield) {
          this.outAfterShield = false;
          this.direction = -1;
        }
      }
      this.dirty = true;
    }

    // The clock runs from the end of the in until OUT.
    if (this.status === "shown") {
      const before = Math.floor(this.clock);
      this.clock += dt;
      if (Math.floor(this.clock) !== before) this.dirty = true;
    }

    // A waiting goal starts once its frames are in and the shield is fully off.
    if (this.goal && this.goal.frame < 0 && this.goal.loaded && this.shieldFrame === 0 && this.status === "shown") {
      this.goal.frame = 0;
    } else if (this.goal && this.goal.frame >= 0) {
      this.goal.frame += step;
      if (!this.goal.scored && this.goal.frame >= GOAL_SCORE_FRAME) {
        this.goal.scored = true;
        this.score[this.goal.side] += 1;
      }
      if (this.goal.frame >= this.goal.last) this.goal = null;
      this.dirty = true;
    }

    if (this.dirty) this.draw();
  }

  private draw() {
    this.dirty = false;
    const { ctx, canvas } = this;
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (this.status !== "hidden") {
      const b = this.baseFrame;
      const s = Math.round(this.shieldFrame);
      if (s > 0) {
        // Shield mode replaces the plates (its frame 0 is the plates' last frame).
        for (const side of ["home", "away"] as const) {
          const { seq, shield } = this.teams[side];
          if (shield.loaded[s]) this.drawFrame(shield, s);
          else this.drawFrame(seq, TEAM_FRAMES - 1);
        }
      } else if (b >= TEAM_OFFSET) {
        for (const side of ["home", "away"] as const) {
          const { seq, slug } = this.teams[side];
          const t = Math.min(Math.max(b - TEAM_OFFSET - plateDelayOf(slug), 0), TEAM_FRAMES - 1);
          this.drawFrame(seq, t);
        }
      }
      // Base on top of the teams. It goes through its own layer so the numbers
      // are masked by the base only (source-atop), not by the plates.
      const lctx = this.layerCtx;
      if (lctx) {
        lctx.clearRect(0, 0, this.layer.width, this.layer.height);
        this.drawFrame(this.base, b, lctx);
        this.drawNumbers(easeOut(SCORE_LAYOUT.fadeFrom, SCORE_LAYOUT.fadeTo, this.frame, SCORE_LAYOUT.easePower));
        ctx.drawImage(this.layer, 0, 0);
      }
    }
    if (this.goal && this.goal.frame >= 0) this.drawFrame(this.goal.seq, Math.round(this.goal.frame));
  }

  /** Score and clock, painted only where the base has pixels (source-atop). */
  private drawNumbers(alpha: number) {
    const ctx = this.layerCtx;
    if (!ctx || alpha <= 0) return;
    const L = SCORE_LAYOUT;
    ctx.save();
    ctx.globalCompositeOperation = "source-atop";
    ctx.globalAlpha = alpha;
    ctx.fillStyle = L.color;
    ctx.textBaseline = "alphabetic";
    // Slide in: home from the left, away from the right, clock from above.
    const k = 1 - alpha;
    this.drawCells(String(this.score.home), L.home, -k * L.slide.home, 0);
    this.drawCells(String(this.score.away), L.away, k * L.slide.away, 0);
    this.drawCells(formatClock(this.clock), L.clock, 0, -k * L.slide.clock);
    ctx.restore();
  }

  /**
   * Draw text centred on (x, y) with every digit in an equal-width cell, so the
   * running clock doesn't jitter sideways. `size` is the digit height.
   */
  private drawCells(text: string, at: { x: number; y: number; size: number }, offX: number, offY: number) {
    const ctx = this.layerCtx!;
    const m = this.digitMetrics(ctx, at.size);
    ctx.font = m.font;
    ctx.textAlign = "center";

    const widthOf = (c: string) => {
      if (/\d/.test(c)) return m.cell;
      let w = m.widths.get(c);
      if (w === undefined) m.widths.set(c, (w = ctx.measureText(c).width));
      return w;
    };
    const widths = [...text].map(widthOf);
    const total = widths.reduce((a, w) => a + w, 0);

    const baseline = at.y + m.mid - SCOREBOARD_CROP.y + offY;
    let x = at.x - SCOREBOARD_CROP.x - total / 2 + offX;
    [...text].forEach((c, i) => {
      ctx.fillText(c, x + widths[i] / 2, baseline);
      x += widths[i];
    });
  }

  /**
   * Measurements for a digit height (font size, widest digit, vertical centre).
   * They never change for a given size, so they are measured once (after the
   * font has loaded) instead of on every frame.
   */
  private metrics = new Map<number, DigitMetrics>();
  private digitMetrics(ctx: CanvasRenderingContext2D, size: number): DigitMetrics {
    const cached = this.metrics.get(size);
    if (cached) return cached;
    ctx.font = `100px ${SCORE_FONT.family}`;
    const zero = ctx.measureText("0");
    const digitH = zero.actualBoundingBoxAscent + zero.actualBoundingBoxDescent || 70;
    const font = `${(size / digitH) * 100}px ${SCORE_FONT.family}`;
    ctx.font = font;
    let cell = 0;
    for (let d = 0; d <= 9; d++) cell = Math.max(cell, ctx.measureText(String(d)).width);
    const z = ctx.measureText("0");
    const m: DigitMetrics = { font, cell, mid: (z.actualBoundingBoxAscent - z.actualBoundingBoxDescent) / 2, widths: new Map() };
    if (fontLoaded) this.metrics.set(size, m);
    return m;
  }

  private drawFrame(seq: Sequence, frame: number, ctx = this.ctx) {
    if (frame < 0 || !seq.loaded[frame]) return;
    const c = SCOREBOARD_CROP;
    const img = seq.images[frame];
    // Renders from a wider or taller comp share the same centre (some goals are 1460 wide).
    const dx = (img.naturalWidth - FRAME_SIZE.width) / 2;
    const dy = (img.naturalHeight - FRAME_SIZE.height) / 2;
    // The crop may reach past the image (it is centred on the art with
    // margins): clip the source to the image and offset the destination.
    let sx = c.x + dx;
    let sy = c.y + dy;
    let w = c.width;
    let h = c.height;
    let ox = 0;
    let oy = 0;
    if (sx < 0) {
      ox = -sx;
      w += sx;
      sx = 0;
    }
    if (sy < 0) {
      oy = -sy;
      h += sy;
      sy = 0;
    }
    w = Math.min(w, img.naturalWidth - sx);
    h = Math.min(h, img.naturalHeight - sy);
    if (w <= 0 || h <= 0) return;
    ctx?.drawImage(img, sx, sy, w, h, ox, oy, w, h);
  }

  private setStatus(status: BoardStatus) {
    if (status === this.status) return;
    this.status = status;
    this.onStatus(status);
  }
}
