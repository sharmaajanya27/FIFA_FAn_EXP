import type { Metadata } from "next";

// Keep the admin surface out of search indexes (robots.ts also disallows it).
// This server-component layout carries the metadata; the page itself is a
// client component (needs the bearer token), which can't export metadata.
export const metadata: Metadata = {
  title: "Admin · FanWatch",
  robots: { index: false, follow: false },
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
