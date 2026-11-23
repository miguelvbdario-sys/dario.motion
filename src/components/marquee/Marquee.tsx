import styles from "./Marquee.module.css";

/*
 * White strip under the hero: "MIGUEL DARIO • SENIOR MOTION DESIGNER •
 * @DARIO.MOTION" repeated, sliding sideways forever (pure CSS). The track holds
 * two identical halves, so moving it by -50% loops without a seam.
 */
const ITEMS = ["Miguel Dario", "Senior Motion Designer", "@dario.motion"];
const REPEAT = 4;

export default function Marquee() {
  const half = Array.from({ length: REPEAT }, () => ITEMS).flat();
  return (
    <div className={styles.marquee} aria-label="Miguel Dario, Senior Motion Designer, @dario.motion">
      <div className={styles.track} aria-hidden="true">
        {[0, 1].map((h) => (
          <span key={h} className={styles.half}>
            {half.map((t, i) => (
              <span key={i} className={styles.item}>
                {t}
                <span className={styles.sep}>•</span>
              </span>
            ))}
          </span>
        ))}
      </div>
    </div>
  );
}
