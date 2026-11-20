import type { Metadata } from "next";
import "lenis/dist/lenis.css";
import "./globals.css";
import { inter, mono, tusker, wildest } from "./fonts";
import SmoothScroll from "@/components/providers/SmoothScroll";
import CustomCursor from "@/components/cursor/CustomCursor";
import CrtScreen from "@/components/crt/CrtScreen";

export const metadata: Metadata = {
  title: "Miguel Dario — Senior Motion Designer",
  description: "Portfolio of Miguel Dario (@dario.motion), Senior Motion Designer.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${mono.variable} ${tusker.variable} ${wildest.variable} antialiased`}
    >
      <body>
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
