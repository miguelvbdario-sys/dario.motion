import Image from "next/image";
import { ABOUT } from "@/content/about";
import WordReveal from "@/components/effects/WordReveal";
import styles from "./About.module.css";

/*
 * ABOUT (#about): red sheet (site red + scanlines + guide columns, like the
 * BROADCAST cards). A 3:4 portrait covers a big "Miguel Dario" in the Wildest
 * script, tilted −20°; the intro text and two buttons sit on the right.
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

      <div className={styles.grid}>
        <p className={styles.label}>{ABOUT.label}</p>

        <div className={styles.portrait}>
          {/* Two stacked lines ("Miguel" / "Dario"), half hidden behind the photo. */}
          <span className={styles.script} aria-hidden="true">
            {ABOUT.name.split(" ").map((word) => (
              <span key={word}>{word}</span>
            ))}
          </span>
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
          <p id="about-lead" className={styles.lead}>
            {/* Words light up one by one as the lead crosses the screen. */}
            <WordReveal text={ABOUT.lead} />
          </p>
          {ABOUT.paragraphs.map((p) => (
            <p key={p} className={styles.body}>
              {p}
            </p>
          ))}
          <div className={styles.buttons}>
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
