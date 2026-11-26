"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import { ArrowLeft, ArrowRight, Plus, Play } from "lucide-react";
import { COURSE as COURSE_SRC } from "@/content/course";
import { useT, useTr } from "@/lib/i18n";
import type { Work } from "@/content/works";
import WorkPlayer from "@/components/works/WorkPlayer";
import styles from "./Course.module.css";
import LangSwitch from "@/components/lang/LangSwitch";

gsap.registerPlugin(ScrollTrigger, useGSAP);

/*
 * COURSE page (/course): MOTION PRO. Same language as the portfolio (huge
 * Tusker titles, HUD guides, mono labels, scanline sheets, GSAP reveals), in
 * the course palette: deep purple, violet neon, a touch of orange.
 */

const pad = (n: number) => String(n).padStart(2, "0");

/** A muted loop that plays only while on screen. */
function Loop({ src, poster }: { src: string; poster: string }) {
  const ref = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    const v = ref.current;
    if (!v) return;
    const io = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) v.play().catch(() => {});
      else v.pause();
    });
    io.observe(v);
    return () => io.disconnect();
  }, []);
  return <video ref={ref} src={src} poster={poster} muted loop playsInline preload="metadata" aria-hidden="true" />;
}

/**
 * Facts strip: click and drag to scroll it sideways, endlessly (the first fact
 * comes right after the last). The list is rendered 3× and the offset wraps
 * by one set's width, so there is never an edge.
 */
function FactsStrip({ facts }: { facts: string[] }) {
  const wrap = useRef<HTMLDivElement>(null);
  const track = useRef<HTMLUListElement>(null);
  useEffect(() => {
    const w = wrap.current;
    const t = track.current;
    if (!w || !t) return;
    let x = 0;
    let set = t.scrollWidth / 3;
    let startX = 0;
    let startOff = 0;
    let dragging = false;
    const apply = () => {
      // Keep x in (-set, 0]: the middle copy always covers the screen.
      x = ((x % set) - set) % set;
      t.style.transform = `translate3d(${x}px,0,0)`;
    };
    const onResize = () => {
      set = t.scrollWidth / 3;
      apply();
    };
    const down = (e: PointerEvent) => {
      dragging = true;
      startX = e.clientX;
      startOff = x;
      w.setPointerCapture(e.pointerId);
      w.dataset.dragging = "";
    };
    const move = (e: PointerEvent) => {
      if (!dragging) return;
      x = startOff + (e.clientX - startX);
      apply();
    };
    const up = () => {
      dragging = false;
      delete w.dataset.dragging;
    };
    apply();
    w.addEventListener("pointerdown", down);
    w.addEventListener("pointermove", move);
    w.addEventListener("pointerup", up);
    w.addEventListener("pointercancel", up);
    window.addEventListener("resize", onResize);
    return () => {
      w.removeEventListener("pointerdown", down);
      w.removeEventListener("pointermove", move);
      w.removeEventListener("pointerup", up);
      w.removeEventListener("pointercancel", up);
      window.removeEventListener("resize", onResize);
    };
  }, []);
  return (
    <div ref={wrap} className={styles.factsWrap} data-cursor="drag">
      <ul ref={track} className={styles.facts}>
        {[0, 1, 2].flatMap((copy) =>
          facts.map((f, i) => (
            <li key={`${copy}-${f}`} aria-hidden={copy !== 1 || undefined}>
              <span className={styles.factIndex}>[{pad(i + 1)}]</span>
              {f}
            </li>
          )),
        )}
      </ul>
    </div>
  );
}

/** External link button (checkout, WhatsApp): opens in a new tab. */
function Cta({ href, children, variant = "solid" }: { href: string; children: React.ReactNode; variant?: "solid" | "dark" }) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className={styles.cta} data-variant={variant}>
      <span className={styles.ctaDot} aria-hidden="true" />
      {children}
    </a>
  );
}

/** One FAQ entry; the answer opens with GSAP (height auto). */
function FaqItem({ q, a, open, onToggle, i }: { q: string; a: string; open: boolean; onToggle: () => void; i: number }) {
  const body = useRef<HTMLDivElement>(null);
  const first = useRef(true);
  useEffect(() => {
    const el = body.current;
    if (!el) return;
    if (first.current) {
      first.current = false;
      gsap.set(el, { height: open ? "auto" : 0 });
      return;
    }
    gsap.to(el, { height: open ? "auto" : 0, duration: 0.6, ease: "expo.out", overwrite: true });
  }, [open]);
  return (
    <div className={styles.faqItem} data-open={open || undefined}>
      <button type="button" className={styles.faqQ} aria-expanded={open} aria-controls={`faq-${i}`} onClick={onToggle}>
        <span className={styles.faqIndex}>[{pad(i + 1)}]</span>
        <span className={styles.faqText}>{q}</span>
        <Plus aria-hidden="true" className={styles.faqIcon} strokeWidth={2} />
      </button>
      <div ref={body} id={`faq-${i}`} className={styles.faqA} role="region">
        <p>{a}</p>
      </div>
    </div>
  );
}

export default function Course() {
  // Course text in the current language (written in PT; EN from src/content/en.ts).
  const COURSE = useTr(COURSE_SRC);
  const t = useT();
  const root = useRef<HTMLElement>(null);
  const [playing, setPlaying] = useState<Work | null>(null);
  const [faqOpen, setFaqOpen] = useState(0);
  const opener = useRef<HTMLElement | null>(null);

  const play = useCallback((work: Work, origin: HTMLElement) => {
    opener.current = origin;
    setPlaying(work);
  }, []);
  const closePlayer = useCallback(() => {
    setPlaying(null);
    opener.current?.focus({ preventScroll: true });
  }, []);

  // Reveals: titles and blocks rise and fade in as they enter (once).
  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        const items = gsap.utils.toArray<HTMLElement>("[data-rise]");
        gsap.set(items, { opacity: 0, y: 40 });
        ScrollTrigger.batch(items, {
          start: "top 90%",
          once: true,
          onEnter: (batch) =>
            gsap.to(batch, { opacity: 1, y: 0, duration: 1.1, ease: "expo.out", stagger: 0.08, overwrite: true, clearProps: "transform,translate,rotate,scale" }),
        });
        // Hero title words on load.
        gsap.fromTo(
          "[data-hero-word]",
          { yPercent: 40, opacity: 0 },
          { yPercent: 0, opacity: 1, duration: 1.4, ease: "expo.out", stagger: 0.1, delay: 0.15 },
        );
      });
      return () => mm.revert();
    },
    { scope: root },
  );

  const { hero, modules, offer, projects, pitch, testimonials, lessons, mentor, faq, contact } = COURSE;

  return (
    <main ref={root} className={styles.page}>
      <div className={styles.guides} aria-hidden="true">
        <span />
        <span />
        <span />
        <span />
      </div>

      {/* ---------- Top bar ---------- */}
      <header className={styles.top}>
        {/* A full page load on purpose: it runs the cross-document view transition. */}
        {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
        <a href="/" className={styles.back}>
          <ArrowLeft aria-hidden="true" strokeWidth={2} />
          dario.motion
        </a>
        <Image src={COURSE.logo.src} alt="Motion Pro" width={COURSE.logo.width} height={COURSE.logo.height} className={styles.topLogo} priority />
        <div className={styles.topRight}>
          <LangSwitch className={styles.langSwitch} />
          <a href={COURSE.checkout} target="_blank" rel="noopener noreferrer" className={styles.topCta}>
            {t("Garantir vaga")}
          </a>
        </div>
      </header>

      {/* ---------- Hero ---------- */}
      <div className={styles.heroArt} aria-hidden="true" style={{ backgroundImage: `url(${COURSE.art})` }} />
      <section className={styles.hero} aria-labelledby="course-title">
        <div className={styles.heroHead}>
          <p className={styles.label}>{hero.label}</p>
          <h1 id="course-title" className={styles.heroTitle}>
            <span data-hero-word>{hero.titleTop}</span>
            <span data-hero-word className={styles.accent}>
              {hero.titleAccent}
            </span>
          </h1>
        </div>
        <div className={styles.heroText}>
          <p className={styles.lead} data-rise>
            {hero.text}
          </p>
          <div data-rise>
            <Cta href={COURSE.checkout}>{hero.cta}</Cta>
          </div>
        </div>

        <button
          type="button"
          className={styles.heroVideo}
          data-cursor="view"
          data-rise
          aria-label="Assistir o vídeo do curso com som"
          onClick={(e) =>
            play(
              { id: "course-ad", title: "Motion Pro", meta: "Curso de After Effects", preview: "", poster: hero.video.poster, video: hero.video.full, hasAudio: true },
              e.currentTarget,
            )
          }
        >
          <Loop src={hero.video.loop} poster={hero.video.poster} />
          <span className={styles.videoLabel}>{t("Preview · Loop")}</span>
          <span className={styles.playBadge}>
            <Play aria-hidden="true" strokeWidth={2.5} />
            {t("Assistir com som")}
          </span>
        </button>
      </section>

      {/* ---------- Facts strip ---------- */}
      <div data-rise>
        <FactsStrip facts={COURSE.facts} />
      </div>

      {/* ---------- Modules ---------- */}
      <section className={styles.block} aria-labelledby="modules-title">
        <p className={styles.label}>{t("[ Conteúdo ]")}</p>
        <h2 id="modules-title" className={styles.title} data-rise>
          {modules.title}
        </h2>
        <p className={styles.sub} data-rise>
          {modules.text}
        </p>
        <div className={styles.modules}>
          {modules.list.map((m, mi) => {
            const start = modules.list.slice(0, mi).reduce((n, x) => n + x.lessons.length, 0);
            return (
              <article
                key={mi}
                className={styles.module}
                data-rise
                onMouseEnter={(e) => e.currentTarget.querySelector("video")?.play().catch(() => {})}
                onMouseLeave={(e) => {
                  const v = e.currentTarget.querySelector("video");
                  if (v) {
                    v.pause();
                    v.currentTime = 0;
                  }
                }}
              >
                <div className={styles.moduleImage}>
                  <video src={m.video} poster={m.poster} muted loop playsInline preload="metadata" aria-hidden="true" />
                </div>
                <div className={styles.moduleHead}>
                  <span className={styles.label}>{t("[ Módulo ]")}</span>
                  <span className={styles.moduleNum}>{pad(mi + 1)}</span>
                </div>
                <ol className={styles.lessons}>
                  {m.lessons.map((l, li) => (
                    <li key={l}>
                      <span className={styles.lessonNum}>{pad(start + li + 1)}</span>
                      {l}
                    </li>
                  ))}
                </ol>
                {m.note && <p className={styles.moduleNote}>{m.note}</p>}
              </article>
            );
          })}
        </div>
      </section>

      {/* ---------- Offer ---------- */}
      <section className={styles.block} aria-labelledby="offer-title">
        <p className={styles.label}>{t("[ Inclui ]")}</p>
        <h2 id="offer-title" className={styles.title} data-rise>
          {offer.title}
        </h2>
        <div className={styles.offer}>
          {offer.items.map((o, i) => (
            <article key={o.title} className={styles.offerItem} data-rise data-bonus={o.title.startsWith("+") || undefined}>
              <span className={styles.offerIndex}>[{pad(i + 1)}]</span>
              <h3 className={styles.offerTitle}>{o.title}</h3>
              <p className={styles.offerText}>{o.text}</p>
            </article>
          ))}
        </div>
      </section>

      {/* ---------- Projects ---------- */}
      <section className={styles.split} aria-labelledby="projects-title">
        <div className={styles.splitMedia} data-rise>
          <Loop src={projects.video.src} poster={projects.video.poster} />
          <span className={styles.videoLabel}>{t("Projetos · Loop")}</span>
        </div>
        <div className={styles.splitText}>
          <p className={styles.label}>{t("[ Na prática ]")}</p>
          <h2 id="projects-title" className={styles.title} data-rise>
            {projects.title}
          </h2>
          <p className={styles.body} data-rise>
            {projects.text}
          </p>
          <ul className={styles.projectList} data-rise>
            {projects.list.map((p, i) => (
              <li key={p}>
                <span className={styles.factIndex}>[{pad(i + 1)}]</span>
                {p}
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* ---------- Pitch (violet sheet) ---------- */}
      <section className={styles.pitch} aria-labelledby="pitch-title" style={{ backgroundImage: `url(${COURSE.art})` }}>
        <h2 id="pitch-title" className={styles.pitchTitle} data-rise>
          {pitch.title}
        </h2>
        <p className={styles.pitchText} data-rise>
          {pitch.text}
        </p>
        <div className={styles.pitchRow} data-rise>
          <div className={styles.price} aria-label={`De ${pitch.price.from} por ${pitch.price.installments} de R$ ${pitch.price.whole}${pitch.price.cents}, ${pitch.price.cash}`}>
            <s className={styles.priceFrom}>{pitch.price.from}</s>
            <div>
            <div className={styles.priceNow}>
              <span className={styles.priceStack}>
                <small>{pitch.price.installments}</small>
                R$
              </span>
              <strong>{pitch.price.whole}</strong>
              <span className={styles.priceCents}>{pitch.price.cents}</span>
            </div>
            <p className={styles.priceCash}>{pitch.price.cash}</p>
            </div>
          </div>
          <div className={styles.pitchBuy}>
            <a href={COURSE.checkout} target="_blank" rel="noopener noreferrer" className={styles.bigCta}>
              {pitch.cta}
              <ArrowRight aria-hidden="true" strokeWidth={2.5} />
            </a>
            <p className={styles.payment}>{pitch.payment} · {t("7 dias de garantia")}</p>
          </div>
        </div>
      </section>

      {/* ---------- Testimonials ---------- */}
      <section className={styles.block} aria-labelledby="test-title">
        <p className={styles.label}>{t("[ Depoimentos ]")}</p>
        <h2 id="test-title" className={styles.title} data-rise>
          {testimonials.title}
        </h2>
        <div className={styles.quotes}>
          {testimonials.list.map((t) => (
            <figure key={t.name} className={styles.quote} data-rise>
              <blockquote>“{t.quote}”</blockquote>
              <figcaption>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img className={styles.avatar} src={t.photo} alt="" width={56} height={56} loading="lazy" />
                <span>
                  <strong>{t.name}</strong>
                  <em>{t.role}</em>
                </span>
              </figcaption>
            </figure>
          ))}
        </div>
      </section>

      {/* ---------- Lesson clips ---------- */}
      <section className={styles.block} aria-labelledby="lessons-title">
        <p className={styles.label}>{t("[ Aulas ]")}</p>
        <h2 id="lessons-title" className={styles.title} data-rise>
          {lessons.title}
        </h2>
        <button
          type="button"
          className={styles.bigVideo}
          data-cursor="view"
          data-rise
          aria-label="Assistir trechos das aulas"
          onClick={(e) =>
            play(
              { id: "course-lessons", title: "Trechos das aulas", meta: "Motion Pro", preview: "", poster: lessons.video.poster, video: lessons.video.src, hasAudio: true },
              e.currentTarget,
            )
          }
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={lessons.video.poster} alt="" width={1280} height={720} loading="lazy" />
          <span className={styles.playBadge}>
            <Play aria-hidden="true" strokeWidth={2.5} />
            {t("Assistir trechos")}
          </span>
        </button>
      </section>

      {/* ---------- Mentor ---------- */}
      <section className={styles.mentor} aria-labelledby="mentor-title">
        <div className={styles.mentorPhoto} data-rise>
          <Image src={mentor.photo.src} alt="Miguel Dario" width={mentor.photo.width} height={mentor.photo.height} sizes="(max-width: 767px) 60vw, 280px" />
        </div>
        <div className={styles.splitText}>
          <p className={styles.label}>{t("[ Mentor ]")}</p>
          <h2 id="mentor-title" className={styles.title} data-rise>
            {mentor.title}
          </h2>
          {mentor.paragraphs.map((p, i) => (
            <p key={p} className={i === mentor.paragraphs.length - 1 ? styles.punch : styles.body} data-rise>
              {p}
            </p>
          ))}
        </div>
      </section>

      {/* ---------- FAQ ---------- */}
      <section className={styles.block} aria-labelledby="faq-title">
        <p className={styles.label}>{t("[ FAQ ]")}</p>
        <h2 id="faq-title" className={styles.title} data-rise>
          {faq.title}
        </h2>
        <div className={styles.faq} data-rise>
          {faq.list.map((f, i) => (
            <FaqItem key={f.q} q={f.q} a={f.a} i={i} open={faqOpen === i} onToggle={() => setFaqOpen((o) => (o === i ? -1 : i))} />
          ))}
        </div>
      </section>

      {/* ---------- Contact ---------- */}
      <section className={styles.contact} aria-labelledby="contact-title">
        <h2 id="contact-title" className={styles.title} data-rise>
          {contact.title}
        </h2>
        <p className={styles.sub} data-rise>
          {contact.text}
        </p>
        <div className={styles.contactRow} data-rise>
          <Cta href={COURSE.whatsapp}>{contact.cta}</Cta>
          <Cta href={COURSE.checkout} variant="dark">
            {pitch.cta}
          </Cta>
        </div>
        {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
        <a href="/" className={styles.footBack}>
          <ArrowLeft aria-hidden="true" strokeWidth={2} />
          {t("Voltar ao portfólio")}
        </a>
      </section>

      <WorkPlayer work={playing} onClose={closePlayer} origin={opener} />
    </main>
  );
}
