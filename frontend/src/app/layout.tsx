import type { Metadata } from "next";
import { Anton, Archivo, Newsreader } from "next/font/google";
import "./globals.css";
import "leaflet/dist/leaflet.css";
import { AuthProvider } from "@/components/AuthProvider";
import { Analytics } from "@/components/Analytics";
import { JsonLd } from "@/components/JsonLd";
import { SiteBanner } from "@/components/SiteBanner";
import { siteUrl, websiteLd } from "@/lib/seo";

// Self-hosted via next/font — no render-blocking request to Google's CDN, no
// layout shift (size-adjust fallback metrics are generated at build time), and
// nothing extra to allow in the CSP connect/style-src. Exposed as CSS variables
// consumed by globals.css: Anton = display, Archivo = UI/body, Newsreader =
// italic serif accents.
const anton = Anton({
  weight: "400",
  subsets: ["latin"],
  display: "swap",
  variable: "--font-display",
});
const archivo = Archivo({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-body",
});
const newsreader = Newsreader({
  subsets: ["latin"],
  style: ["normal", "italic"],
  display: "swap",
  variable: "--font-serif",
});

export const metadata: Metadata = {
  // Absolute base so canonical/OG URLs on every page resolve correctly.
  metadataBase: new URL(siteUrl()),
  title: "Tu Parea — Find the best place to watch the match",
  description:
    "Discover bars, pubs, fan zones, and viewing parties near you, ranked by atmosphere, team support, and fan engagement.",
  // Self-canonical for the homepage; query variants like /?city= dedupe to "/".
  // Child routes override this with their own canonical via buildMetadata().
  alternates: { canonical: "/" },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${anton.variable} ${archivo.variable} ${newsreader.variable}`}
    >
      <body>
        <JsonLd data={websiteLd()} />
        <AuthProvider>
          <SiteBanner />
          {children}
        </AuthProvider>
        <Analytics />
      </body>
    </html>
  );
}
