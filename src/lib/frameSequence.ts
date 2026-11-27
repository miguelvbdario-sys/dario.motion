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
 * Frames download in the background (as compressed files, a few MB in all),
 * closest to the requested frame first, so a scrub that starts mid-sequence
 * gets its own frames early. While a frame is not ready, the nearest ready one
 * is shown, so the canvas never goes blank.
 *
 * Performance: the WebP frames (with alpha) are expensive to decode. Drawing a
 * plain <img> made the browser decode it on the main thread on every frame
 * change, which froze slower machines. Here each file is decoded with
 * createImageBitmap(blob), which Chrome does on a background thread, and only
 * the decoded frames around the playhead are kept (memory stays bounded).
 */
export class FrameSequence {
  readonly first: number;
  readonly last: number;

  private readonly canvas: HTMLCanvasElement;
  private readonly ctx: CanvasRenderingContext2D | null;
  private readonly url: (frame: number) => string;
  private readonly concurrency: number;
  private readonly onReady?: () => void;

  /** Downloaded (still compressed) frames. */
  private readonly blobs = new Map<number, Blob>();
  /** Decoded frames around the playhead. */
  private readonly bitmaps = new Map<number, ImageBitmap>();
  private readonly decoding = new Set<number>();
  private readonly pending: number[] = [];
  private active = 0;
  private wanted: number;
  private painted = -1;
  private alive = true;
  private inactive = false;

  /** Decoded frames kept on each side of the playhead. */
  private static readonly RADIUS = 10;
  /** Decodes running at once. */
  private static readonly DECODES = 3;
  private static readonly COARSE = 6;

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
    if (moved) {
      this.evictFar();
      this.decodeNext();
      this.pump();
    }
    this.paintBest();
  }

  /**
   * For two sequences sharing one canvas: an inactive sequence keeps loading
   * but never paints. Activating it forgets what it last painted, so its next
   * draw() repaints.
   */
  setActive(active: boolean) {
    this.inactive = !active;
    if (active) this.painted = -1;
  }

  destroy() {
    this.alive = false;
    this.pending.length = 0;
    for (const bmp of this.bitmaps.values()) bmp.close();
    this.bitmaps.clear();
    this.blobs.clear();
    this.alphaMaps.clear();
  }

  // ---------- Download ----------

  private pump() {
    while (this.alive && this.active < this.concurrency && this.pending.length > 0) {
      const frame = this.takeClosestPending();
      this.active++;
      fetch(this.url(frame))
        .then((r) => (r.ok ? r.blob() : Promise.reject(new Error(String(r.status)))))
        .then((blob) => {
          if (!this.alive) return;
          this.blobs.set(frame, blob);
          this.decodeNext();
        })
        .catch(() => {})
        .finally(() => {
          this.active--;
          this.pump();
        });
    }
  }

  /**
   * Next frame to download: first a coarse pass (every COARSE-th frame, closest
   * first), so the whole range scrubs early on a slow connection, then the
   * frames in between, closest to the requested one first.
   */
  private takeClosestPending() {
    const coarseLeft = this.pending.some((f) => f % FrameSequence.COARSE === 0);
    const cost = (f: number) =>
      Math.abs(f - this.wanted) + (coarseLeft && f % FrameSequence.COARSE !== 0 && f !== this.wanted ? 1e6 : 0);
    let best = 0;
    for (let i = 1; i < this.pending.length; i++) {
      if (cost(this.pending[i]) < cost(this.pending[best])) best = i;
    }
    return this.pending.splice(best, 1)[0];
  }

  // ---------- Decode (background thread) ----------

  /** Start decoding the downloaded frames closest to the playhead, a few at a time. */
  private decodeNext() {
    if (!this.alive || typeof createImageBitmap !== "function") return;
    const R = FrameSequence.RADIUS;
    for (let d = 0; d <= R && this.decoding.size < FrameSequence.DECODES; d++) {
      for (const f of d ? [this.wanted + d, this.wanted - d] : [this.wanted]) {
        if (this.decoding.size >= FrameSequence.DECODES) break;
        if (this.bitmaps.has(f) || this.decoding.has(f)) continue;
        const blob = this.blobs.get(f);
        if (blob) this.decode(f, blob);
      }
    }
    // Nothing decoded yet near the playhead: decode the nearest downloaded frame
    // anywhere, so the canvas shows something as early as possible.
    if (this.painted < 0 && this.decoding.size === 0 && this.bitmaps.size === 0) {
      const f = this.nearestIn(this.blobs, this.wanted);
      if (f >= 0) this.decode(f, this.blobs.get(f)!);
    }
  }

  private decode(frame: number, blob: Blob) {
    this.decoding.add(frame);
    createImageBitmap(blob)
      .then((bmp) => {
        this.decoding.delete(frame);
        if (!this.alive) return bmp.close();
        if (!this.alphaMaps.has(frame)) this.buildAlpha(frame, bmp);
        // Far from the playhead by now (and not the only frame): drop it.
        if (Math.abs(frame - this.wanted) > FrameSequence.RADIUS + 2 && this.bitmaps.size > 0) {
          bmp.close();
        } else {
          this.bitmaps.set(frame, bmp);
          this.paintBest();
        }
        this.decodeNext();
      })
      .catch(() => {
        this.decoding.delete(frame);
        this.decodeNext();
      });
  }

  private evictFar() {
    const keep = FrameSequence.RADIUS + 2;
    for (const [f, bmp] of this.bitmaps) {
      if (Math.abs(f - this.wanted) > keep && f !== this.painted) {
        bmp.close();
        this.bitmaps.delete(f);
      }
    }
  }

  // ---------- Paint ----------

  /** Nearest key of `map` to `frame`, or -1. */
  private nearestIn(map: Map<number, unknown>, frame: number) {
    const span = this.last - this.first;
    for (let d = 0; d <= span; d++) {
      if (map.has(frame - d)) return frame - d;
      if (map.has(frame + d)) return frame + d;
    }
    return -1;
  }

  private paintBest() {
    if (!this.alive || !this.ctx || this.inactive) return;
    const frame = this.nearestIn(this.bitmaps, this.wanted);
    if (frame < 0 || frame === this.painted) return;
    const bmp = this.bitmaps.get(frame)!;

    const { canvas, ctx } = this;
    if (canvas.width !== bmp.width || canvas.height !== bmp.height) {
      // Resizing also clears the canvas.
      canvas.width = bmp.width;
      canvas.height = bmp.height;
    } else {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
    ctx.drawImage(bmp, 0, 0);

    const firstPaint = this.painted < 0;
    this.painted = frame;
    if (firstPaint) this.onReady?.();
  }

  // ---------- Alpha (hit-testing the character under the mouse) ----------

  /** Small alpha copy (ALPHA_SIZE²) of each frame, built once from its decoded bitmap. */
  private readonly alphaMaps = new Map<number, Uint8ClampedArray>();
  private alphaCtx: CanvasRenderingContext2D | null = null;
  private static readonly ALPHA_SIZE = 96;

  private buildAlpha(frame: number, bmp: ImageBitmap) {
    const size = FrameSequence.ALPHA_SIZE;
    if (!this.alphaCtx) {
      const small = document.createElement("canvas");
      small.width = small.height = size;
      this.alphaCtx = small.getContext("2d", { willReadFrequently: true });
    }
    const ctx = this.alphaCtx;
    if (!ctx) return;
    ctx.clearRect(0, 0, size, size);
    ctx.drawImage(bmp, 0, 0, size, size);
    this.alphaMaps.set(frame, ctx.getImageData(0, 0, size, size).data);
  }

  /** Alpha copy of the frame on screen, or of the nearest frame that has one. */
  private alphaFor(frame: number) {
    const f = this.nearestIn(this.alphaMaps, frame);
    return f < 0 ? null : this.alphaMaps.get(f)!;
  }

  /**
   * Opacity (0–255) of the frame on screen at a point given in 0–1 canvas
   * coordinates, from the small cached copy (cheap on every mouse move).
   */
  alphaAt(nx: number, ny: number) {
    if (nx < 0 || ny < 0 || nx >= 1 || ny >= 1 || this.painted < 0) return 0;
    const size = FrameSequence.ALPHA_SIZE;
    const data = this.alphaFor(this.painted);
    if (!data) return 0;
    const x = Math.floor(nx * size);
    const y = Math.floor(ny * size);
    return data[(y * size + x) * 4 + 3];
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
    const data = this.alphaFor(this.painted);
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
}
