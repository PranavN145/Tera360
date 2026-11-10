import path from "path";
import type { NextConfig } from "next";

const cspHeader = `
  default-src 'self';
  script-src 'self' 'unsafe-eval' 'unsafe-inline' https://api.mapbox.com https://challenges.cloudflare.com;
  style-src 'self' 'unsafe-inline' https://api.mapbox.com;
  img-src 'self' blob: data: https://api.mapbox.com https://*.tiles.mapbox.com;
  font-src 'self' data: https://api.mapbox.com;
  connect-src 'self' http://localhost:5000 http://127.0.0.1:5000 https://tera360.onrender.com https://api.mapbox.com https://*.tiles.mapbox.com https://events.mapbox.com https://challenges.cloudflare.com;
  worker-src 'self' blob:;
  child-src blob: https://challenges.cloudflare.com;
  frame-src 'self' https://challenges.cloudflare.com;
  object-src 'none';
  base-uri 'self';
  form-action 'self';
`.replace(/\s{2,}/g, " ").trim();

const nextConfig: NextConfig = {
  /* config options here */
  cacheComponents: true,
  partialPrefetching: true,
  turbopack: {
    root: path.resolve(__dirname),
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: "http://127.0.0.1:5000/api/:path*",
      },
    ];
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          {
            key: "Content-Security-Policy",
            value: cspHeader,
          },
          {
            key: "X-Frame-Options",
            value: "SAMEORIGIN",
          },
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=(self)",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
