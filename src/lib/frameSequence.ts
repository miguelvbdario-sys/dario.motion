type FrameSequenceOptions = {
  canvas: HTMLCanvasElement;
  /** First and last frame numbers (inclusive), as used in the file names. */
  first: number;
  last: number;
  url: (frame: number) => string;
  /** How many frames download in parallel. */
  concurrency?: number;
  /** Called once, when the first frame reaches the canvas. */
  onReady?: () => void;
};

/**
 * Numbered image sequence painted on a <canvas>.
 *
 * Frames download in the background, closest to the requested frame first, so
 * a scrub that starts mid-sequence (reload with a restored scroll position)
 * gets its own frames early. While a frame is still loading, the nearest
 * loaded one is shown, so the canvas never goes blank.
 */
export class FrameSequence {
  readonly first: number;
  readonly last: number;

  private readonly canvas: HTMLCanvasElement;
  private readonly ctx: CanvasRenderingContext2D | null;
  private readonly url: (frame: number) => string;
  private readonly concurrency: number;
  private readonly onReady?: () => void;

  private readonly images = new Map<number, HTMLImageElement>();
  private readonly loaded = new Set<number>();
  private readonly pending: number[] = [];
  private active = 0;
  private wanted: number;
  private painted = -1;
  private alive = true;

  constructor(options: FrameSequenceOptions) {
    this.canvas = options.canvas;
    this.ctx = options.canvas.getContext("2d");
    this.first = options.first;
    this.last = options.last;
    this.url = options.url;
    this.concurrency = options.concurrency ?? 6;
    this.onReady = options.onReady;
    this.wanted = options.first;

    for (let frame = this.first; frame <= this.last; frame++) this.pending.push(frame);
    this.pump();
  }

  /** Show `frame` (rounded and clamped to the sequence range). */
  draw(frame: number) {
    const next = Math.min(this.last, Math.max(this.first, Math.round(frame)));
    const moved = next !== this.wanted;
    this.wanted = next;
    this.paintBest();
    if (moved) {
      this.warm(next);
      this.pump();
    }
  }

  /**
   * For two sequences sharing one canvas: an inactive sequence keeps loading
   * but never paints (not even when a frame finishes loading). Activating it
   * forgets what it last painted, so its next draw() repaints.
   */
  setActive(active: boolean) {
    this.inactive = !active;
    if (active) this.painted = -1;
  }
  private inactive = false;

  destroy() {
    this.alive = false;
    this.pending.length = 0;
    for (const img of this.images.values()) {
      img.onload = null;
      img.onerror = null;
    }
    this.images.clear();
    this.loaded.clear();
  }

  private pump() {
    while (this.alive && this.active < this.concurrency && this.pending.length > 0) {
      const frame = this.takeClosestPending();
      const img = new Image();
      img.decoding = "async";
      this.active++;
      img.onload = () => {
        this.active--;
        this.loaded.add(frame);
        this.paintBest();
        this.pump();
      };
      img.onerror = () => {
        this.active--;
        this.pump();
      };
      this.images.set(frame, img);
      img.src = this.url(frame);
    }
  }

  private takeClosestPending() {
    let best = 0;
    for (let i = 1; i < this.pending.length; i++) {
      if (Math.abs(this.pending[i] - this.wanted) < Math.abs(this.pending[best] - this.wanted)) {
        best = i;
      }
    }
    return this.pending.splice(best, 1)[0];
  }

  /** Nearest loaded frame to `frame`, or -1 while nothing has loaded. */
  private nearest(frame: number) {
    const span = this.last - this.first;
    for (let d = 0; d <= span; d++) {
      if (this.loaded.has(frame - d)) return frame - d;
      if (this.loaded.has(frame + d)) return frame + d;
    }
    return -1;
  }

  private paintBest() {
    if (!this.alive || !this.ctx || this.inactive) return;
    const frame = this.nearest(this.wanted);
    if (frame < 0 || frame === this.painted) return;
    const img = this.images.get(frame);
    if (!img) return;

    const { canvas, ctx } = this;
    if (canvas.width !== img.naturalWidth || canvas.height !== img.naturalHeight) {
      // Resizing also clears the canvas.
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
    } else {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
    ctx.drawImage(img, 0, 0);

    const firstPaint = this.painted < 0;
    this.painted = frame;
    if (firstPaint) this.onReady?.();
  }

  private alphaMap: { frame: number; data: Uint8ClampedArray } | null = null;
  private static readonly ALPHA_SIZE = 96;

  /**
   * Opacity (0–255) of the frame on screen at a point given in 0–1 canvas
   * coordinates. Reads a small cached copy of the frame, rebuilt only when the
   * frame changes, so it is cheap to call on every mouse move.
   */
  alphaAt(nx: number, ny: number) {
    if (nx < 0 || ny < 0 || nx >= 1 || ny >= 1 || this.painted < 0) return 0;
    const size = FrameSequence.ALPHA_SIZE;
    if (!this.alphaMap || this.alphaMap.frame !== this.painted) {
      const img = this.images.get(this.painted);
      if (!img) return 0;
      const small = document.createElement("canvas");
      small.width = small.height = size;
      const ctx = small.getContext("2d", { willReadFrequently: true });
      if (!ctx) return 0;
      ctx.drawImage(img, 0, 0, size, size);
      this.alphaMap = { frame: this.painted, data: ctx.getImageData(0, 0, size, size).data };
    }
    const x = Math.floor(nx * size);
    const y = Math.floor(ny * size);
    return this.alphaMap.data[(y * size + x) * 4 + 3];
  }

  private inkCache: { frame: number; threshold: number; box: { x0: number; y0: number; x1: number; y1: number } | null } | null = null;

  /**
   * Bounding box (0–1 canvas coordinates) of the pixels on screen whose
   * opacity is above `threshold`: the solid body of the figure, without its
   * soft glow. Cached per frame.
   */
  inkBounds(threshold = 160) {
    if (this.painted < 0) return null;
    if (this.inkCache && this.inkCache.frame === this.painted && this.inkCache.threshold === threshold) {
      return this.inkCache.box;
    }
    this.alphaAt(0.5, 0.5); // builds the small alpha copy for this frame
    const data = this.alphaMap?.data;
    if (!data) return null;
    const size = FrameSequence.ALPHA_SIZE;
    let x0 = size;
    let y0 = size;
    let x1 = -1;
    let y1 = -1;
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        if (data[(y * size + x) * 4 + 3] > threshold) {
          if (x < x0) x0 = x;
          if (x > x1) x1 = x;
          if (y < y0) y0 = y;
          if (y > y1) y1 = y;
        }
      }
    }
    const box = x1 < 0 ? null : { x0: x0 / size, y0: y0 / size, x1: (x1 + 1) / size, y1: (y1 + 1) / size };
    this.inkCache = { frame: this.painted, threshold, box };
    return box;
  }

  /** Ask the browser to decode the frames around the playhead ahead of time. */
  private warm(frame: number) {
    for (const offset of [1, 2, 3, 4, -1, -2]) {
      const neighbour = frame + offset;
      if (!this.loaded.has(neighbour)) continue;
      this.images.get(neighbour)?.decode().catch(() => {});
    }
  }
}
