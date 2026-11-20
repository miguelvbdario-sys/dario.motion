/*
 * ALL ASSETS tab (Paulistão card): every asset of the graphics package, from
 * the production sheet "LISTA DE ARTES PAULISTÃO" (same list as 2026),
 * translated to English. Groups = the sheet's sections, with its numbering.
 * `sub` = variants listed under an item (home/away, etc.).
 */

export type AssetItem = { name: string; sub?: string[] };
export type AssetGroup = { title: string; items: AssetItem[] };
export type AssetSection = { title: string; groups: AssetGroup[] };

const HA = ["Home", "Away"];

export const PAULISTAO_ASSETS: AssetSection[] = [
  {
    title: "1 · Programmable graphics",
    groups: [
      {
        title: "1.1.1 · Scoreboard",
        items: [
          { name: "Paulistão insert" },
          { name: "Scoreboard base" },
          { name: "Clubs (colour + abbreviation)" },
          { name: "Clock" },
          { name: "Stoppage time" },
          { name: "Crest insert" },
          { name: "Final scoreboard base" },
          { name: "Aggregate scoreboard" },
        ],
      },
      {
        title: "1.1.2 · Substitutions",
        items: [
          { name: "Scoreboard animation", sub: HA },
          { name: "Single substitution", sub: HA },
          { name: "Double substitution", sub: HA },
          { name: "Triple substitution", sub: HA },
          { name: "Substitution counter", sub: ["Red dot", "Lost substitution X", "Extra substitution"] },
        ],
      },
      {
        title: "1.1.3 · Cards",
        items: [
          { name: "Yellow card", sub: HA },
          { name: "Red card", sub: HA },
          { name: "Second yellow turns red", sub: HA },
          { name: "Suspension alert", sub: HA },
        ],
      },
      {
        title: "1.1.4 · Goal animation",
        items: [
          { name: "Custom team goal animation" },
          { name: "Goal scorer credit", sub: ["Standalone player credit"] },
          { name: "Own goal credit", sub: HA },
        ],
      },
      {
        title: "1.1.5 · Where's the game",
        items: [
          { name: "Where's the game insert", sub: ["Lower third + schedule", "On the scoreboard + next match"] },
          { name: "Cross promotion" },
        ],
      },
      { title: "1.2 · Opening card", items: [{ name: "Opening card" }, { name: "Stadium ID" }] },
      {
        title: "1.3 · Line-up",
        items: [
          { name: "Tactical line-up" },
          { name: "Pitch line-up · full screen" },
          { name: "Line-up lower third" },
          { name: "Substitutes lower third" },
          { name: "Pre-line-up animation", sub: ["Short animation", "Long animation"] },
        ],
      },
      {
        title: "1.4 · Refereeing",
        items: [{ name: "Referees card without VAR" }, { name: "Referees card with VAR" }, { name: "Referees + VAR lower third" }],
      },
      {
        title: "1.5 · Player of the match",
        items: [
          { name: "Player of the match nominees, no photo" },
          { name: "Player of the match nominees, with photo" },
          { name: "Player of the match winner, no photo" },
          { name: "Player of the match winner, with photo" },
        ],
      },
      {
        title: "1.6 · Statistics",
        items: [
          { name: "Refereeing stats" },
          { name: "Team comparison scoreboard stats" },
          { name: "Bar chart scoreboard stats" },
          { name: "Individual stat with text" },
          { name: "Player comparison stats" },
          { name: "Global stats" },
          { name: "Global ball possession" },
          { name: "Global shots" },
          { name: "Top 3/5 by skill" },
          { name: "Shots by zone", sub: HA },
          { name: "Shot origin", sub: HA },
          { name: "Scoreboard stats summary" },
        ],
      },
      {
        title: "1.7 · Schedule",
        items: [
          { name: "Full-screen schedule · 8 matches" },
          { name: "Full-screen schedule with photos · 4 matches" },
          { name: "Full-screen schedule with photos · 2 matches" },
          { name: "Side card schedule · 4 matches" },
        ],
      },
      {
        title: "1.8 · Standings",
        items: [
          { name: "Full-screen standings" },
          { name: "Scoreboard standings · 8 teams" },
          { name: "Semi-final bracket", sub: ["Eliminated teams band"] },
          { name: "Scoreboard standings · 2 teams + next match" },
        ],
      },
      {
        title: "1.9 · Penalties",
        items: [{ name: "Penalty scoreboard", sub: ["Scoreboard base", "Dots"] }, { name: "Penalty lower third" }],
      },
      {
        title: "1.10 · Results",
        items: [
          { name: "Match intro band" },
          { name: "Half-time/full-time band", sub: ["No goals", "With goals"] },
          { name: "Championship seal for the band" },
          { name: "Live match side card, simple" },
          { name: "Live match side card, full" },
        ],
      },
      {
        title: "1.11 · Bands",
        items: [
          { name: "Generic credit band" },
          { name: "Team credit band" },
          { name: "Short headline band" },
          { name: "Long headline band" },
          { name: "Short topic band" },
          { name: "Long topic band" },
          { name: "Press conference band" },
        ],
      },
    ],
  },
  {
    title: "2 · Static graphics and PNGs",
    groups: [
      { title: "2.1 · Crests", items: [{ name: "Crests" }, { name: "Expanded crests" }] },
      { title: "2.2 · Player photos", items: [] },
      { title: "2.3 · Hydration break", items: [] },
      { title: "2.4 · Red card on the scoreboard", items: [] },
    ],
  },
  {
    title: "3 · Backgrounds and multi-screens",
    groups: [
      {
        title: "3 · Multi-screens",
        items: [
          { name: "Multi-screen 50:50" },
          { name: "Multi-screen 70:30" },
          { name: "Multi-screen 30:70" },
          { name: "Multi-screen feed + 1" },
          { name: "Multi-screen 1 + feed" },
          { name: "Multi-screen feed + 2" },
          { name: "Multi-screen 2 + feed" },
          { name: "Diagonal multi-screen" },
          { name: "Refereeing + VAR multi-screen" },
        ],
      },
    ],
  },
  {
    title: "4 · Idents and fixed VTs",
    groups: [
      {
        title: "4 · Idents",
        items: [
          { name: "Paulistão ident" },
          { name: "Paulistão wipe" },
          { name: "Sting", sub: ["Trophy sting", "Teams sting"] },
          { name: "Promos" },
        ],
      },
    ],
  },
  {
    title: "5 · Commercial inserts",
    groups: [
      {
        title: "5 · Inserts",
        items: [{ name: "Player of the match" }, { name: "Substitution" }, { name: "Goal" }, { name: "Scoreboard insert" }],
      },
    ],
  },
];

/** Total count: items with variants count each variant. */
export const PAULISTAO_ASSET_COUNT = PAULISTAO_ASSETS.reduce(
  (n, s) =>
    n + s.groups.reduce((m, g) => m + (g.items.length ? g.items.reduce((k, i) => k + (i.sub?.length ?? 1), 0) : 1), 0),
  0,
);
