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
      <body>
        <JsonLd data={websiteLd()} />
        <AuthProvider>{children}</AuthProvider>
        <Analytics />
      </body>
    </html>
  );
}
