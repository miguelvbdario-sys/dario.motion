/*
 * Highlighter: ==words== in a desc / lead / note get the yellow marker (Marked.tsx).
 *
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
    kind: "about" | "scoreboard" | "shields" | "screens" | "mascots" | "process" | "youtube" | "showcase" | "recopando" | "branding" | "placeholder";
    /** kind "showcase": vertical videos played one after the other (base paths, .mp4 + .jpg). */
    verticals?: string[];
    /** kind "showcase": loops that open fullscreen on click (base paths). */
    zoom?: string[];
    /** kind "showcase": zoom loops that open with sound. */
    sound?: string[];
    /** kind "showcase": short text under all the videos, and an optional link button. */
    note?: string;
    cta?: { label: string; href: string };
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
  /** Old layout: no "About the project" tab; video tabs, preview beside the Index. */
  classic?: boolean;
  /** Team line in the Index panel (optional). */
  team?: string;
  /**
   * Several videos of equal weight: they replace the filters as a selector;
   * the chosen one plays in the preview and opens in "Watch full" (Vimeo).
   */
  videos?: { title: string; vimeo: string }[];
  /** "On air" strip: short loops of how it looked live. */
  onAir?: { src: string; poster: string }[];
  /**
   * "About the project" tab (first tab of every card): a short read for people
   * scrolling fast. The Index (client / details / year) lives only here.
   */
  about?: {
    lead: string;
    /** Optional loop per point (mp4 base path; poster = same name .jpg). */
    points: { title: string; text: string; loop?: { src: string; poster: string } }[];
    /** Closing line (plain, small). */
    outro?: string;
    /** Hide the Index (client / details / year) in this About. */
    noIndex?: boolean;
    stats?: { value: string; label: string }[];
    /** Muted loops: mp4 + poster. */
    loops?: { src: string; poster: string }[];
    channels?: string[];
  };
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
    about: {
      lead: "Paulistão is São Paulo's state football championship, the biggest in Brazil.\nWe made the ==graphics package and the animations== for its official broadcast.",
      points: [
        {
          title: "The championship",
          text: "16 clubs, from the first round to the final, broadcast live across the season.",
          loop: { src: "/broadcast/paulistao/live/scoreboard-1.mp4", poster: "/broadcast/paulistao/live/scoreboard-1.jpg" },
        },
        {
          title: "The package",
          text: "Scoreboard, line-ups, goals, bracket and champion screens, designed and animated for the broadcast.",
          loop: { src: "/broadcast/paulistao/lineups/sao-paulo.mp4", poster: "/broadcast/paulistao/lineups/sao-paulo.jpg" },
        },
        {
          title: "On every channel",
          text: "The same graphics ran live on TNT, HBO, Record and CazéTV.",
          loop: { src: "/broadcast/paulistao/live/scoreboard-2.mp4", poster: "/broadcast/paulistao/live/scoreboard-2.jpg" },
        },
        {
          title: "Through to the final",
          text: "In partnership between FPF and Livemode, we delivered every asset a championship broadcast needs.",
          loop: { src: "/broadcast/paulistao/screens/champion-live.mp4", poster: "/broadcast/paulistao/screens/champion-live.jpg" },
        },
      ],
      stats: [
        { value: "3", label: "Months" },
        { value: "110", label: "Assets" },
        { value: "16", label: "Clubs" },
        { value: "6", label: "Member team" },
      ],
      outro: "This portfolio is interactive, enjoy, take your time and click on all!",
      noIndex: true,
      channels: ["TNT", "HBO", "Record", "CazéTV"],
    },
    filters: [], // the tabs below take their place
    fullVideo: null, // TODO: substituir
    sections: [
      { label: "About the project", kind: "about" },
      // Loops: /public/broadcast/paulistao/live (cut from match highlights).
      { label: "Scoreboard", kind: "scoreboard", loops: [3, 4].map((n) => `/broadcast/paulistao/live/scoreboard-${n}`) },
      { label: "Shields", kind: "shields" },
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
    desc: "Official CazéTV broadcast of the FIFA World Cup 2026",
    filters: [],
    sections: [
      // Text + chair/trophy assets + the motion brand video (MotionBranding.tsx).
      { label: "Motion Branding", kind: "branding" },
      {
        label: "Live",
        kind: "showcase",
        // How the graphics looked on air (cut from the broadcast).
        loops: ["live-final", "live-taca", "live-camisa", "live-pacote", "live-wipe"].map((n) => `/broadcast/copa-cazetv/${n}`),
        verticals: [],
        note: "CazéTV was the ==official broadcaster== of the FIFA World Cup 2026, live on YouTube. This is how the graphics looked on air.",
        cta: { label: "Watch on YouTube", href: "https://www.youtube.com/watch?v=zPQDvq-Fe0U&t=16178s" },
      },
      {
        label: "Bora Copar",
        kind: "showcase",
        loops: ["vinheta", "bumper", "telao", "live-1", "live-2"].map((n) => `/broadcast/bora-copar/${n}`),
        verticals: [],
        zoom: ["vinheta", "bumper"].map((n) => `/broadcast/bora-copar/${n}`),
        sound: ["vinheta", "bumper"].map((n) => `/broadcast/bora-copar/${n}`),
        note: "Bora Copar is CazéTV's World Cup show: squad call-ups, behind the scenes of the Brazil team and everything around the tournament. I was responsible for the ==LED screens and the vignettes==.",
      },
      // The vignette made in Blender: render × wireframe + the 3D set.
      { label: "Recopando", kind: "recopando" },
    ],
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
    desc: "==Development of LED screens== for the official broadcast studios of the Paris 2024 Olympics, ensuring the alignment with the event's identity.",
    classic: true,
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
    title: "Personal Projects",
    meta: "NBA · World Cup · Champions",
    align: "left",
    offset: 0,
    metaFirst: false,
    img: "/broadcast/nba-style/final-flamengo.jpg",
    preview: "/broadcast/nba-style/final-flamengo.mp4",
    client: "[Client]", // TODO: substituir
    role: "[Details]", // TODO: substituir
    year: "[Year]", // TODO: substituir
    desc: "Exploring ==broadcast graphics== in my own way. All these videos go to my Instagram page.",
    filters: [],
    sections: [
      {
        label: "NBA Style",
        kind: "showcase",
        loops: ["final-flamengo", "final-palmeiras"].map((n) => `/broadcast/nba-style/${n}`),
        // Add "process-2" here when the second process video arrives.
        verticals: ["/broadcast/nba-style/process-1"],
        zoom: ["final-flamengo", "final-palmeiras"].map((n) => `/broadcast/nba-style/${n}`),
        note: "Reimagining Brazilian teams in the ==NBA motion style==.",
      },
      {
        label: "World Cup Graphics",
        kind: "showcase",
        loops: [
          "escalacao-arg-esp",
          "escalacao-bra-por",
          "placar",
          "assets-placar",
          "gol-argentina",
          "gol-espanha",
        ].map((n) => `/broadcast/world-cup/${n}`),
        verticals: [1, 2, 3, 4, 5].map((n) => `/broadcast/world-cup/process-${n}`),
        zoom: ["escalacao-arg-esp", "escalacao-bra-por"].map((n) => `/broadcast/world-cup/${n}`),
        note: "==Recreating the World Cup graphics== in my own way, including the goal animations.",
      },
      {
        label: "Champions League Graphics",
        kind: "showcase",
        loops: ["placar", "halftime", "bola", "escudo-city", "modulo-2", "modulo-3"].map((n) => `/broadcast/champions/${n}`),
        // process-2 is cut at 7s (only the first 7s are used).
        verticals: [1, 2].map((n) => `/broadcast/champions/process-${n}`),
        zoom: ["placar", "halftime", "escudo-city"].map((n) => `/broadcast/champions/${n}`),
        note: "==Recreating the scoreboard and the line-up==, and teaching them in my course, from the principles of motion to the final animations.",
        cta: { label: "Course page", href: "/course" },
      },
    ],
    fullVideo: null, // TODO: substituir
  },
];
