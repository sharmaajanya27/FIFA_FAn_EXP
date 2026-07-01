import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CITIES, cityBySlug } from "@/lib/cities";
import { teamByCode } from "@/lib/teams";
import {
  getCityVenues,
  getVenueEngagement,
  getVenueWithReviews,
} from "@/lib/server/fetchers";
import type { VenueDetail } from "@/lib/types";
import { breadcrumbLd, buildMetadata, paths, venueLd } from "@/lib/seo";
import { isSafeUrl } from "@/lib/security";
import { directionsUrl } from "@/lib/format";
import { SeoShell } from "@/components/seo/SeoShell";
import { Breadcrumbs } from "@/components/seo/Breadcrumbs";
import { JsonLd } from "@/components/JsonLd";
import { VenueEngagement } from "@/components/venue/VenueEngagement";
import styles from "@/components/seo/seo.module.css";

export const revalidate = 3600;
export const dynamicParams = true;

const KIND_LABEL: Record<string, string> = {
  bar: "Bar",
  pub: "Pub",
  restaurant: "Restaurant",
  cafe: "Café",
  fan_zone: "Fan zone",
};

/** A venue is worth indexing only when it carries real, useful detail. */
const isIndexable = (v: VenueDetail): boolean =>
  Boolean(
    v.name && v.address && (typeof v.ratingAvg === "number" || v.website),
  );

// Pre-render only a few high-traffic venues; the rest render on-demand (ISR)
// since dynamicParams=true and revalidate=3600 handle the long tail.
export async function generateStaticParams() {
  const TOP_CITIES = CITIES.slice(0, 3);
  const params: { city: string; id: string }[] = [];
  for (const c of TOP_CITIES) {
    const venues = await getCityVenues(c.slug, { limit: 4 });
    for (const v of venues) params.push({ city: c.slug, id: v.id });
  }
  return params;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ city: string; id: string }>;
}): Promise<Metadata> {
  const { city: citySlug, id } = await params;
  const city = cityBySlug(citySlug);
  const data = await getVenueWithReviews(citySlug, id);
  if (!city || !data) return {};
  const { venue } = data;
  const kind = KIND_LABEL[venue.kind] ?? "venue";
  return buildMetadata({
    title: `${venue.name} — Watch the World Cup in ${city.name} | Tu Parea`,
    description: `${venue.name} is a ${kind.toLowerCase()} in ${city.name} for watching FIFA World Cup 2026 matches.${venue.address ? ` ${venue.address}.` : ""} See hours, location, ratings, and live crowd levels.`,
    path: paths.venue(citySlug, venue.id),
    noindex: !isIndexable(venue),
  });
}

export default async function VenuePage({
  params,
}: {
  params: Promise<{ city: string; id: string }>;
}) {
  const { city: citySlug, id } = await params;
  const city = cityBySlug(citySlug);
  if (!city) notFound();
  const data = await getVenueWithReviews(citySlug, id);
  if (!data) notFound();
  const { venue } = data;
  const engagement = await getVenueEngagement(venue.id);

  const rating =
    engagement.reviews.averageRating != null
      ? {
          value: engagement.reviews.averageRating,
          count: engagement.reviews.count,
        }
      : undefined;
  const teams = venue.supportsTeams
    .map((c) => teamByCode(c))
    .filter((t): t is NonNullable<typeof t> => Boolean(t));

  const crumbs = [
    { name: "Home", path: "/" },
    { name: "Where to watch", path: paths.watchIndex() },
    { name: city.name, path: paths.city(citySlug) },
    { name: venue.name, path: paths.venue(citySlug, venue.id) },
  ];
  const ld = [
    breadcrumbLd(crumbs),
    venueLd(venue, paths.venue(citySlug, venue.id), rating),
  ];

  return (
    <SeoShell>
      <JsonLd data={ld} />
      <Breadcrumbs
        items={[
          { name: "Home", path: "/" },
          { name: "Where to watch", path: paths.watchIndex() },
          { name: city.name, path: paths.city(citySlug) },
          { name: venue.name },
        ]}
      />

      <section className={styles.hero}>
        <h1 className={styles.h1}>{venue.name}</h1>
        <p className={styles.lede}>
          {KIND_LABEL[venue.kind] ?? "Venue"} in {city.name} for watching the
          FIFA World Cup 2026.
          {typeof venue.ratingAvg === "number"
            ? ` Rated ${venue.ratingAvg.toFixed(1)}★ by fans.`
            : ""}
        </p>
      </section>

      <section className={styles.section}>
        <h2 className={styles.h2}>Details</h2>
        <div className={styles.prose}>
          {venue.address && (
            <p>
              <strong>Address:</strong> {venue.address}
              {venue.city ? `, ${venue.city}` : ""}
            </p>
          )}
          {venue.hours && (
            <p>
              <strong>Hours:</strong> {venue.hours}
            </p>
          )}
          {venue.phone && (
            <p>
              <strong>Phone:</strong> {venue.phone}
            </p>
          )}
          {venue.website && isSafeUrl(venue.website) && (
            <p>
              <strong>Website:</strong>{" "}
              <a
                href={venue.website}
                rel="nofollow noopener noreferrer"
                target="_blank"
              >
                {venue.website}
              </a>
            </p>
          )}
        </div>
      </section>

      {teams.length > 0 && (
        <section className={styles.section}>
          <h2 className={styles.h2}>Fan base</h2>
          <div className={styles.pills}>
            {teams.map((t) => (
              <Link
                key={t.code}
                href={paths.cityTeam(citySlug, t.code)}
                className={styles.pill}
              >
                <span>{t.flag}</span> {t.name}
              </Link>
            ))}
          </div>
        </section>
      )}

      <section className={styles.section}>
        <h2 className={styles.h2}>Who&apos;s here, the vibe &amp; reviews</h2>
        <VenueEngagement
          venueId={venue.id}
          initialPresence={engagement.presence}
          initialReviews={engagement.reviews}
        />
      </section>

      <section className={styles.section}>
        <div className={styles.directions}>
          <a
            href={directionsUrl(venue.geo.lat, venue.geo.lon, venue.name)}
            target="_blank"
            rel="noopener noreferrer"
            className={styles.cta}
          >
            Get directions →
          </a>
          <a
            href={`https://maps.apple.com/?daddr=${venue.geo.lat},${venue.geo.lon}&dirflg=d&t=m`}
            target="_blank"
            rel="noopener noreferrer"
            className={styles.ctaSecondary}
          >
            Open in Apple Maps
          </a>
        </div>
      </section>
    </SeoShell>
  );
}
