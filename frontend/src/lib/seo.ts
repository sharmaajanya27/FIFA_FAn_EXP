/**
 * SEO helpers shared by the server-rendered landing pages: canonical URL
 * construction, Next `Metadata` builders, and schema.org JSON-LD builders.
 *
 * The site origin comes from NEXT_PUBLIC_SITE_URL (placeholder default until a
 * production domain is wired). It must be absolute so canonical/OG tags and the
 * sitemap resolve correctly.
 */
import type { Metadata } from "next";
import type { VenueDetail } from "./types";

const DEFAULT_SITE_URL = "https://fanwatch.app";

export function siteUrl(): string {
  return (process.env.NEXT_PUBLIC_SITE_URL ?? DEFAULT_SITE_URL).replace(/\/+$/, "");
}

export function absoluteUrl(path = "/"): string {
  return siteUrl() + (path.startsWith("/") ? path : `/${path}`);
}

/** Canonical URL shapes — the single source of truth for internal links. */
export const paths = {
  home: () => "/",
  watchIndex: () => "/watch",
  city: (slug: string) => `/watch/${slug}`,
  cityTeam: (slug: string, teamCode: string) => `/watch/${slug}/${teamCode.toLowerCase()}`,
  venue: (citySlug: string, id: string) => `/venue/${citySlug}/${encodeURIComponent(id)}`,
};

interface MetaInput {
  title: string;
  description: string;
  path: string;
  /** Thin/duplicate pages set this to keep them out of the index (still followed). */
  noindex?: boolean;
}

export function buildMetadata({ title, description, path, noindex }: MetaInput): Metadata {
  const url = absoluteUrl(path);
  return {
    title,
    description,
    alternates: { canonical: url },
    robots: noindex ? { index: false, follow: true } : undefined,
    openGraph: {
      title,
      description,
      url,
      siteName: "FanWatch",
      type: "website",
    },
    twitter: { card: "summary_large_image", title, description },
  };
}

// ---- JSON-LD builders (schema.org) ----
type Ld = Record<string, unknown>;

export function websiteLd(): Ld {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "FanWatch",
    url: siteUrl(),
    description: "Find the best place to watch the match.",
  };
}

export function breadcrumbLd(items: { name: string; path: string }[]): Ld {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((it, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: it.name,
      item: absoluteUrl(it.path),
    })),
  };
}

export function itemListLd(items: { name: string; path: string }[]): Ld {
  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    itemListElement: items.map((it, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: it.name,
      url: absoluteUrl(it.path),
    })),
  };
}

export function faqLd(items: { q: string; a: string }[]): Ld {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map((it) => ({
      "@type": "Question",
      name: it.q,
      acceptedAnswer: { "@type": "Answer", text: it.a },
    })),
  };
}

const VENUE_LD_TYPE: Record<string, string> = {
  bar: "BarOrPub",
  pub: "BarOrPub",
  restaurant: "Restaurant",
  cafe: "CafeOrCoffeeShop",
};

/** schema.org LocalBusiness for a venue, with rating only when a count exists. */
export function venueLd(
  venue: VenueDetail,
  path: string,
  rating?: { value: number; count: number },
): Ld {
  const ld: Ld = {
    "@context": "https://schema.org",
    "@type": VENUE_LD_TYPE[venue.kind] ?? "LocalBusiness",
    name: venue.name,
    url: absoluteUrl(path),
  };
  if (venue.address || venue.city) {
    ld.address = {
      "@type": "PostalAddress",
      ...(venue.address ? { streetAddress: venue.address } : {}),
      ...(venue.city ? { addressLocality: venue.city } : {}),
      ...(venue.country ? { addressCountry: venue.country } : {}),
    };
  }
  if (venue.geo) {
    ld.geo = {
      "@type": "GeoCoordinates",
      latitude: venue.geo.lat,
      longitude: venue.geo.lon,
    };
  }
  if (venue.phone) ld.telephone = venue.phone;
  if (venue.hours) ld.openingHours = venue.hours;
  if (venue.website) ld.sameAs = [venue.website];
  // Google requires a count alongside the value, else it flags the rating.
  if (rating && rating.count > 0) {
    ld.aggregateRating = {
      "@type": "AggregateRating",
      ratingValue: Number(rating.value.toFixed(1)),
      reviewCount: rating.count,
      bestRating: 5,
      worstRating: 1,
    };
  }
  return ld;
}
