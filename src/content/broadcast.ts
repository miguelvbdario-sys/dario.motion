/*
 * BROADCAST section (#broadcast): the four broadcast projects, in display order.
 *
 * Everything still missing is a visible placeholder in [brackets], each marked
 * with "// TODO: substituir". Media left as null show a striped
 * "[ PREVIEW 16:9 ]" block until a file is set.
 *
 * Media go in /public/projects (see DESIGN.md §8):
 *   img        still frame (poster) of the preview
 *   preview    short muted loop, plays on hover and in the open card
 *   fullVideo  full-quality video, opens in the fullscreen player ("Watch full")
 */

export type BroadcastFilter = {
  label: string;
  /** Shown as "[05]". Keep the brackets while it is a placeholder. */
  count: string;
};

export type BroadcastProject = {
  id: string;
  title: string;
  meta: string;
  /** Side of the zig-zag. */
  align: "left" | "right";
  /** Extra indent from the left, in design px (1920 wide). */
  offset: number;
  /** true: meta before the title in the row. */
  metaFirst: boolean;
  /** Poster image, or null for the striped placeholder. */
  img: string | null;
  /** Preview loop, or null for the striped placeholder. */
  preview: string | null;
  client: string;
  /** Shown as DETAILS in the Index. */
  role: string;
  year: string;
  desc: string;
  /** Filter pills (not shown when the project has `sections` or `videos`). */
  filters: BroadcastFilter[];
  /** Full video for the player, or null (the button stays disabled). */
  fullVideo: string | null;
  /**
   * Tabs that replace the filters and switch the card's media area. Kinds:
   * "scoreboard" (the interactive board), "shields" (animated crests),
   * "placeholder" (striped block until the content exists).
   */
  sections?: {
    label: string;
    kind: "scoreboard" | "shields" | "screens" | "mascots" | "process" | "youtube" | "placeholder";
    /** kind "youtube": the video id shown in the player. */
    youtube?: string;
    /**
     * kind "screens": a selector of broadcast screens. Each shows its art in the
     * big 16:9 stage (null = striped placeholder) and, optionally, live loops
     * (base paths, .mp4 + .jpg poster) left of the Index.
     */
    screens?: { label: string; video: string | null; loops?: string[]; assets?: boolean }[];
    /** Short live loops (gif-like) shown left of the Index: base paths, .mp4 + .jpg poster. */
    loops?: string[];
  }[];
  /** Team line in the Index panel (optional). */
  team?: string;
  /**
   * Several videos of equal weight: they replace the filters as a selector;
   * the chosen one plays in the preview and opens in "Watch full" (Vimeo).
   */
  videos?: { title: string; vimeo: string }[];
  /** "On air" strip: short loops of how it looked live. */
  onAir?: { src: string; poster: string }[];
  /** Small extras (e.g. program vignettes), played with sound in the player. */
  extras?: { title: string; video: string; poster: string }[];
};

/** Placeholder filters, until the real categories and counts exist. */
const placeholderFilters = (): BroadcastFilter[] => [
  { label: "[Category]", count: "[00]" }, // TODO: substituir
  { label: "[Category]", count: "[00]" }, // TODO: substituir
  { label: "[Category]", count: "[00]" }, // TODO: substituir
];

export const BROADCAST: BroadcastProject[] = [
  {
    id: "paulistao",
    title: "Paulistão Broadcast",
    meta: "Scoreboard · Goal · Shields",
    align: "left",
    offset: 0,
    metaFirst: false,
    // Cover: "Sting Taça Paulistão" (CAPAS DOS CARDS).
    img: "/broadcast/paulistao/cover.webp",
    preview: "/broadcast/paulistao/cover.mp4",
    client: "FPF · Livemode",
    role: "On air · HBO, TNT, Record, CazéTV",
    year: "2026",
    desc: "Official Paulistão 2026 broadcast assets",
    filters: [], // the tabs below take their place
    fullVideo: null, // TODO: substituir
    sections: [
      // Loops: /public/broadcast/paulistao/live (cut from match highlights).
      { label: "Scoreboard", kind: "scoreboard", loops: [1, 2, 3, 4].map((n) => `/broadcast/paulistao/live/scoreboard-${n}`) },
      {
        label: "Broadcast Screens",
        kind: "screens",
        // Art in /public/broadcast/paulistao/screens, live loops in .../lineups.
        screens: [
          { label: "Sting", video: "/broadcast/paulistao/screens/sting.mp4" },
          {
            label: "Line-up",
            video: "/broadcast/paulistao/screens/lineup.mp4",
            loops: ["sao-paulo", "red-bull-bragantino"].map(
              (t) => `/broadcast/paulistao/lineups/${t}`,
            ),
          },
          { label: "Bracket", video: "/broadcast/paulistao/screens/bracket.mp4" },
          {
            label: "Champion",
            video: "/broadcast/paulistao/screens/champion.mp4",
            loops: ["/broadcast/paulistao/screens/champion-live"],
          },
          { label: "Final scoreboard", video: "/broadcast/paulistao/screens/final-scoreboard.mp4" },
          { label: "Full time", video: "/broadcast/paulistao/screens/fulltime-1.mp4" },
          // The package list (src/content/paulistaoAssets.ts) in the 16:9 stage.
          { label: "All assets", video: null, assets: true },
        ],
      },
      { label: "Shields", kind: "shields" },
      { label: "Mascots", kind: "mascots" },
      { label: "Process", kind: "process" }, // 3D trophy (BroadcastTrophy.tsx)
      { label: "Live", kind: "youtube", youtube: "pMxhbLuqH3c" },
    ],
  },
  {
    id: "world-cup-2026",
    title: "2026 World Cup",
    meta: "CazéTV Live",
    align: "right",
    offset: 0,
    metaFirst: true,
    // Cover: "Se Tem Copa, Esquece!" (the same loop as in the works).
    img: "/projects/copa-poster.webp",
    preview: "/projects/copa-preview.mp4",
    client: "[Client]", // TODO: substituir
    role: "[Details]", // TODO: substituir
    year: "[Year]", // TODO: substituir
    desc: "[Project description]", // TODO: substituir
    filters: placeholderFilters(),
    fullVideo: null, // TODO: substituir
  },
  {
    id: "olympics-paris-2024",
    title: "2024 Olympics Paris",
    meta: "CazéTV Live",
    align: "left",
    offset: 250,
    metaFirst: true,
    // Source: behance.net/gallery/218814327 (PARIS 2024 OLYMPICS | CAZÉTV).
    // Loops cut from Miguel's phone recordings of the CazéTV broadcast.
    // Cover: the bronze medal render (CAPAS DOS CARDS).
    img: "/broadcast/olympics/cover.webp",
    preview: "/broadcast/olympics/cover.mp4",
    client: "CazéTV",
    role: "Head Project — Motion",
    year: "2024",
    team: "Anderson Frade · Marcelo Pineschi",
    desc: "Development of LED screens for the official broadcast studios of the Paris 2024 Olympics, ensuring the alignment with the event's identity.",
    filters: [],
    fullVideo: null,
    videos: [
      { title: "Athlete Screens", vimeo: "1063778200" },
      { title: "Template Paris", vimeo: "1057375328" },
      { title: "Medal Screens", vimeo: "1057375881" },
      { title: "Ceremonies", vimeo: "1063911393" },
    ],
    onAir: [
      { src: "/broadcast/olympics/on-air-01.mp4", poster: "/broadcast/olympics/on-air-01.webp" },
      { src: "/broadcast/olympics/on-air-02.mp4", poster: "/broadcast/olympics/on-air-02.webp" },
      { src: "/broadcast/olympics/on-air-03.mp4", poster: "/broadcast/olympics/on-air-03.webp" },
    ],
    extras: [
      { title: "Tamo em Paris", video: "/broadcast/olympics/tamo-em-paris.mp4", poster: "/broadcast/olympics/tamo-em-paris.webp" },
      { title: "Partiu Paris", video: "/broadcast/olympics/partiu-paris.mp4", poster: "/broadcast/olympics/partiu-paris.webp" },
    ],
  },
  {
    id: "led-displays",
    title: "LED Displays Broadcasts",
    meta: "[Venue · Scope]", // TODO: substituir
    align: "left",
    offset: 0,
    metaFirst: false,
    img: null, // TODO: substituir
    preview: null, // TODO: substituir
    client: "[Client]", // TODO: substituir
    role: "[Details]", // TODO: substituir
    year: "[Year]", // TODO: substituir
    desc: "[Project description]", // TODO: substituir
    filters: placeholderFilters(),
    fullVideo: null, // TODO: substituir
  },
];
