import type { NextConfig } from "next";

const isDevelopment = process.env.NODE_ENV !== "production";

const contentSecurityPolicy = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDevelopment ? " 'unsafe-eval'" : ""} https://www.google.com/recaptcha/ https://www.gstatic.com/recaptcha/ https://apis.google.com`,
  // Google Translate can inject its stylesheet from gstatic. The app opts out
  // of page translation at the root; allowing this host only avoids a noisy
  // CSP violation if a browser extension still injects the stylesheet.
  "style-src 'self' 'unsafe-inline' https://www.gstatic.com",
  "img-src 'self' blob: data: https:",
  "font-src 'self' data:",
  `connect-src 'self'${isDevelopment ? " ws://localhost:* wss://localhost:*" : ""} https://*.googleapis.com https://*.firebaseio.com wss://*.firebaseio.com https://*.cloudfunctions.net https://www.google.com/recaptcha/`,
  "frame-src 'self' https://www.google.com/recaptcha/ https://recaptcha.google.com/recaptcha/",
  "worker-src 'self' blob:",
  "media-src 'self'",
  "manifest-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  ...(isDevelopment ? [] : ["upgrade-insecure-requests"]),
].join("; ");

const nextConfig: NextConfig = {
  /* config options here */
  cacheComponents: true,
  partialPrefetching: true,
  poweredByHeader: false,
  // The dev badge sits bottom-right and clipped the sidebar footer note.
  devIndicators: false,
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "Content-Security-Policy", value: contentSecurityPolicy },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
          { key: "Cross-Origin-Opener-Policy", value: "same-origin-allow-popups" },
          ...(isDevelopment
            ? []
            : [
                {
                  key: "Strict-Transport-Security",
                  value: "max-age=63072000; includeSubDomains; preload",
                },
              ]),
        ],
      },
    ];
  },
  experimental: {
    // Every page in this app is a client component (SPA port). Automatic
    // instant-navigation validation only produces false "dropped segment"
    // errors on client pages, so validate opted-in segments only.
    instantInsights: {
      validationLevel: "manual-warning",
    },
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
