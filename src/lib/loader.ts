/**
 * The loading screen (components/loader/Loader.tsx) tells the page when it has
 * lifted, so intros (the hero) play in front of the visitor, not behind it.
 */
const EVENT = "site:loaded";

type LoaderWindow = Window & { __siteLoaded?: boolean };

export function markLoaded() {
  (window as LoaderWindow).__siteLoaded = true;
  // CSS hook for intros that are pure CSS (e.g. the white strip sliding in).
  document.documentElement.dataset.loaded = "";
  window.dispatchEvent(new Event(EVENT));
}

/** Runs `cb` once the loader is gone (right away if it already is). Returns a cleanup. */
export function onLoaded(cb: () => void): () => void {
  if ((window as LoaderWindow).__siteLoaded) {
    cb();
    return () => {};
  }
  const handler = () => cb();
  window.addEventListener(EVENT, handler, { once: true });
  return () => window.removeEventListener(EVENT, handler);
}
