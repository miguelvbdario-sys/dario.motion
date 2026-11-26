import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Dev only: lets a phone on the same Wi-Fi load the dev server (http://<PC IP>:3000).
  // Tailscale (private network between your devices): 100.x addresses and *.ts.net names.
  allowedDevOrigins: ["192.168.*.*", "10.*.*.*", "100.*.*.*", "**.ts.net"],
  cacheComponents: true,
  // Basic protection headers on every page (no visual effect):
  // no framing by other sites, no MIME sniffing, a short referrer, no camera/mic/location.
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Content-Security-Policy", value: "frame-ancestors 'none'" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        ],
      },
    ];
  },
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        // Tailwind handles the global stylesheets. CSS Modules skip this rule:
        // its `as: "*.css"` would turn them into plain global CSS.
        condition: { not: { path: /\.module\.css$/ } },
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
