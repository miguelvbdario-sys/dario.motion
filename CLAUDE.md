# Dario Motion portfolio — guide for Claude

@AGENTS.md

Portfolio of Miguel Dario (@dario.motion), senior motion designer. Live at
https://www.dario-motion.com (main page, English by default) and /course
(course page, Portuguese by default).

## Working with Miguel

- Reply in Portuguese (pt-BR), simple language, explain visually when useful.
- **Approve the visual with him before publishing.** Change locally, show a
  screenshot, push only after he says "pode enviar".
- Ask before costly work (long test batteries, re-rendering videos). For simple
  tweaks, just apply and show a screenshot; run performance tests only when asked.
- Most feedback comes as phone screenshots: check phone layout (390×844) first.

## Stack and publishing

- Next.js 16 (App Router, cacheComponents), React 19, GSAP + Lenis (smooth
  scroll), CSS Modules, three.js / react-three-fiber.
- GitHub `miguelvbdario-sys/dario.motion`, branch `main`. Vercel publishes every
  push to `main` in ~1–2 min. Domain on Squarespace (keep the Google Workspace
  MX/TXT records).
- Commands: `npm run dev` (port 3000, `.claude/launch.json` "next-dev"),
  `npx next build`, `npx next start -p 3100` to test the production build.
  `npx tsc --noEmit -p .` for types. Two lint errors are old and known
  (Broadcast.tsx listRef, SlotNumber.tsx).
- Windows PC, often used remotely.

## Where things are

- `src/app/page.tsx` main page order; `src/app/course/page.tsx` course.
- Content/texts: `src/content/*.ts` (broadcast.ts = the 4 Broadcast cards and
  their tabs; works.ts = More Works; course.ts).
- Translations: `src/content/pt.ts` (EN→PT for the main page) and `en.ts`
  (PT→EN for the course), keyed by the source text. `useT()` / `useTr()` in
  `src/lib/i18n.tsx`. New visible text must get an entry in the other language.
- Hero: `src/components/hero/` (head frame sequence via `src/lib/frameSequence.ts`,
  3D emblems, CameraReticle = mouse reticle, VectorOverlay = selection frame).
- Broadcast section: `src/components/broadcast/` (Broadcast.tsx = rows/opening,
  BroadcastPanel.tsx = card content, tabs, phone accordion; Showcase, Recopando,
  MotionBranding, BroadcastScoreboard, Shields, Mascots, Process, Trophy).
- More Works carousel: `src/components/works-carousel/`. Fullscreen player:
  `src/components/works/WorkPlayer.tsx`.
- CRT screen overlay: `src/components/crt/`. Timeline + back-to-top:
  `src/components/timeline/`.
- Media in `public/` (videos `.mp4` + `.jpg` posters; `-sm.mp4` = 1280px copies
  of 1080p loops for inline use, listed in `src/content/videoVariants.ts`).
- ffmpeg is not on PATH; the one used before lives in an old scratchpad
  (`.../scratchpad/conv/node_modules/ffmpeg-static/ffmpeg.exe`); install
  `ffmpeg-static` in a scratch folder if it is gone.

## Performance rules (keep these)

- Loops play only while on screen (`src/lib/useInView.ts`); one carousel video
  at a time (centre or hovered).
- Scroll effects use `onScrollFrame(fn, measure)` in
  `src/components/effects/scrollFx.ts`: layout reads in `measure`, writes in `fn`.
- Head frames are decoded off the main thread (createImageBitmap from blobs);
  never draw `<img>` frames directly.
- Scripted scrolls to a card use `followScroll()` (`src/lib/followScroll.ts`).
- Lite mode (`src/lib/lite.ts`): only devices measured slow (median frame) get
  still 3D objects, no CRT glare/scanlines, one carousel video. `?debug` in the
  URL shows an FPS meter.
- "Turn off animations" switch (`src/lib/motion.ts`, above EN/PT): calm mode =
  reduced-motion path + still head/3D; video loops always play (`loopsPaused`).
  Components use `reducedMotion()`, CSS uses `html[data-calm]`; switching
  remounts the page (CalmRemount). Auto-on under ~10 fps (lite.ts).
- CRT glass is one canvas drawn once (CrtScreen drawCrt). Head frames decode in
  `public/decode-worker.js`. `?debug&off=crt,anim,blend,3d,head,videos,smooth`.
- Safari can't be tested here; Playwright WebKit on Windows is only a rough proxy.
- Headless-Chrome FPS tests drop to 30 fps with any two videos playing — a test
  artifact, not the site.

## Open items

- Share image: `src/app/opengraph-image.png` is live and approved (black, big
  MIGUEL DARIO, red/white, the head). `src/assets/og-hero-proposta.png` is an
  old unused proposal (untracked).
- Miguel's Chrome has hardware acceleration OFF (his "Opera" is Opera GX); told
  him to turn it on. Waiting for his Safari (Mac) `?debug` fps after this deploy.
