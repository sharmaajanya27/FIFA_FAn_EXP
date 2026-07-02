/** @type {import('next').NextConfig} */

// CSP connect-src is built from env so no origins are hardcoded. 'self' covers
// the same-origin /_api proxy; the Supabase origin (anonymous-auth token calls)
// is appended only when configured, keeping local dev tight.
const supabaseOrigin = process.env.NEXT_PUBLIC_SUPABASE_URL;
const connectSrc =
  typeof supabaseOrigin === "string" && supabaseOrigin.length > 0
    ? "'self' " + supabaseOrigin
    : "'self'";

const nextConfig = {
  reactStrictMode: true,
  // Expose server-only env vars to SSG/SSR code. NEXT_PUBLIC_* vars are only
  // for client bundles; these need explicit forwarding.
  //
  // SERVER_AUTH_SECRET must be listed here even though it's server-only:
  // Amplify's WEB_COMPUTE SSR runtime does not pass Console-configured
  // environment variables into the on-demand render Lambda's process.env
  // unless they're declared in this `env` map (confirmed empirically —
  // BACKEND_URL, which stays listed, resolves fine at runtime; when this var
  // was previously omitted, every on-demand-rendered page's server fetch got
  // a 401 from the API and silently 404'd). Client-bundle leakage is guarded
  // structurally instead: its only consumer, lib/server/fetchers.ts, imports
  // the `server-only` package, which fails the build if any Client Component
  // ever imports it.
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
              "img-src 'self' data: https://*.tile.openstreetmap.org https://*.openstreetmap.org https://a.espncdn.com",
              "connect-src " + connectSrc,
              "frame-ancestors 'none'",
              "base-uri 'self'",
              "form-action 'self'",
            ].join("; "),
          },
        ],
      },
    ];
  },
  // Allow slower API responses during SSG without failing the build.
  staticPageGenerationTimeout: 120,
};

export default nextConfig;
