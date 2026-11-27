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

/*
 * Portfolio pieces, in display order. To add one: export a preview loop, a poster
 * and a full video into /public/projects (see DESIGN.md §8) and add an entry here.
 * TODO(Miguel): fill in the real titles and meta lines.
 */
export const WORKS: Work[] = [
  {
    id: "secadores",
    title: "CaféTV",
    meta: "Program vignette",
    preview: "/projects/secadores-preview.mp4",
    poster: "/projects/secadores-poster.webp",
    video: "/projects/secadores.mp4",
    hasAudio: true,
    role: "Morning program during the 2025 FIFA Club World Cup",
    year: "2025",
  },
  {
    id: "vini-jr-hala-madrid",
    title: "Vini Jr — Hala Madrid",
    meta: "Personal",
    preview: "/projects/vini-jr-hala-madrid-preview.mp4",
    poster: "/projects/vini-jr-hala-madrid-poster.webp",
    video: "/projects/vini-jr-hala-madrid.mp4",
    hasAudio: false,
    role: "Trying out a different style, as a tribute to Vini Jr",
    year: "2026",
    vertical: true,
  },
  {
    id: "vinheta-brasileirao",
    title: "Vinheta Brasileirão",
    meta: "CazéTV",
    preview: "/projects/vinheta-brasileirao-preview.mp4",
    poster: "/projects/vinheta-brasileirao-poster.webp",
    video: "/projects/vinheta-brasileirao.mp4",
    hasAudio: true,
    role: "Intro for the Brasileirão Championship broadcast",
    year: "2025",
  },
  {
    id: "clash-of-titans",
    title: "Clash of Titans",
    meta: "YouTube channel",
    preview: "/projects/clash-of-titans-preview.mp4",
    poster: "/projects/clash-of-titans-poster.webp",
    video: "/projects/clash-of-titans.mp4",
    hasAudio: true,
    role: "Full live screens for a German YouTube channel",
    year: "2026",
  },
  {
    id: "copazona",
    title: "Copazona",
    meta: "CazéTV",
    preview: "/projects/copazona-preview.mp4",
    poster: "/projects/copazona-poster.webp",
    video: "/projects/copazona.mp4",
    hasAudio: true,
    role: "Program during the 2025 FIFA Club World Cup",
    year: "2025",
  },
  {
    id: "intro-motion-pro",
    title: "Intro Motion Pro",
    meta: "Motion course",
    preview: "/projects/intro-motion-pro-preview.mp4",
    poster: "/projects/intro-motion-pro-poster.webp",
    video: "/projects/intro-motion-pro.mp4",
    hasAudio: true,
    role: "Intro and ads for my motion design course, Motion PRO",
    year: "2026",
  },
  {
    id: "personal-experimentations",
    title: "Personal Experimentations",
    meta: "Personal",
    preview: "/projects/personal-experimentations-preview.mp4",
    poster: "/projects/personal-experimentations-poster.webp",
    video: "/projects/personal-experimentations.mp4",
    hasAudio: true,
    role: "Videos in my own style, made to learn",
    year: "2024–2026",
    vertical: true,
  },
];

