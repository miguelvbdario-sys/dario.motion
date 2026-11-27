"use client";

import { PAULISTAO_ASSET_COUNT } from "@/content/paulistaoAssets";
import BroadcastTrophy from "./BroadcastTrophy";
import Marked from "@/components/effects/Marked";
import styles from "./Broadcast.module.css";

import { useT } from "@/lib/i18n";
/*
 * PROCESS tab (Paulistão card): how the package was made, in short steps.
 * Static (the 3D trophy is the only interactive piece). Edit the copy here.
 */

const STATS = [
  { value: "3", label: "Months" },
  { value: String(PAULISTAO_ASSET_COUNT), label: "Assets" },
  { value: "16", label: "Clubs" },
  { value: "4", label: "Broadcasters" },
];

const STEPS = [
  {
    tool: "Sheet",
    title: "Package list",
    text: "Every graphic of the season mapped in one production sheet: scoreboard, line-ups, stats, brackets, bands.",
    img: { src: "/broadcast/paulistao/process/sheet.webp", alt: "Production sheet with the status of each graphic" },
  },
  {
    tool: "Figma",
    title: "Design",
    text: "Layouts and static bases diagrammed in Figma, the reference for every animated piece.",
    img: { src: "/broadcast/paulistao/process/figma.webp", alt: "Figma board with the scoreboard variations" },
  },
  {
    tool: "Illustrator",
    title: "Mascots",
    text: "One mascot per club drawn in Illustrator, built to break through the goal art.",
    img: { src: "/broadcast/paulistao/process/illustrator.webp", alt: "Palmeiras mascot vector in Illustrator" },
  },
  {
    tool: "After Effects",
    title: "Animation",
    text: "Scoreboard in/out, team plates, goals, shields and stings, exported as frame sequences with matching lengths.",
    img: { src: "/broadcast/paulistao/process/after-effects.webp", alt: "After Effects timeline of a goal animation" },
  },
  {
    tool: "Blender",
    title: "3D",
    text: "The trophy modelled and lit in Blender for the final scoreboard and the sting.",
    img: { src: "/broadcast/paulistao/process/blender-wireframe.webp", alt: "Wireframe of the 3D trophy" },
  },
  {
    tool: "Install",
    title: "Delivery",
    text: "Exports organised and installed in the broadcast graphics system, ready to be operated live.",
  },
  {
    tool: "On air",
    title: "Live",
    text: "Broadcast across the championship, through to the final.",
  },
];

const CHANNELS = ["TNT", "HBO", "Record", "CazéTV"];

/** Small, simplified app marks shown next to the tool name. */
function ToolIcon({ tool }: { tool: string }) {
  const box = { width: 16, height: 16, "aria-hidden": true } as const;
  switch (tool) {
    case "Figma":
      return (
        <svg viewBox="0 0 12 18" {...box}>
          <circle cx="3" cy="3" r="3" fill="#f24e1e" />
          <circle cx="9" cy="3" r="3" fill="#ff7262" />
          <circle cx="3" cy="9" r="3" fill="#a259ff" />
          <circle cx="9" cy="9" r="3" fill="#1abcfe" />
          <circle cx="3" cy="15" r="3" fill="#0acf83" />
        </svg>
      );
    case "Illustrator":
    case "After Effects": {
      const ai = tool === "Illustrator";
      return (
        <svg viewBox="0 0 16 16" {...box}>
          <rect width="16" height="16" rx="3" fill={ai ? "#330000" : "#00005b"} />
          <text
            x="8"
            y="11.5"
            textAnchor="middle"
            fontFamily="Arial, sans-serif"
            fontWeight="700"
            fontSize="8"
            fill={ai ? "#ff9a00" : "#9999ff"}
          >
            {ai ? "Ai" : "Ae"}
          </text>
        </svg>
      );
    }
    case "Blender":
      return (
        <svg viewBox="0 0 16 16" {...box}>
          <circle cx="9.5" cy="9" r="5.5" fill="#e87d0d" />
          <circle cx="9.5" cy="9" r="3" fill="#fff" />
          <circle cx="9.5" cy="9" r="1.6" fill="#265787" />
          <path d="M1 6.5h6l1.5 1.5H2.5z" fill="#e87d0d" />
        </svg>
      );
    default:
      return null;
  }
}

function StepBody({ s, i }: { s: (typeof STEPS)[number]; i: number }) {
  const t = useT();
  return (
    <>
      <span className={styles.processNum}>{String(i + 1).padStart(2, "0")}</span>
      <div>
        <p className={styles.processTitle}>
          {t(s.title)}{" "}
          <span className={styles.processTool}>
            <ToolIcon tool={s.tool} />
            {t(s.tool)}
          </span>
        </p>
        <p className={styles.processText}>{t(s.text)}</p>
        {"img" in s && s.img && (
          // eslint-disable-next-line @next/next/no-img-element
          <img className={styles.processImg} src={s.img.src} alt={s.img.alt} width={640} height={360} loading="lazy" />
        )}
      </div>
    </>
  );
}

export default function BroadcastProcess({ active, lead }: { active: boolean; lead?: string }) {
  const t = useT();
  return (
    <div className={styles.process}>
      <div className={styles.processSide}>
        <BroadcastTrophy active={active} />
        <dl className={styles.processStats}>
          {STATS.map((s) => (
            <div key={s.label}>
              <dd>{s.value}</dd>
              <dt>{t(s.label)}</dt>
            </div>
          ))}
          {/* Full-width row under the four stats. */}
          <div className={styles.processTeam}>
            <dd>6</dd>
            <dt>{t("Member team")}</dt>
          </div>
        </dl>
        {/* On air: the four broadcasters, 2 × 2 under the stats. */}
        <div className={styles.processChannels}>
          <span className={styles.sideLabel}>{t("[ On air ]")}</span>
          {CHANNELS.map((c) => (
            <span key={c} className={styles.processChannel}>
              {c}
            </span>
          ))}
        </div>
      </div>

      <div className={styles.processMain}>
        <p className={styles.processLead}>
          <Marked text={t(lead ?? "Three months of production, from the first sheet to the final whistle.")} />
        </p>
        <ol className={styles.processSteps}>
          {STEPS.slice(0, -2).map((s, i) => (
            <li key={s.title} className={styles.processStep}>
              <StepBody s={s} i={i} />
            </li>
          ))}
          {/* The two text-only steps share one slot, stacked (half height each). */}
          <li className={styles.processPair}>
            {STEPS.slice(-2).map((s, k) => (
              <div key={s.title} className={styles.processStep}>
                <StepBody s={s} i={STEPS.length - 2 + k} />
              </div>
            ))}
          </li>
        </ol>
      </div>
    </div>
  );
}
