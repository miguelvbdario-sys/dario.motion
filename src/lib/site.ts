/**
 * Public address of the site, used for absolute links (share image, sitemap,
 * robots). Set NEXT_PUBLIC_SITE_URL once the domain exists; on Vercel the
 * production URL is picked up automatically.
 */
export const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ??
  (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : "http://localhost:3000");

export const SITE = {
  name: "Miguel Dario",
  role: "Senior Motion Designer",
  description: "Portfolio of Miguel Dario (@dario.motion), Senior Motion Designer focused on sports and live broadcast graphics.",
  instagram: "https://www.instagram.com/dario.motion/",
};
