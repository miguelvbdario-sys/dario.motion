/*
 * Interactive scoreboard: the frame sequences in /public/scoreboard.
 * Original renders: full 1332×1080 with transparency, so all layers line
 * up when drawn on top of each other. The canvas only shows the band where the
 * board lives (SCOREBOARD_CROP).
 *
 *   base/            the board (in, then holds), 120 frames: AE frames 000–119
 *   home/<team>/     home team plate, 47 frames: AE frames 055–101 of the base
 *   away/<team>/     away team plate, 47 frames: AE frames 055–101 of the base
 *   goal/<team>/     goal animation (in and out in one go), length per team
 *   shield/<side>/<team>/  shield mode (crests replace the plates), 43 frames
 *
 * Frames in /public are PRE-CROPPED to SCOREBOARD_CROP and scaled to 75%
 * (1056x443) to save weight: run new exports through the same crop first.
 *
 * To add a team: export its sequences in the same comp into those folders
 * (frames renamed 000.webp, 001.webp…) and add it to TEAMS below.
 */

export const SCOREBOARD_FPS = 30;
/** Comp size of the base. Frames from a wider comp (some goals are 1460 wide) are centred on it. */
export const FRAME_SIZE = { width: 1332, height: 1080 };
/*
 * The part of the comp shown on the canvas (comp pixels). Centred on the art
 * (base, plates, shields and goals together span x 9–1278, y 277–736), with
 * margins all round: the resting board (trophy top y 358 → clock bottom y 736)
 * has similar air above and below, and the tallest goal art still fits.
 * x can be negative: the frame is then drawn with an empty margin on the left.
 * The canvas takes its aspect ratio from this (BroadcastScoreboard.tsx).
 */
export const SCOREBOARD_CROP = { x: -40, y: 240, width: 1408, height: 590 };

export const BASE_FRAMES = 120;
export const TEAM_FRAMES = 47;
/** Base frame on which the team plates' first frame plays (AE frame 055). */
export const TEAM_OFFSET = 55;

/*
 * Shield mode: per-team sequences in shield/home/<team>/ and shield/away/<team>/
 * (AE frames 179–221). They replace the plates: shield frame 0 is the plates'
 * last frame, and the last shield frame shows the crests. Off = played reversed.
 */
export const SHIELD_FRAMES = 43;

/*
 * Score and clock, drawn by code over the base (comp pixels, font Kuunari Bold).
 * x / y are the centre of the text; size is the height of the digits.
 * Edit here to nudge them.
 */
export const SCORE_FONT = { family: "Kuunari", url: "/fonts/Kuunari-Bold.otf" };
export const SCORE_LAYOUT = {
  home: { x: 522, y: 489, size: 165 },
  away: { x: 802, y: 489, size: 165 },
  clock: { x: 662, y: 663, size: 92 },
  color: "#efeeee",
  /**
   * Entrance of the numbers between these base frames (reversed on OUT):
   * opacity + slide with an ease-out (fast start, long settle).
   */
  fadeFrom: 79,
  fadeTo: 119,
  /** Slide distance in comp px: home from the left, away from the right, clock from above. */
  slide: { home: 42, away: 42, clock: 30 },
  /** Ease-out strength (higher = more of the move at the start). */
  easePower: 4,
};

/** Goal frame at which the score goes up (the goal art covers the board then). */
export const GOAL_SCORE_FRAME = 90;

export type Team = {
  slug: string;
  label: string;
  /** Number of frames of the goal animation. */
  goalFrames: number;
  /**
   * Frames the plate sequence is held back to sync with the base. Some plate
   * renders start their move 5 frames earlier than Palmeiras/Corinthians
   * (measured), which opened a gap against the base.
   */
  plateDelay?: number;
};

export const TEAMS: Team[] = [
  { slug: "palmeiras", label: "Palmeiras", goalFrames: 372 },
  { slug: "corinthians", label: "Corinthians", goalFrames: 366 },
  { slug: "sao-paulo", label: "São Paulo", goalFrames: 365, plateDelay: 5 },
  { slug: "red-bull-bragantino", label: "Red Bull Bragantino", goalFrames: 370, plateDelay: 5 },
  { slug: "botafogo-sp", label: "Botafogo-SP", goalFrames: 384, plateDelay: 5 },
  { slug: "capivariano", label: "Capivariano", goalFrames: 367, plateDelay: 5 },
  { slug: "sao-bernardo", label: "São Bernardo", goalFrames: 376, plateDelay: 5 },
  { slug: "portuguesa", label: "Portuguesa", goalFrames: 419, plateDelay: 5 },
];

export const plateDelayOf = (slug: string) => TEAMS.find((t) => t.slug === slug)?.plateDelay ?? 0;

export const DEFAULT_HOME = "palmeiras";
export const DEFAULT_AWAY = "corinthians";

export const goalFramesOf = (slug: string) => TEAMS.find((t) => t.slug === slug)?.goalFrames ?? 0;

export const framePath = (folder: string, frame: number) =>
  `/scoreboard/${folder}/${String(frame).padStart(3, "0")}.webp`;
