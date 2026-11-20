/**
 * Tiny shared store between the 3D emblems and the hero's vector overlay.
 * Each emblem publishes the on-screen box of its model (client pixels) while
 * it is hovered or dragged, and clears it otherwise. The overlay reads it
 * every frame. Plain module state: no re-renders involved.
 */
export type ScreenRect = { left: number; top: number; right: number; bottom: number };

const frames = new Map<string, ScreenRect>();

export const vectorBus = {
  setFrame(id: string, rect: ScreenRect | null) {
    if (rect) frames.set(id, rect);
    else frames.delete(id);
  },
  /** The most recently published frame, if any emblem is active. */
  activeFrame(): ScreenRect | null {
    let last: ScreenRect | null = null;
    for (const rect of frames.values()) last = rect;
    return last;
  },
};
