/*
 * ABOUT (#about): portrait, intro text and the two buttons.
 * The first paragraph is the lead (Inter Black); the others are Inter Regular.
 */

export const ABOUT = {
  label: "[ 01 ] Profile",
  /** Big Wildest script behind the photo. */
  name: "Miguel Dario",
  photo: { src: "/about/miguel-portrait.webp", alt: "Portrait of Miguel Dario", width: 1080, height: 1000 },
  lead: "I am a Motion Designer with focus on sports, with 8 years of experience shaping high-impact motion visuals.",
  paragraphs: [
    "I also mentor over 100 students through the Motion Pro course.",
  ],
  buttons: [
    // "#contact" opens the WhatsApp / e-mail pop-up (ContactButton.tsx).
    { label: "Contact me", href: "#contact" },
    { label: "Access Instagram", href: "https://www.instagram.com/dario.motion/" },
    { label: "Course page", href: "/course" },
  ],
};
