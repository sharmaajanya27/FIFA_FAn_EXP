/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Expose server-only env vars to SSG/SSR code. NEXT_PUBLIC_* vars are only
  // for client bundles; these need explicit forwarding.
  env: {
    BACKEND_URL: process.env.BACKEND_URL || process.env.NEXT_PUBLIC_API_BASE || "http://localhost:3001",
    SERVER_AUTH_SECRET: process.env.SERVER_AUTH_SECRET || "",
  },
  // Proxy API requests to the backend server (avoids mixed-content HTTPS→HTTP
  // and eliminates CORS entirely). In production the browser only talks to the
  // same HTTPS origin; Next.js forwards requests server-side.
  async rewrites() {
    const backend = process.env.BACKEND_URL || "http://localhost:3001";
    return [
      {
        source: "/_api/:path*",
        destination: `${backend}/:path*`,
      },
    ];
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "X-Frame-Options",
            value: "DENY",
          },
          {
            key: "X-XSS-Protection",
            value: "1; mode=block",
          },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=(self)",
          },
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload",
          },
          {
            key: "Content-Security-Policy",
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
              "font-src 'self' https://fonts.gstatic.com",
              // MapLibre GL renders tiles on a Web Worker created from a blob URL.
              "worker-src 'self' blob:",
              "child-src 'self' blob:",
              "img-src 'self' data: blob: https://*.tile.openstreetmap.org https://*.openstreetmap.org " +
                (process.env.NEXT_PUBLIC_MAP_ORIGIN || ""),
              "connect-src 'self' " +
                (process.env.NEXT_PUBLIC_SUPABASE_URL || "https://*.supabase.co") +
                " https://*.protomaps.com https://protomaps.github.io " +
                (process.env.NEXT_PUBLIC_MAP_ORIGIN || ""),
              "frame-ancestors 'none'",
              "base-uri 'self'",
              "form-action 'self'",
            ].join("; "),
          },
        ],
      },
    ];
  },
};

export default nextConfig;
