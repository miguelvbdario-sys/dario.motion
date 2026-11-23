import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

// Share card (WhatsApp, Instagram, X…): the pixel head over the red glow, the name in Tusker.
export const alt = "Miguel Dario — Senior Motion Designer";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image() {
  const [tusker, head] = await Promise.all([
    readFile(join(process.cwd(), "public/fonts/TuskerGrotesk-6800Super.otf")),
    readFile(join(process.cwd(), "src/assets/og-head.png")),
  ]);
  const headSrc = `data:image/png;base64,${head.toString("base64")}`;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          position: "relative",
          background: "radial-gradient(60% 80% at 62% 60%, #8a0a10 0%, #3a0010 45%, #000 85%)",
          color: "#efeeee",
          fontFamily: "Tusker",
        }}
      >
        <div
          style={{
            position: "absolute",
            left: 56,
            right: 56,
            top: 70,
            display: "flex",
            justifyContent: "space-between",
            fontSize: 140,
            letterSpacing: 5,
            lineHeight: 1,
          }}
        >
          <span>MIGUEL</span>
          <span>DARIO</span>
        </div>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={headSrc} width={520} height={520} style={{ position: "absolute", left: 340, top: 110 }} alt="" />
        <div
          style={{
            position: "absolute",
            left: 60,
            bottom: 48,
            display: "flex",
            padding: "6px 22px",
            borderRadius: 999,
            background: "#fbcb09",
            color: "#140006",
            fontSize: 44,
            letterSpacing: 2,
          }}
        >
          SENIOR MOTION DESIGNER
        </div>
      </div>
    ),
    { ...size, fonts: [{ name: "Tusker", data: tusker, weight: 800, style: "normal" }] },
  );
}
