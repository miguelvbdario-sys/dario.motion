import localFont from "next/font/local";
import { Inter, JetBrains_Mono } from "next/font/google";

// Display — Tusker Grotesk 6800 Super
export const tusker = localFont({
  src: "../../public/fonts/TuskerGrotesk-6800Super.otf",
  variable: "--font-tusker",
  weight: "800",
  display: "swap",
  fallback: ["Impact", "Haettenschweiler", "Arial Narrow Bold", "sans-serif"],
});

// Handwritten accents — Wildest Metallo Brush (Persona). NOTE: demo build, check license before launch.
export const wildest = localFont({
  src: "../../public/fonts/WildestMetalloBrushDEMO.otf",
  variable: "--font-wildest",
  weight: "400",
  display: "swap",
  fallback: ["Brush Script MT", "cursive"],
});

// UI / Body — Inter (Black 900, Bold 700, Regular 400)
export const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "700", "900"],
  variable: "--font-inter",
  display: "swap",
});

// Mono — labels, counts and readouts (BROADCAST cards).
export const mono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400"],
  variable: "--font-jetbrains",
  display: "swap",
});
