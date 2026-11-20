/**
 * Background CRT scanlines drawn on a canvas, so they can bend.
 *
 * Around a point (the mouse light) the lines are pushed apart like under a
 * magnifying lens, inside an ellipse shaped like the light itself. Away from
 * it they stay perfectly straight. Redraws only when something changed.
 */
export class ScanlineField {
  private readonly canvas: HTMLCanvasElement;
  private readonly ctx: CanvasRenderingContext2D | null;
  private width = 0;
  private height = 0;
  private dpr = 1;
  private last = { x: -1, y: -1, s: -1 };
  /** The straight lines, drawn once per size; each frame only the lens band is redrawn. */
  private straight: HTMLCanvasElement | null = null;

  /** Line every `spacing` CSS px, `thickness` CSS px thick. */
  constructor(
    canvas: HTMLCanvasElement,
    private readonly options = {
      spacing: 4,
      thickness: 1,
      color: "rgba(0, 0, 0, 0.16)",
      /** Lens size as a share of the canvas (matches the light's ellipse). */
      radiusX: 0.26,
      radiusY: 0.36,
      /** How strongly the lens pushes lines apart at its centre. */
      strength: 0.95,
    },
  ) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this.resize();
  }

  resize() {
    const rect = this.canvas.getBoundingClientRect();
    // 1px lines at 16% black: device-pixel sharpness gains nothing and
    // quadruples the work on retina screens.
    this.dpr = 1;
    this.width = Math.max(1, Math.round(rect.width * this.dpr));
    this.height = Math.max(1, Math.round(rect.height * this.dpr));
    this.canvas.width = this.width;
    this.canvas.height = this.height;
    this.last = { x: -1, y: -1, s: -1 };
    this.straight = this.buildStraight();
    this.draw(0.5, 0.5, 0);
  }

  /** Draw all the straight lines once into an offscreen canvas. */
  private buildStraight() {
    const off = document.createElement("canvas");
    off.width = this.width;
    off.height = this.height;
    const c = off.getContext("2d");
    if (!c) return null;
    const step = this.options.spacing * this.dpr;
    const t = this.options.thickness * this.dpr;
    c.fillStyle = this.options.color;
    for (let y = 0; y < this.height; y += step) c.fillRect(0, y, this.width, t);
    return off;
  }

  /**
   * @param nx lens centre, 0–1 across the canvas
   * @param ny lens centre, 0–1 down the canvas
   * @param amount 0 = straight lines, 1 = full lens
   */
  draw(nx: number, ny: number, amount: number) {
    const { ctx, width: W, height: H, dpr } = this;
    if (!ctx) return;
    const l = this.last;
    if (Math.abs(nx - l.x) < 0.0005 && Math.abs(ny - l.y) < 0.0005 && Math.abs(amount - l.s) < 0.002) return;
    this.last = { x: nx, y: ny, s: amount };

    const { spacing, thickness, color, radiusX, radiusY, strength } = this.options;
    const step = spacing * dpr;
    const t = thickness * dpr;
    const cx = nx * W;
    const cy = ny * H;
    const rx = radiusX * W;
    const ry = radiusY * H;
    const k = strength * amount;

    // Straight lines everywhere (a ready-made copy), then only the rows the
    // lens touches are cleared and redrawn bent.
    ctx.clearRect(0, 0, W, H);
    if (this.straight) ctx.drawImage(this.straight, 0, 0);
    if (k < 0.002) return;
    ctx.fillStyle = color;
    ctx.strokeStyle = color;
    ctx.lineWidth = t;

    // Bent lines can move by up to k·ry; clear a band that covers that,
    // aligned to the line grid (line n covers n·step … n·step + t).
    const bandTop = Math.max(0, Math.floor((cy - ry * (1 + k)) / step) * step);
    const bandBottom = Math.min(H, Math.ceil((cy + ry * (1 + k)) / step + 1) * step);
    ctx.clearRect(0, bandTop, W, bandBottom - bandTop);

    const segment = 10 * dpr;
    for (let y = bandTop + t / 2; y < bandBottom; y += step) {
      const dy = (y - cy) / ry;
      if (Math.abs(dy) >= 1) {
        ctx.fillRect(0, y - t / 2, W, t);
        continue;
      }
      // Straight up to the lens, bent inside it, straight after.
      const half = rx * Math.sqrt(1 - dy * dy);
      const x0 = Math.max(0, cx - half);
      const x1 = Math.min(W, cx + half);
      if (x0 > 0) ctx.fillRect(0, y - t / 2, x0, t);
      if (x1 < W) ctx.fillRect(x1, y - t / 2, W - x1, t);
      ctx.beginPath();
      for (let x = x0; x <= x1 + 0.01; x += segment) {
        const xx = Math.min(x, x1);
        const dx = (xx - cx) / rx;
        const e = dx * dx + dy * dy;
        const w = e < 1 ? (1 - e) * (1 - e) : 0;
        const yy = y + (y - cy) * k * w;
        if (xx === x0) ctx.moveTo(xx, yy);
        else ctx.lineTo(xx, yy);
      }
      ctx.stroke();
    }
  }
}
