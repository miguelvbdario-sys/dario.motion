# DESIGN.md — Miguel Dario · Senior Motion Designer

> The visual system for the one-page portfolio of **Miguel Dario (@dario.motion)**. Settle any design question against this file before writing UI code. Reference frames are in `WIREFRAME-TESTE/` (`PRINT-WIREFRAME.png` plus the scroll states `-rolagem_2` and `-rolagem_3`, and `wireframe-teste-01.mp4`).

---

## 1. Aesthetic direction

**Cinematic Dark Mode × Brutalism.** The page should feel like a title sequence that grew into a website:

- **Brutalist scale.** The name is set edge to edge, bleeding past the viewport, with no margins. Type is the architecture.
- **Cinematic light.** A soft radial glow (crimson → orange) floats in a black void, like stage lighting on a subject. Glows are atmospheric and blurred, never flat fills.
- **Analog / pixel glitch.** The hero portrait is a pixelated, scan-lined image sequence (horizontal CRT lines plus chunky pixels with chromatic yellow and magenta edges). Use texture sparingly, and only where it carries meaning.
- **Technical HUD.** Thin, low-opacity grid lines cut across the hero like a viewfinder or comp guide, as if the page were an open After Effects composition.
- **Tactile 3D.** Glossy, dark-chrome low-poly creatures (pig, vulture) float around the name and react to the cursor and to scroll.
- **Handwritten counterpoint.** A loose brush script ("Senior", "Motion Designer") plus a hand-drawn arrow soften the brutal grid with a human mark.

**Avoid:** rounded "SaaS" cards, soft drop-shadow UI, gradients on text, emoji, stock icons used as decoration, and anything that reads as a template.

---

## 2. Color

| Token | Hex | Role |
|---|---|---|
| `--color-void` | `#000000` | Primary background. Every section ends in pure black. |
| `--color-crimson` | `#540022` | Outer stop of the radial glow, the deep atmosphere. |
| `--color-ember` | `#FF7214` | Hot core of the glow, placed off-center to the right behind the subject. |
| `--color-signal` | `#FBCB09` | Accent: nav pills, active states, focus rings, cursor glow, hover highlights. |
| `--color-bone` | `#EFEEEE` | Primary text and the display name. Never pure white. |

**Derived values (use these, don't invent new hues):**
- Grid lines: `--color-bone` at **43% opacity**, 1px, blended **additively** (`mix-blend-mode: plus-lighter`). Measured on the wireframe: each line adds the same amount of light to whatever glow is behind it, so it reads pink over crimson and peach over orange.
- Muted text: `--color-bone` at 60%.
- Signal text on pills: `#140006` (near-black crimson), never pure black.
- Hero glow recipe (bottom layer first):
  ```css
  background:
    radial-gradient(54% 64% at 66% 64%, rgb(255 114 20 / .66) 0%, rgb(255 114 20 / .5) 24%,
      rgb(255 114 20 / .3) 50%, rgb(255 114 20 / .13) 76%, transparent 100%),
    radial-gradient(50% 56% at 42% 2%, rgb(255 114 20 / .28) 0%, rgb(255 114 20 / .12) 60%, transparent 100%),
    #540022;
  ```
  Only the three palette colors are used: the brighter reds come from ember orange at low opacity over crimson. Stops were sampled from `PRINT-WIREFRAME.png` (hot core right of center at about 66% / 64%, a softer wash along the top).
  The glow then dissolves into `#000` through a black gradient that starts at design y 870 and is solid by y 1085. That gradient travels up with the content on scroll, which is how the portfolio grid rises out of darkness.

**Rules:** keep Signal yellow to under 5% of any viewport. The crimson/ember glow is atmosphere only: it never sits behind body copy that needs contrast.

---

## 3. Typography

| Role | Family | Source | Fallback stack | Notes |
|---|---|---|---|---|
| **Display** | Tusker Grotesk **6800 Super** | `/public/fonts/TuskerGrotesk-6800Super.otf` | `"Impact", "Haettenschweiler", "Arial Narrow Bold", sans-serif` | Uppercase only. Tracking `+0.055em` on the hero name (measured on the wireframe), line-height `0.96`. |
| **Script accent** | Wildest Metallo Brush – Persona | `/public/fonts/WildestMetalloBrushDEMO.otf` | `"Brush Script MT", cursive` | Short words only (1–3). Letter-spacing `0.38em` (`0.5em` on the @handle). Never for anything that must be read quickly. |
| **UI / Body** | Inter (Black 900, Bold 700, Regular 400) | Google Fonts via `next/font/google` | `system-ui, sans-serif` | 900 for pills and labels, 700 for headings and buttons, 400 for paragraphs. |

**Type scale (fluid):**

| Token | Size | Use |
|---|---|---|
| `display-xl` | `14.64vw` on desktop (281px at 1920) · `26.4vw` on phones (103px at 390) | Hero name "MIGUEL DARIO". One line, edge to edge, on desktop; two stacked lines on phones. Measured on the wireframe: cap height 267px, 15px of tracking between letters. |
| `display-lg` | `clamp(4rem, 14vw, 16rem)` | Section titles (WORKS, ABOUT) |
| `display-md` | `clamp(2.5rem, 6vw, 6rem)` | Project titles |
| `script` | `clamp(1.25rem, 2vw, 2.25rem)` | Handwritten accents |
| `ui-pill` | `clamp(1rem, 1.6vw, 1.75rem)` | Nav pills, Inter 900 |
| `body` | `1rem–1.125rem` | Paragraphs, Inter 400, max 62ch |
| `micro` | `0.75rem` | HUD labels, timecodes, Inter 700 uppercase, `0.12em` tracking |

> ⚠️ The Wildest Metallo file in `FONTES/` is a **DEMO** build. Check its license (or buy the full version) before the site goes live.

---

## 4. Layout & grid

- **Design pixels:** the hero is built in the wireframe's own pixels and scaled as one piece through a CSS unit `--u` (`100vw / 1920` on desktop, `min(100vw / 390, 100lvh / 720)` on phones and portrait tablets). A position written as "design x 163" means `calc(var(--u) * 163)`.
- **HUD grid (hero):** 4 vertical guides at **15.89%, 38.52%, 61.12%, 83.75%** of the viewport width and 3 horizontal guides at **18.19%, 51.81%, 85.42%** of the hero height (measured on the wireframe). The grid is fixed to the viewport: it does not travel with the content on scroll. The whole grid (lines and marks) sits at 70% opacity on desktop and 40% on phones. Lines are decorative (`pointer-events: none`) and draw in on load (scaleX/scaleY 0 → 1).
- **Grid markers:** a small "+" (11px, bone 85%) where every vertical and horizontal line cross. They fade in after the lines draw. (No ruler numbers.)
- **Background layers (back to front):** all based on **#E60000**, darkened towards black (the head keeps its original colours). A **dark room**: the base is almost black (#E60000 mixed 9% with black) with a small red point at the top (58%); the **breathing core** is a point of #E60000 light at **34% / 64%, left of centre**, inside a small wine halo that fades to black (swelling in strength and drifting slightly, 11s ease-in-out loop). **Flashlight** (`.bgFollow`): the lit room (brand crimson with the old ember glows) is laid over the dark one and only shows inside a soft round beam that follows the mouse (24vmax radius, with a faint warm centre), so the cursor reveals the background as it moves; it follows closely (`GLOW_FOLLOW` 7 in `VectorOverlay.tsx`) and fades out when the mouse leaves; desktop only; **CRT scanlines** (1px of 16% black every 4px, background only), drawn on a canvas (`src/lib/scanlineField.ts`) so that under the mouse light they bend apart like under a magnifying lens, inside an ellipse shaped like the light (lines up to ~1.5× further apart at its centre). Over the whole hero, a **moving film grain** (SVG noise, overlay blend at 9%, jumping 8 positions every 0.8s). Reduced motion stops the breathing and the grain.
- **Content grid:** 12 columns, `gutter: clamp(16px, 2vw, 32px)`, side padding `clamp(16px, 4vw, 64px)`. The display name ignores the padding and bleeds.
- **Z-layering in the hero (back to front):**
  1. Black void plus radial glow
  2. HUD grid lines
  3. Display name "MIGUEL DARIO"
  4. Pixel portrait image sequence (it **covers the middle of the name**: "MIGU[EL] DARIO")
  5. 3D creatures (pig over "MIGUEL" top-left, vulture right under "Motion Designer")
  6. UI layer: script labels, nav pills, and the hand-drawn arrow sequence (canvas)
- **Spacing scale:** 4 · 8 · 12 · 16 · 24 · 32 · 48 · 64 · 96 · 128 · 192 px.

---

## 5. Sections (one page)

### 00 · OLD CURVED TV (whole site, `src/components/crt/CrtScreen.tsx`)
- The whole site is seen through a curved CRT tube: the picture bends towards the edges (barrel distortion) through an SVG displacement filter on the backdrop. One fixed full-screen layer (`BULGE` 0.035), normalised so even the corners sample inside the screen, never past the edge (sampling outside mirrored the page into a "reflection" at the borders); the map is built at the window size and rebuilt on resize; the edges then fade to black. (An edge-strips-only version was tried for performance and dropped: it looked wrong.) Maps are rebuilt at the window size on resize. Anything 3D that can be hidden (the BROADCAST flip card) must use `visibility: hidden`, not only opacity 0: Chrome's backdrop filter otherwise redraws it. Chromium-based browsers render the bend (`backdrop-filter: url()`); others skip it.
- On top, the glass: rounded black corners (radius `clamp(14px, 2.6vmin, 34px)`), an inner vignette and faint scanlines (1px of 10% black every 3px). Styles in `CrtScreen.module.css`.
### 01 · HERO (`#hero`)
- Top center: `@dario.motion` in Inter Black (900), small (16 design px on desktop, 9 on phones). Not selectable: no text highlight and no vector selection box.
- Full-bleed display name **MIGUEL DARIO** on a **single horizontal line** spanning the whole viewport width on desktop, at about 20–45% of the viewport height (cap height ≈ 25% of a 1080px viewport).
  - Build it as `<h1>` with two spans in a `flex justify-between` row: **"MIGUEL" pinned to the left edge, "DARIO" pinned to the right edge**. Font size is fluid (`14.64vw`, tracking `0.055em`), so the composition scales identically at every desktop width.
  - As in the wireframe, the name **bleeds**: the M starts about 37 design px outside the left edge and the O just touches the right edge. Cap top sits at design y 213, baseline at y 480.
  - The **center canvas (pixel head) overlaps the middle gap**, covering the "EL" of MIGUEL and the space before DARIO, exactly as in `PRINT-WIREFRAME.png` ("MIGU[head]DARIO").
  - No wrapping on desktop (`white-space: nowrap`). On phones the words stack: MIGUEL fills the width on line 1, DARIO hangs from the right edge on line 2, and the head overlaps the bottom of DARIO.
- "Senior" under the left side of the name and "Motion Designer" under the right, both in script.
- Left: a vertical stack of yellow pills (**Projects**, **Standalones**, **About me**, **Course**), anchored by a hand-drawn arrow.
- **Arrow image sequence** (`/public/sequence/arrow/SETA_002–085.webp`, 84 frames, 259×275, transparent, lossless, about 72 KB total):
  - Drawn to its own small `<canvas>` and **scrubbed by scroll on the same ScrollTrigger timeline as the head**, so frame N of the arrow always plays together with frame N of the head. Both sequences share the 002–085 frame range.
  - Placement: the stroke sits **just left of the pill stack** and spans its height, like the arrow in the wireframe. The pills start at design x 163, y 613.
  - Inside the 259×275 frame the stroke drifts sideways as it plays: centered at first (x ≈ 127–136), far left mid-sequence (x ≈ 88–107) and far right at the end (x ≈ 162–178). The canvas is placed at design **x −22, y 515, width 259** (1:1 at 1920), so the stroke stays between the screen edge and the pills for the whole sequence and never covers them.
  - The pill group and the arrow travel up together during the hero scroll (see `PRINT-WIREFRAME-rolagem_2/3`).
  - Decorative: `aria-hidden="true"`. With reduced motion, the first frame shows statically.
- Center: the pixel head **image sequence**: one continuous "look" render (`/public/sequence/hero-look/LOOK_000–098.webp`, 99 frames; phones load the 720px copy in `/sequence/hero-look-720/`), drawn to one `<canvas>`. Frame **49 is the rest pose**; lower frames turn the head to look right, higher frames play the left animation (`LOOK` in `Hero.tsx`).
  - The canvas is a **100vw square** placed at design x 0, **y −197**. At the top of the page only the head and shoulders are on screen; the full body comes into view as the composition travels up.
  - **Desktop (mouse):** three zones. Left of the character plays the left animation all the way, right of it the look-right, over it (or away) the head goes back to the pose set by the scroll. Own frame rate forward (`PLAY_FPS` 30), `RETURN_SPEED`× back; switching sides passes through rest. Scrolling turns the head from rest to the right end, but the mouse zones always win.
  - **Touch:** scrolling turns the head rest → right end; a sideways drag on the character (box hit test, `REST_ZONE`) scrubs both ways (`DRAG_DISTANCE`), and on release it plays back to the scroll pose. Vertical swipes still scroll the page. The mode follows the pointer in use, not the screen size.
- **3D emblems** (React Three Fiber): `/public/3d/emblem-left.gltf` (pig, over the "MI") and `/public/3d/emblem-right.gltf` (vulture, under "Motion Designer"). If a file is missing, a faceted chrome fallback mesh shows instead.
  - Material: brushed dark chrome (`#5c5c63`, metalness 0.78, roughness 0.4), lit by a small studio of light panels, so no HDR file downloads.
  - Each emblem **always spins on its own Y axis**. The visitor can **click and drag to turn it** (OrbitControls, no zoom, no pan, damping for inertia). The vertical tilt stops 36° short of the poles, because a flat emblem seen from straight above is only a thin edge.
  - On touch screens a sideways drag spins the emblem and a vertical swipe still scrolls the page (`touch-action: pan-y`).
  - Rendering pauses while the emblem is off screen.
- **Vector selection effect** (mouse and trackpad only; `VectorOverlay.tsx`): a single box (1px bone line at 55%) frames whatever the cursor is over, labelled with its top-left position as a percentage of the screen ("26, 57", 10px monospace). It glides from one target to the next and fades in and out. Targets, in priority order:
  - **3D emblem** (hovered or dragged): the model's exact outline on screen as it turns (its vertices are projected every frame).
  - **Whole elements** tagged `data-vector`: each pill ("Works", "Course", "Experimental"), "Senior" and "Motion Designer" (one element). The box frames the element with 6px of air.
  - **The name:** the single letter under the cursor, tight to its ink (measured from the font's glyph metrics), with 6px of air. The source text is "Miguel Dario" shown in capitals by CSS, so the capitals are measured (not the lowercase source letters).
  - **The character:** the solid body of the current frame (pixels above 170/255 opacity, so the soft glow is ignored), then trimmed by 6% on each side.
  - On the name, **only the selected letter** turns **deep orange (#AE3623)**, fading in and out over 0.5s. Each letter of the name is its own `<span class="letter">`; the overlay sets `data-active` on the selected one.
- **Scroll behaviour** (GSAP ScrollTrigger, `pin: true`, `scrub: true`): desktop pins for exactly the 430 design px the composition travels (`PIN_SHIFT`), phones for 60% of the screen (`pinDistance()` in `Hero.tsx`).
  - One playhead drives the arrow and the scroll part of the head.
  - The whole composition (name, labels, pills, arrow, emblems and the head canvas) travels up by **430 design px**. The glow and the HUD grid stay fixed; the black gradient travels up with the content and swallows them from below.
  - When the pin releases, the hero scrolls away in its final pose and the Broadcast list rises from the black.
- **Intro:** plays once the loading screen has lifted (`onLoaded` in `src/lib/loader.ts`): grid lines draw in, the two words of the name rise, the portrait fades in, then the labels, pills, arrow and emblems follow.
- **Phones and portrait tablets** (`max-width: 767px` or aspect ratio ≤ 3:4): name stacked at the top, figure enlarged to 256% of the width so the bust fills the screen, "Senior" left and "Motion / Designer" right of the head, the pig in the empty corner left of DARIO and under MIGUEL, the vulture beside the face, and the pills with their arrow over the figure's left shoulder.
- **Reduced motion:** no pin, no scrub and no emblem spin. The first frames show statically and the emblems can still be dragged.

### 02 · BROADCAST (`#broadcast`)
A zig-zag list of the four broadcast projects; each opens into a red "Art Direction" style card. Code: `src/components/broadcast/` (`Broadcast.tsx` list, hover and flip card · `BroadcastPanel.tsx` open card · `BroadcastScoreboard.tsx` the interactive scoreboard · `Broadcast.module.css`). Content: `src/content/broadcast.ts`. All animation with GSAP (`CustomEase` for the cubic-béziers).
- **Position:** right after the hero, pulled up 200 design px (`--pull` in the CSS) so the first row sits right under the character's feet at the end of the hero pin.
- **Placeholders:** everything still missing is shown in [brackets] ("[Client]", "[Your role]", "[Year]", "[Project description]", "[Category]" with "[00]", "[Venue · Scope]"); missing media are a striped block with "[ PREVIEW 16:9 ]". All of them live in `src/content/broadcast.ts`, each marked `// TODO: substituir`. "Watch full" stays disabled until a `fullVideo` is set.
- **Projects (in order):** PAULISTÃO BROADCAST ("Scoreboard · Goal · Shields", left) · 2026 WORLD CUP ("CazéTV Live", right, meta before the title) · 2024 OLYMPICS PARIS ("CazéTV Live", left with a 250 design px indent, meta before the title) · LED DISPLAYS BROADCASTS ("[Venue · Scope]", left).
- **Resting layout** (desktop; sizes at the 1440 reference, scaled by `--s = 100vw / 1440`, clamped 0.8–1.25px; the indent uses `--u = 100vw / 1920`): black background, no section title, no HUD strip, no index numbers; 64px sides. A vertical list, 6px gap. Each row is a button (`aria-expanded`), `#121212`, 88px tall, 36px horizontal padding, as wide as its content; zig-zag through `align-self` (flex-start / flex-end) plus `margin-left`. Title in Tusker 64px uppercase, tracking 0.035em, `#EFEEEE`; meta in Inter 700 11px uppercase, tracking 0.12em, 60% opacity; 28px between them (`row-reverse` on meta-first rows).
- **Hover** (mouse only): two `#E60000` bars grow from height 0 to `calc(50% + 1px)`, one from the top and one from the bottom (the +1px leaves no hairline where they meet), 0.55s, cubic-bezier(0.65, 0, 0.35, 1). Text mask: each bar clips a **black copy** of the row (title `#000`, meta at 75%), 88px tall, pinned to the bar's top / bottom, so the text turns from white to black exactly where the red passes. The copies are `aria-hidden`.
- **Floating preview card** (mouse only): 320×180, click-through, positioned in the list, 200px right of the cursor and centred on it vertically (kept inside the list's right edge), following with a lag (`gsap.quickTo` x/y, 0.45s, power3.out). Outer wrapper: perspective 900px + a tilt drawn between −5° and +5° on every entry or row change (0.6s, in-out). Inner flipper (`preserve-3d`) with two faces (`backface-visibility: hidden`, face B at `rotateX(180deg)`), each with a muted looping `<video>` or the striped placeholder.
  - Angle = `flips × 180` when visible, `flips × 180 − 90` when hidden (in profile); 0.6s, cubic-bezier(0.65, 0, 0.35, 1); always turning the same way. Entry: the card waits in profile; the new item goes on the face of the current parity and turns to the front. Row change while visible: `flips++`, the new item goes on the hidden face, turn to the front. Exit: `flips++`, turn to profile, then fade out after 0.45s.
  - **Anti-bug lock:** while a flip runs (620ms) no media swap and no other flip; only the current target is remembered (row under the mouse, or none). When the flip ends, if the target differs from what shows, the next transition goes straight to it, skipping rows in between. The visible face's source is never swapped.
  - The card never shows over the open row. Its video only plays while it is on the front face.
- **Click / open:** a click opens the row; a second click closes it; one open at a time; Esc closes too. The open row keeps its bars full (red with black text) in its zig-zag position, like a tab. Its card opens right under it at the list's full width: height 0 → auto in 0.85s, cubic-bezier(0.76, 0, 0.24, 1); the content fades in (delay 0.2s) and slides from −24px.
- **Card interior:** `#E60000` with scanlines (`repeating-linear-gradient(0deg, rgba(0,0,0,.07) 0 1px, transparent 1px 4px)`), padding 28px 40px 40px, 4 guide columns with a 1px `rgba(0,0,0,.14)` left border. A row of mono labels (JetBrains Mono 13px, `#140000`), one per column: "[ Broadcast ]", meta, "Live", year. An 11px black dot. Title in Inter 900, 104px, line-height 0.9, tracking −0.055em, uppercase, `#140000`. Description Inter 400 22px, max 34ch, `#2a0000`. **Filter bar:** `rgba(20,0,0,.86)`, radius 5px, padding 5px; each pill has a 6px square, the label in Inter 500 16px at 72% and a mono count "[05]"; the active one has a `rgba(239,238,238,.09)` fill, `#EFEEEE` text and the square and count in `#E60000`. Then a 2-column grid (8px gap): the 16:9 preview loop (radius 5px, "PREVIEW · LOOP" label) and a `#111` panel (radius 5px) with "[ Index ]", CLIENT / ROLE / YEAR rows on hairlines and the "Watch full" pill (`#E60000`, black Inter 900), which opens the same fullscreen player as the works.
- **2024 OLYMPICS PARIS card** (content from behance.net/gallery/218814327): four videos of **equal weight** replace the filters as a selector (Athlete Screens, Template Paris, Medal Screens, Ceremonies, counts "[01]–[04]"); the chosen one plays muted and looping in the preview (Vimeo embed, only while the card is open) and "Watch full · <title>" opens it with sound in the same fullscreen player (which embeds Vimeo when a work has a `vimeo` id). Index adds a TEAM row. Then an **On air · 24h live stream** strip: three 6s loops cut from Miguel's phone recordings of the CazéTV broadcast (picture cropped out of the phone UI, 960×540, no sound), and a low-key **Programs** row: two small tiles (Tamo em Paris, Partiu Paris) that open their vignette with sound. The floating hover preview uses a fourth, different recording (no clip repeats). Media in `/public/broadcast/olympics/`. Fields: `videos`, `onAir`, `extras`, `team` in `src/content/broadcast.ts`.
- **Tabs** (`sections` in `src/content/broadcast.ts`): every card opens on **About the project** (lead, point cards with loops, stats, channels; the Index lives only here, `noIndex` hides it). PAULISTÃO: About · Scoreboard · Shields · Broadcast Screens · Mascots · Process · Live. Its desktop About runs full width: lead in two paragraphs (a line break in the lead), the 2×2 loop cards centred, stats + channels in one row, then the outro with **[ Discover the scoreboard ]**. The About blocks cascade in (45ms apart).
- **Phones:** every card is an accordion; the Paulistão scoreboard always shows (not a tab), home and away side by side with team dropdowns. **Broadcast Screens** is a swipe carousel (`ScreenSwipe` in `BroadcastPanel.tsx`): the screen follows the finger with a 16px gap to the next one, glides on release (20% of the width or a flick), the title sits right under it, then the arrows. Rows show a small loop of the card on the right (phones only; not rendered on desktop).
- **Opening a card:** besides the unfold, a 280ms signal glitch (clip slices) plays as the content arrives; closing runs at 55% of the opening time.
- **SHIELDS tab** (`BroadcastShields.tsx`): the same crest grid as the scoreboard on the left; a click plays that crest's animation right away, once, holding the last frame, in a black **square** stage on the right (up to 520px). The source videos have different widths (838 to 2922 px, crest centred), so all are cropped to a centred 838×838 square and encoded at 720×720, no sound: `/public/scoreboard/crests/animated/<slug>.mp4`.
- **The scoreboard inside PAULISTÃO BROADCAST:** the interactive scoreboard (engine `src/lib/scoreboardEngine.ts`, data `src/content/scoreboard.ts`) replaces the preview, full width under the filters, with the Index panel below it. All its logic is unchanged (see "Scoreboard engine" below). Look: mono readouts on the red (status with dot, timecode, base frame, comp size); the canvas in a dark `#111` frame, radius 5px; "Go live" is a black pill with `#E60000` text (hover `#140000`); layout in three columns (1 : 2 : 1): **Home** on the left (a 4×2 grid of the 7 crests from `/public/scoreboard/crests/<slug>.webp`, small dark tiles; the selected team has a bone outline and a red underline; hovering a crest turns its tile bone white and lifts it 2px; then "Goal home [00]" with the live score), the **board at half the card's width** in the centre with the Program bar under it (In · Out · Shield mode, the active one lit; the Shield square blinks while it moves), and **Away** mirrored on the right. The scoreboard controls are bigger, outlined pills (1px bone at 30%, white on hover) so they clearly read as buttons. Phones: board first, then the controls and two 7-across crest rows. Frames start loading only the first time the card opens; goal animations only once it goes live.
- **Phones / touch** (no hover): rows full width, padding 24px 14px 12px, Tusker 40px with the meta under the title; no floating card. A tap turns the row red with black text and opens the card under it, stacked: labels (2 columns), 52px title, description, filters scrolling sideways, preview 16:9 (or the scoreboard), then the Index panel with a full-width button. The scoreboard controls stack at full width.
- **Reduced motion:** no flip, no tilt and no bar growth: the bars and the card just fade, the card opens without the height animation.
- **Performance:** previews load only once the section is near the screen; the floating card's video plays only while visible; full videos load only when the player opens; scoreboard frames only when the Paulistão card opens.

#### Scoreboard engine (used inside PAULISTÃO BROADCAST)
- **Frames:** `/public/scoreboard/` (`base/`, `home/<team>/`, `away/<team>/`, `goal/<team>/`, `shield/<side>/<team>/`, frames `000.webp…`), copied untouched from `NOVAS SEQUENCIAS WEBP OTIMIZADO`. Every frame is the full **1332×1080** comp with transparency; the canvas shows only the band `SCOREBOARD_CROP` (y 250–750).
- **Layers (bottom to top):** home and away plates (47 frames, AE 055–101; some teams held back by `plateDelay` to match the base) → base (120 frames, AE 000–119) with the score and clock as live text, masked by the base → goal (365–384 frames). **30 fps**.
- **Sync by frame number:** a plate shows frame `base frame − 55` (clamped), so it always matches the base, on IN, OUT and when swapped. OUT is the IN reversed.
- **Score and clock** (Kuunari Bold): fade and slide in between base frames 79 and 119 (home from the left, away from the right, clock from above), from **0 × 0** and **00:00**. The clock runs from the end of the IN until OUT. Each goal adds 1 at goal frame 90. Everything resets off air. Settings: `SCORE_LAYOUT`.
- **Goals:** only once the IN has fully finished, one at a time; renders from a 1460-wide comp are centred on the 1332 comp.
- **Shield mode:** replaces the plates (43 frames, AE 179–221); off = reversed; enabled only after the IN and with no goal playing. Goal with the shield on reverses the shield first; OUT with the shield on reverses the shield, then the normal out.

### 03 · WORKS (`#works-carousel`)
- **Position:** right after BROADCAST. (The old works grid was removed; its fullscreen player, `src/components/works/WorkPlayer.tsx` with `WorkPlayer.module.css`, stays and is shared with BROADCAST.)
The side-scrolling wall of work cards. Code: `src/components/works-carousel/`. Original build (no third-party code), inspired by the "concave gallery wall" idea.
- **Shape:** a wall of 16:9 video panels that curves *toward* the viewer at the edges, like standing inside a drum. Each panel faces the centre of the curve, and a short perspective enlarges the near edges for a fisheye feel. Settings at the top of `WorksCarousel.tsx`: radius 2.6× and viewer distance 2.4× the centre panel's width, 4% gap, panels hidden beyond ±1.3 rad, sides fading out by up to 75%.
- **Size:** centre panel `clamp(200px, 22vw, 520px)` wide on desktop (6–7 panels visible), 64vw on phones.
- **Motion:** turns slowly and endlessly at 0.1 panel per second. The 3 pieces repeat to 12 panels, so the loop never shows a seam.
- **Panels:** rounded corners (`clamp(8px, 0.75vw, 14px)`), which crop a sliver of each video.
- **Reflection:** a faint mirror image under each panel (`-webkit-box-reflect`), strongest (22%) at the panel's edge and fading to 0% going down. Works in Chromium and Safari; Firefox shows no reflection.
- **Stacking:** panels are drawn in 3D but stacked by z-index (the ring has the perspective and stays flat, without `preserve-3d`). Normally the panel nearest the centre is on top. A hovered panel always jumps in front of every other panel. A panel still shrinking after the mouse left sits just under it, with the most recently left on top, so moving straight to a neighbour never leaves the new one behind.
- **Hover** (mouse): the panel grows to **1.5×** with a fast-start curve (cubic-bezier(0.1, 0.9, 0.15, 1), 1.5s), so most of the growth happens right away; its 70% black overlay fades to 0 over 1.5s. The caption slides down by the extra height the zoom adds. The whole wall brakes smoothly to a stop and starts drifting again when the pointer leaves.
- **Click:** opens the fullscreen player (black `<dialog>`, title, round close button, full video with sound; Esc, the button or the backdrop close it). Beside the video, a 280px **Index** panel (dark #111, mono labels, CLIENT / DETAILS / YEAR on hairlines, no button; DETAILS reads the `role` field); it goes under the video below 900px. Works take their Index from `client` / `role` / `year` in `works.ts` (placeholders via `INDEX_TODO` until filled); videos opened from BROADCAST show their project's Index. **Open / close animate** (GSAP, `WorkPlayer.tsx`): the player grows out of the thumbnail that was clicked (transform-origin on it, scale 0.35 → 1, 0.55s `expo.out`) and shrinks back into it on close in 0.22s ease-in (closing is about a third of opening). Esc goes through the same close. Phones: the close button sits in its own row above the video. Reduced motion: fades only.
- **Title:** a lower third ("STANDALONES · MORE PROJECTS", `LowerThird`), centred, pulled down into the wall's top room.
- **Pieces:** 8 in `src/content/works.ts` (Se Tem Copa, Esquece! was removed here; its loop is now the 2026 WORLD CUP cover in BROADCAST) (Flamengo, Palmeiras, Vini Jr — Hala Madrid, Vinheta Brasileirão, Clash of Titans, Copazona, Intro Motion Pro, Personal Experimentations), converted from `THUMBNAILS VIDEOS PORTFOLIO/`: preview = muted loop up to 10s at 960px on the long side; poster webp; full video 1080p H.264 ~4 Mb/s with AAC sound and fast start.
- **Vertical (9:16) pieces** (`vertical: true`, today Vini Jr and Personal Experimentations): the card still fills its 16:9 frame (`object-fit: cover`, centre crop); the player opens them in a 9:16 frame as tall as the screen allows, with the header at the same width.
- **Caption:** an Inter caption just below each panel: the title in Inter 900, `clamp(1.25rem, 1.75vw, 2.25rem)`, bone; the subtitle (`meta`) in Inter 400, `clamp(0.95rem, 1.05vw, 1.35rem)`, at 55%. It belongs to its panel, so it moves and turns with it. While a panel is hovered, only that panel's caption shows, wherever the panel is. Otherwise the centre panel's caption shows and fades out as it turns away (fully gone at 0.42 panel from the centre). Opacity changes fade over 0.45s.
- **Arrows:** below the wall, two 38px circles with a thin white outline and a thin white chevron, and an `01 / 03` counter between them. On hover the circle fills with grey (`#4a4a4a`). Each click turns the wall one panel.
- **Drag:** horizontal drag or swipe turns the wall, and a flick carries on with momentum. Vertical swipes still scroll the page.
- **Auto-focus** (all screens): while the wall drifts, the centre panel's 70% overlay fades to 0 and the panel grows **7%**, in step with its title. Both use the same ease-in-out curve as the title (smoothstep over the last 0.42 panel before the centre), so there is no peak in the middle. While any panel is hovered, the auto-focus eases off and only the hover effect shows.
- **Phones:** only the centre panel's video plays. On desktop, the panels near the centre play.
- **Reduced motion:** no drift; arrows and drag still work.

### 04 · ABOUT (`#about`)
Code: `src/components/about/` (`About.tsx`, `About.module.css`); text, photo and links in `src/content/about.ts`. No visible section title.
- **Sheet:** site red `#E60000` with the BROADCAST scanlines (`rgba(0,0,0,.07)` 1px every 4px) and 4 guide columns (1px `rgba(0,0,0,.14)`). Sizes at the 1440 reference (`--s`).
- **Layout (desktop):** three columns (0.8 : 240px : 1.8, 56px gaps): a mono label "[ 01 ] PROFILE" (13px), the **portrait** and the text.
- **Portrait:** `/public/about/miguel-portrait.webp`, cropped from the full-size photo (head to chest, 1080×1000), shown at **240px** wide, radius 5px.
- **Name behind the photo:** "MIGUEL / DARIO" in **Wildest**, all caps, two stacked lines, **huge (380px)**, **tilted −20°**, filling the left half of the section behind the photo. Solid black, faded from 90% on the left to 0% on the right with a **mask** (not gradient text), so it fades out before the text column. Nudge with `--script-x` / `--script-size` in the CSS.
- **Text:** lead paragraph in **Inter Black** (900, 32px, line-height 1.12), then two paragraphs in **Inter Regular** (20px, `#2a0000`), max 44ch.
- **Buttons:** "Book a call", "Access Instagram" (`instagram.com/dario.motion`, new tab) and "Course page": dark rectangles `#140000` (radius 4px), a small red dot, Inter 500 18px in sentence case; hover bone white with dark text. "Course page" opens `/course` (same tab); "Book a call" still points to `#` until its link is set.
- **Phones:** one column: label, the square photo centred (48vw, max 200px) with the name (120px) around it, then the text and buttons.

> **Nav pills are links.** "Projects" → `#broadcast`, "Standalones" → `#works-carousel`, "About me" → `#about` (smooth scroll through Lenis, 1.6s, passing the hero pin); "Course" uses the same URL as the "Course page" button in `src/content/about.ts` (`/course`, same tab; only `http` links open a new tab). They are `<a>`s inside `<nav aria-label="Sections">`, with a bone focus ring, the hover state and the vector selection box.

### COURSE · MOTION PRO (`/course`, its own page)
Code: `src/app/course/page.tsx` (metadata) → `src/components/course/` (`Course.tsx`, `Course.module.css`). **All text, links and media paths in `src/content/course.ts`** (taken from motion-pros.com/vip, in Portuguese, "8 anos"). Media in `/public/course/` (converted from `D:\_CURSO MOTION`).
- **Palette (course colours only, tokens on `.page` in the CSS):** background `#0d001d` with violet radial glows, cards `#160030`, accent violet `#C750FF`, neon `#DD00FF` (glows), rare orange `#FF4D00` (bonus, "com projeto prático"), white text. Fonts and language are the portfolio's: Tusker titles in caps, mono `[ labels ]`, 4 HUD guide lines, scanlines over media, the CRT overlay.
- **Order:** top bar (back to `/`, logo, "Garantir vaga") → hero (title full width, "Profissional!" in violet; text + CTA on the left, muted ad loop on the right, which opens the WorkPlayer with sound) → facts strip (6) → 3 module cards, lessons numbered 01–15 → 4 offer cards → projects loop + list → **violet pitch sheet** (title, text, price, payment line, CTA; **no countdown**) → 3 testimonials (initials) → lesson clips (poster, opens the player) → mentor (portrait in violet luminosity) → FAQ accordion (GSAP height, first one open) → "Ainda com dúvidas?" with WhatsApp + checkout, and the link back to the portfolio.
- **Links:** every buy button goes to the Hotmart checkout (`COURSE.checkout`, new tab); WhatsApp to `COURSE.whatsapp`.
- **Buttons:** violet solid or dark outline with a dot; hover turns bone white with dark text (site rule).
- **Motion:** hero title words rise on load; blocks marked `data-rise` rise and fade in once on scroll (ScrollTrigger.batch, `expo.out`). Off with reduced motion. Loops play only while on screen.
- **Phones:** everything in one column, hero title at 13vw (fits "PROFISSIONAL!"), facts 2×3, logo hidden in the top bar.
- **Pending:** `pitch.price` is `[Preço]` until the Hotmart checkout values arrive.

---

## 6. Components

**Pill (nav / tag)**
- `background: var(--color-signal); color: #140006; font: 900 var(--ui-pill) Inter;`
- `border-radius: 999px; padding: 0.15em 0.6em; line-height: 1.1;`
- Hover (mouse): the fill turns **#880E40** and the text **bone (#EFEEEE)**, over 0.3s. No active state yet.

**HUD line:** `1px` solid `rgb(239 238 238 / 0.25)`, absolutely positioned, never interactive.

**Script label:** Wildest Metallo, `--color-bone`, wide tracking, optional slight rotation (−2° to 2°).

**Video tile:** `aspect-ratio: 16/9` (or 9/16 for vertical pieces), `object-fit: cover`, black background while loading.

**Cursor (mouse and trackpad only):** ported from Codrops "Custom Cursor Effects", Demo 1 (Stefan Kaltenegger), in `src/components/cursor/`. It replaces the system cursor and is off on touch screens.
- A 6px bone dot follows the mouse (GSAP `quickTo`, 0.12s).
- Over an element tagged `data-cursor="view"` (video tiles), it grows into a 40px ring with a thin "+" inside (`back.inOut(1.7)`, 0.3s).
- Over a 3D emblem's model (not the empty corners of its canvas) and while dragging it, it becomes the translucent disc, as a hint that the object is interactive. The emblem sets `data-cursor="link"` on its canvas while hovered, and the cursor re-checks its state on every move.
- Over the player backdrop (`data-cursor="close"`), the "+" turns into "–" and the ring inverts what is behind it (`mix-blend-mode: exclusion`).
- Over any other link or button, it becomes a 40px translucent bone disc (30% opacity).
- Each click gives it a small bump (scale 0.7 → 1).
- It is a `popover`, so it can sit above the modal player in the browser's top layer.
- Credit: the Codrops license asks for no redistribution of the resource as-is; using it inside the site is allowed.

---

## 7. Motion principles

- **Stack:** GSAP + ScrollTrigger for timelines and pins, Lenis for smooth scroll (synced to the GSAP ticker), and React Three Fiber for 3D.
- **Easing:** `power3.out` / `expo.out` for reveals, `none` for scroll-scrubbed sequences. Avoid bouncy and elastic easing except on 3D idle motion.
- **Durations:** micro 0.2–0.3s · UI 0.5–0.8s · hero intro 1.2–1.8s.
- **Intro:** grid lines draw in, then the name slides up per letter with a mask, then the portrait fades in with a brief glitch/pixel-resolve, then the pills and script labels follow.
- **Glitch:** at most 1–2 short bursts (≤ 300ms) per interaction. Never loop it constantly.
- **Reduced motion:** with `prefers-reduced-motion: reduce`, disable Lenis smoothing, scrubbing and 3D idle motion. Show a static portrait frame and plain fades.

---

## 8. Assets & performance

| Asset | Path | Budget |
|---|---|---|
| Hero sequence (desktop) | `/public/sequence/hero-look/LOOK_###.webp` | 99 frames. Frame 049 (rest) is preloaded. |
| Hero sequence (phones) | `/public/sequence/hero-look-720/LOOK_###.webp` | 99 frames at 720px. The loading screen warms a few of them. |
| Arrow sequence | `/public/sequence/arrow/SETA_###.webp` | 84 frames (002–085) · ~72 KB total, lossless. Preload all of it. |
| 3D models | `/public/3d/emblem-left.glb` (pig), `/public/3d/emblem-right.glb` (vulture) | 284 KB and 208 KB (`KHR_mesh_quantization`, read by three.js without a decoder). The original `.gltf` files stay as sources. |
| Project previews | `/public/projects/<id>-preview.mp4` + `<id>-poster.webp` | H.264, 960px wide, no audio, CRF 27, keyframe every 2s, faststart; at most 10s long. Today 0.55–1.4 MB each. The poster is the preview's first frame (WebP, quality 78). |
| Project full videos | `/public/projects/<id>.mp4` | H.264 1080p, CRF 23 (CRF 26 for busy pieces), AAC 128k when there is sound, faststart. Loaded only when the player opens. Today 3.2–12 MB. |
| Fonts | `/public/fonts/*.woff2` | Tusker, Wildest and Kuunari served as woff2 (the `.otf` files stay for the share image). `font-display: swap`. |

- Target Lighthouse performance ≥ 85 on desktop. LCP is the display name (text), so keep it free of render-blocking assets.
- The canvas and WebGL pause when offscreen (IntersectionObserver / `frameloop="demand"`).

---

## 9. Site-wide layers

- **Loading screen** (`src/components/loader/`): on black, the character's face small (64px, a few look frames on a loop), "Miguel Dario" and "motion designer" with a "..." that fills one dot at a time. No counter. Lifts after window load + fonts, at least 0.9s and at most 6s, fades out in 0.35s, then the hero intro plays.
- **Timeline** (`src/components/timeline/`): scroll progress as an After Effects timeline, fixed at the bottom once the visitor scrolls: yellow timecode (30 fps, one frame per 12px), a track with a diamond keyframe per section (click to jump; the name shows on hover) and the red playhead. Ends with the **sound toggle**. Phones: slimmer, no names, and a round **back to top** button above it after the hero.
- **Lower thirds** (`src/components/lowerthird/`): section titles as TV lower thirds (red tag, bone title, dark mono sub), wiped in left to right the first time they show. Broadcast: "● ON AIR · BROADCAST · 04 PROJECTS" with a blinking dot.
- **Effects** (`src/components/effects/Effects.tsx`, mouse only, off with reduced motion): `[data-magnetic]` elements (hero pills, About buttons) lean toward the cursor; mono labels decode from random glyphs on hover. Works carousel cards tilt toward the cursor (up to 8°, CSS `rotate`).
- **Press feedback:** every button and link dips to 96% while pressed (`globals.css`, the separate `scale` property). Small touch targets get invisible hit areas (pills, carousel arrows).
- **Cursor:** over playable videos (`data-cursor="view"`) a "PLAY" label shows beside the ring.
- **Sounds** (`src/lib/sound.ts`): synthesised with Web Audio, **off by default**, remembered per device: a tick on presses, a rising blip when a card or the player opens, two beeps on a goal.
- **Page changes:** portfolio ↔ /course use a cross-document view transition (old page out 0.22s ease-in, new in 0.45s ease-out).
- **Share and search:** `opengraph-image.tsx` (name in Tusker + pixel head), `icon.png` / `apple-icon.png` (the face), `sitemap.ts`, `robots.ts` and Person JSON-LD in the layout. The address comes from `NEXT_PUBLIC_SITE_URL` (or Vercel's production URL), see `src/lib/site.ts`.

## 10. Accessibility

- The display name is a real `<h1>`. Script labels are real text, not images.
- Signal yellow on black passes AA (contrast ≈ 13:1). Bone on black ≈ 18:1.
- Focus ring: a `2px` Signal outline with `4px` offset on every interactive element.
- Videos carry `aria-label`s, and decorative canvas/3D get `aria-hidden="true"`.
- Language: English only (`<html lang="en">`).
