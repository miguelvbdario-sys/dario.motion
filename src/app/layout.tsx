import type { Metadata, Viewport } from "next";
import "lenis/dist/lenis.css";
import "./globals.css";
import { inter, mono, tusker, wildest } from "./fonts";
import SmoothScroll from "@/components/providers/SmoothScroll";
import CustomCursor from "@/components/cursor/CustomCursor";
import CrtScreen from "@/components/crt/CrtScreen";
import LiteWatch from "@/components/providers/LiteWatch";
import Effects from "@/components/effects/Effects";
import { SITE, SITE_URL } from "@/lib/site";
import { LangProvider } from "@/lib/i18n";
import CalmRemount from "@/components/providers/CalmRemount";
import { CALM_BOOT } from "@/lib/calmBoot";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: "Miguel Dario — Senior Motion Designer",
  description: SITE.description,
  openGraph: {
    type: "website",
    title: "Miguel Dario — Senior Motion Designer",
    description: SITE.description,
    siteName: "Miguel Dario",
  },
  twitter: { card: "summary_large_image" },
};

/** Browser UI (address bar on phones) matches the black page. */
export const viewport: Viewport = {
  themeColor: "#000000",
  colorScheme: "dark",
};

/** Structured data: tells search engines who the site is about. */
const PERSON_LD = {
  "@context": "https://schema.org",
  "@type": "Person",
  name: SITE.name,
  jobTitle: SITE.role,
  url: SITE_URL,
  sameAs: [SITE.instagram],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      // data-calm / data-lite / data-loaded are set by script before React hydrates.
      suppressHydrationWarning
      className={`${inter.variable} ${mono.variable} ${tusker.variable} ${wildest.variable} antialiased`}
    >
      <body>
        {/* A reload always starts at the top (the hero): run before anything paints,
            or Chrome restores the old scroll position first. */}
        <script
          dangerouslySetInnerHTML={{
            __html: `try{history.scrollRestoration="manual";if(!location.hash)window.scrollTo(0,0)}catch(e){}` + CALM_BOOT,
          }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(PERSON_LD).replace(/</g, "\\u003c") }}
        />
        {/* Keyboard users can jump past the hero straight to the work. */}
        <a href="#broadcast" className="skip-link">
          Skip to the work
        </a>
        {/* The hero intro starts hidden and is revealed by script; without scripts, show it as is. */}
        <noscript>
          <style>{`[data-reveal],[data-word],[data-head]{opacity:1!important}`}</style>
        </noscript>
        <LangProvider>
          <SmoothScroll>
            <CalmRemount>{children}</CalmRemount>
          </SmoothScroll>
        </LangProvider>
        <CrtScreen />
        <LiteWatch />
        <CustomCursor />
        {/* Magnetic buttons and decoding labels. */}
        <Effects />
      </body>
    </html>
  );
}
