import type { Metadata } from "next";
import "./globals.css";
import "leaflet/dist/leaflet.css";
import { AuthProvider } from "@/components/AuthProvider";

export const metadata: Metadata = {
  title: "FanMatch — Find the best place to watch the match",
  description:
    "Discover bars, pubs, fan zones, and viewing parties near you, ranked by atmosphere, team support, and fan engagement.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
