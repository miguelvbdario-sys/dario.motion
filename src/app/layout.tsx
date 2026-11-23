import type { Metadata } from "next";
import "lenis/dist/lenis.css";
import "./globals.css";
import { inter, mono, tusker, wildest } from "./fonts";
import SmoothScroll from "@/components/providers/SmoothScroll";
import CustomCursor from "@/components/cursor/CustomCursor";
import CrtScreen from "@/components/crt/CrtScreen";
import { SITE, SITE_URL } from "@/lib/site";

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
      className={`${inter.variable} ${mono.variable} ${tusker.variable} ${wildest.variable} antialiased`}
    >
      <body>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(PERSON_LD).replace(/</g, "\\u003c") }}
        />
        {/* The hero intro starts hidden and is revealed by script; without scripts, show it as is. */}
        <noscript>
          <style>{`[data-reveal],[data-word],[data-head],[data-vline],[data-hline],[data-mark]{opacity:1!important}`}</style>
        </noscript>
        <SmoothScroll>{children}</SmoothScroll>
        <CrtScreen />
        <CustomCursor />
      </body>
    </html>
  );
}
