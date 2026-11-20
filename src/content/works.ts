export type Work = {
  id: string;
  /** Shown on hover and in the player. */
  title: string;
  /** Short line under the title (client, role, year…). Leave empty to hide it. */
  meta: string;
  /** Muted loop that plays inside the tile (960px wide, a few MB at most). */
  preview: string;
  /** Still frame shown before the preview loads. Use the preview's first frame. */
  poster: string;
  /** Full-quality version that opens in the player when the tile is clicked. */
  video: string;
  /** true if the full video has a soundtrack. */
  hasAudio: boolean;
  /**
   * true for 9:16 videos: the card still shows them filling its 16:9 frame
   * (cropped), and the player opens them in a 9:16 layout.
   */
  vertical?: boolean;
  /** Vimeo id: the player embeds Vimeo instead of the `video` file. */
  vimeo?: string;
  /** Index panel shown beside the video in the fullscreen player. */
  client?: string;
  role?: string;
  year?: string;
};

/** Placeholder Index, until the real credits are filled in. */
const INDEX_TODO = {
  client: "[Client]", // TODO: substituir
  role: "[Details]", // TODO: substituir
  year: "[Year]", // TODO: substituir
};

/*
 * Portfolio pieces, in display order. To add one: export a preview loop, a poster
 * and a full video into /public/projects (see DESIGN.md §8) and add an entry here.
 * TODO(Miguel): fill in the real titles and meta lines.
 */
export const WORKS: Work[] = [
  {
    id: "flamengo",
    title: "Flamengo",
    meta: "Motion design", // TODO(Miguel): client · year · role
    preview: "/projects/flamengo-preview.mp4",
    poster: "/projects/flamengo-poster.webp",
    video: "/projects/flamengo.mp4",
    hasAudio: false,
    ...INDEX_TODO,
  },
  {
    id: "palmeiras",
    title: "Palmeiras",
    meta: "Motion design", // TODO(Miguel): client · year · role
    preview: "/projects/palmeiras-preview.mp4",
    poster: "/projects/palmeiras-poster.webp",
    video: "/projects/palmeiras.mp4",
    hasAudio: false,
    ...INDEX_TODO,
  },
  {
    id: "vini-jr-hala-madrid",
    title: "Vini Jr — Hala Madrid",
    meta: "Motion design", // TODO(Miguel): client · year · role
    preview: "/projects/vini-jr-hala-madrid-preview.mp4",
    poster: "/projects/vini-jr-hala-madrid-poster.webp",
    video: "/projects/vini-jr-hala-madrid.mp4",
    hasAudio: false,
    ...INDEX_TODO,
    vertical: true,
  },
  {
    id: "vinheta-brasileirao",
    title: "Vinheta Brasileirão",
    meta: "Motion design", // TODO(Miguel): client · year · role
    preview: "/projects/vinheta-brasileirao-preview.mp4",
    poster: "/projects/vinheta-brasileirao-poster.webp",
    video: "/projects/vinheta-brasileirao.mp4",
    hasAudio: true,
    ...INDEX_TODO,
  },
  {
    id: "clash-of-titans",
    title: "Clash of Titans",
    meta: "Motion design", // TODO(Miguel): client · year · role
    preview: "/projects/clash-of-titans-preview.mp4",
    poster: "/projects/clash-of-titans-poster.webp",
    video: "/projects/clash-of-titans.mp4",
    hasAudio: true,
    ...INDEX_TODO,
  },
  {
    id: "copazona",
    title: "Copazona",
    meta: "Motion design", // TODO(Miguel): client · year · role
    preview: "/projects/copazona-preview.mp4",
    poster: "/projects/copazona-poster.webp",
    video: "/projects/copazona.mp4",
    hasAudio: true,
    ...INDEX_TODO,
  },
  {
    id: "intro-motion-pro",
    title: "Intro Motion Pro",
    meta: "Motion design", // TODO(Miguel): client · year · role
    preview: "/projects/intro-motion-pro-preview.mp4",
    poster: "/projects/intro-motion-pro-poster.webp",
    video: "/projects/intro-motion-pro.mp4",
    hasAudio: true,
    ...INDEX_TODO,
  },
  {
    id: "personal-experimentations",
    title: "Personal Experimentations",
    meta: "Motion design", // TODO(Miguel): client · year · role
    preview: "/projects/personal-experimentations-preview.mp4",
    poster: "/projects/personal-experimentations-poster.webp",
    video: "/projects/personal-experimentations.mp4",
    hasAudio: true,
    ...INDEX_TODO,
    vertical: true,
  },
];

