/** Starting volume for every video that plays with sound (fullscreen player, lightbox). */
export const START_VOLUME = 0.2;

/** Vimeo iframes: ask the player to start at START_VOLUME (Player API over postMessage). */
export function vimeoStartVolume(frame: HTMLIFrameElement) {
  frame.contentWindow?.postMessage(JSON.stringify({ method: "setVolume", value: START_VOLUME }), "https://player.vimeo.com");
}
