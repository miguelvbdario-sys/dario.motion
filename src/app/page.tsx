import Hero from "@/components/hero/Hero";
import Broadcast from "@/components/broadcast/Broadcast";
import WorksCarousel from "@/components/works-carousel/WorksCarousel";
import About from "@/components/about/About";
import Timeline from "@/components/timeline/Timeline";

export default function Home() {
  return (
    <main>
      {/* First portrait frame, fetched before the scripts run. Queries mirror Hero.module.css. */}
      <link
        rel="preload"
        as="image"
        href="/sequence/hero-look/LOOK_049.webp"
        media="(min-width: 768px) and (min-aspect-ratio: 751/1000)"
        fetchPriority="high"
      />
      <link
        rel="preload"
        as="image"
        href="/sequence/hero-look-720/LOOK_049.webp"
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

      {/* Scroll progress as an After Effects timeline, with section markers (and back to top on phones). */}
      <Timeline />
    </main>
  );
}
