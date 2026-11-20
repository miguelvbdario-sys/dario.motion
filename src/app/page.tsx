import Hero from "@/components/hero/Hero";
import Broadcast from "@/components/broadcast/Broadcast";
import WorksCarousel from "@/components/works-carousel/WorksCarousel";
import About from "@/components/about/About";

export default function Home() {
  return (
    <main>
      {/* First portrait frame, fetched before the scripts run. Queries mirror Hero.module.css. */}
      <link
        rel="preload"
        as="image"
        href="/sequence/hero-test/VIDEO-HEAD_000.webp" /* HEAD_VARIANT test; original: /sequence/hero/ */
        media="(min-width: 768px) and (min-aspect-ratio: 751/1000)"
        fetchPriority="high"
      />
      <link
        rel="preload"
        as="image"
        href="/sequence/hero-test-720/VIDEO-HEAD_000.webp" /* original: /sequence/hero-720/ */
        media="(max-width: 767px), (max-aspect-ratio: 3/4)"
        fetchPriority="high"
      />

      <Hero />
      {/* Broadcast projects (the interactive scoreboard lives in the Paulistão card). */}
      <Broadcast />
      {/* Works: the side-scrolling carousel of cards. */}
      <WorksCarousel />

      {/* About: portrait, intro and contact buttons. */}
      <About />
    </main>
  );
}
