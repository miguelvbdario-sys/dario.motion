import Image from "next/image";
import { ABOUT } from "@/content/about";
import BoxReveal from "./BoxReveal";
import CircleText from "./CircleText";
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

      {/* "MIGUEL DARIO" cut by the bottom edge, inside the section's bottom
          padding so it never reaches the text. */}
      <p className={`${styles.frame} ${styles.frameBot}`} data-frame aria-hidden="true">
        Miguel Dario
      </p>

      {/* Box reveal of the texts (label, lead, paragraph, buttons). */}
      <BoxReveal />

      <div className={styles.grid}>
        <p className={styles.label} data-box="0">{ABOUT.label}</p>

        <div className={styles.portrait} data-enter style={{ "--i": 1 } as React.CSSProperties}>
          {/* Round text badge on the photo's corner, turning with the scroll. */}
          <CircleText />
          <div className={styles.photo}>
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
          <p id="about-lead" className={styles.lead} data-box="1">
            {ABOUT.lead}
          </p>
          {ABOUT.paragraphs.map((p) => (
            <p key={p} className={styles.body} data-box="2">
              {p}
            </p>
          ))}
          <div className={styles.buttons} data-box="3">
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
