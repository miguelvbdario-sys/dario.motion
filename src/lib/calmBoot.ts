/** localStorage key of the "turn off animations" choice (src/lib/motion.ts). */
export const CALM_KEY = "site-calm";

/**
 * Inline script for the page: applies a remembered "turn off animations"
 * before the first paint (a plain module, so the server layout can use it).
 */
export const CALM_BOOT = `try{if(localStorage.getItem("${CALM_KEY}")==="1")document.documentElement.setAttribute("data-calm","")}catch(e){}`;
