import type { Metadata } from "next";
import "./globals.css";
import "leaflet/dist/leaflet.css";
import { AuthProvider } from "@/components/AuthProvider";
import { Analytics } from "@/components/Analytics";
import { JsonLd } from "@/components/JsonLd";
import { siteUrl, websiteLd } from "@/lib/seo";

export const metadata: Metadata = {
  // Absolute base so canonical/OG URLs on every page resolve correctly.
  metadataBase: new URL(siteUrl()),
  title: "FanWatch — Find the best place to watch the match",
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
    <html lang="en">
      <head>
        {/* Editorial display serif (Claude-style). Loaded as a plain stylesheet
            link so it enhances when online and falls back to a warm system
            serif otherwise — no build-time font dependency. */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,500;9..144,600;9..144,700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <JsonLd data={websiteLd()} />
        <AuthProvider>{children}</AuthProvider>
        <Analytics />
      </body>
    </html>
  );
}
