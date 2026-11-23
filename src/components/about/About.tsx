import Image from "next/image";
import { ABOUT } from "@/content/about";
import WordReveal from "@/components/effects/WordReveal";
import styles from "./About.module.css";

/*
 * ABOUT (#about): red sheet (site red + scanlines + guide columns, like the
 * BROADCAST cards). The portrait, with the intro text and buttons on the right.
 * Photo and text rise in when the scroll transition before it (AboutIntro) ends.
 */
export default function About() {
  return (
    <section id="about" className={styles.section} aria-labelledby="about-title">
      <h2 id="about-title" className={styles.srOnly}>
        About
      </h2>
      <div className={styles.guides} aria-hidden="true">
        <span />
        <span />
        <span />
        <span />
      </div>

      {/* The name as a frame: MIGUEL cut by the top edge, DARIO by the bottom
          one, inside the section's padding so it never reaches the text. */}
      <p className={`${styles.frame} ${styles.frameTop}`} aria-hidden="true">
        Miguel
      </p>
      <p className={`${styles.frame} ${styles.frameBot}`} aria-hidden="true">
        Dario
      </p>

      <div className={styles.grid}>
        <p className={styles.label} data-enter style={{ "--i": 0 } as React.CSSProperties}>{ABOUT.label}</p>

        <div className={styles.portrait}>
          <div className={styles.photo} data-enter style={{ "--i": 1 } as React.CSSProperties}>
            <Image
              src={ABOUT.photo.src}
              alt={ABOUT.photo.alt}
              width={ABOUT.photo.width}
              height={ABOUT.photo.height}
              sizes="(max-width: 767px) 50vw, 240px"
            />
          </div>
        </div>

        <div className={styles.text}>
          <p id="about-lead" className={styles.lead} data-enter style={{ "--i": 2 } as React.CSSProperties}>
            {/* Words light up one by one as the lead crosses the screen. */}
            <WordReveal text={ABOUT.lead} />
          </p>
          {ABOUT.paragraphs.map((p) => (
            <p key={p} className={styles.body} data-enter style={{ "--i": 3 } as React.CSSProperties}>
              {p}
            </p>
          ))}
          <div className={styles.buttons} data-enter style={{ "--i": 4 } as React.CSSProperties}>
            {ABOUT.buttons.map((b) => {
              const external = b.href.startsWith("http");
              return (
                <a
                  key={b.label}
                  href={b.href}
                  className={styles.button}
                  data-magnetic
                  target={external ? "_blank" : undefined}
                  rel={external ? "noopener noreferrer" : undefined}
                >
                  <span className={styles.buttonDot} aria-hidden="true" />
                  {b.label}
                </a>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
