import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CITIES, cityBySlug } from "@/lib/cities";
import { teamByCode } from "@/lib/teams";
import { getCityVenues, getVenueWithReviews } from "@/lib/server/fetchers";
import type { VenueDetail } from "@/lib/types";
import { breadcrumbLd, buildMetadata, paths, venueLd } from "@/lib/seo";
import { SeoShell } from "@/components/seo/SeoShell";
import { Breadcrumbs } from "@/components/seo/Breadcrumbs";
import { JsonLd } from "@/components/JsonLd";
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
  Boolean(v.name && v.address && (typeof v.ratingAvg === "number" || v.website));

// Pre-render the top few venues per city; the long tail renders on demand (ISR).
export async function generateStaticParams() {
  const params: { city: string; id: string }[] = [];
  for (const c of CITIES) {
    const venues = await getCityVenues(c.slug, { limit: 8 });
    for (const v of venues) params.push({ city: c.slug, id: v.id });
  }
  return params;
}

export async function generateMetadata({
  params,
}: {
  params: { city: string; id: string };
}): Promise<Metadata> {
  const city = cityBySlug(params.city);
  const data = await getVenueWithReviews(params.city, params.id);
  if (!city || !data) return {};
  const { venue } = data;
  const kind = KIND_LABEL[venue.kind] ?? "venue";
  return buildMetadata({
    title: `${venue.name} — Watch the World Cup in ${city.name} | FanWatch`,
    description: `${venue.name} is a ${kind.toLowerCase()} in ${city.name} for watching FIFA World Cup 2026 matches.${venue.address ? ` ${venue.address}.` : ""} See hours, location, ratings, and live crowd levels.`,
    path: paths.venue(params.city, venue.id),
    noindex: !isIndexable(venue),
  });
}

export default async function VenuePage({
  params,
}: {
  params: { city: string; id: string };
}) {
  const city = cityBySlug(params.city);
  if (!city) notFound();
  const data = await getVenueWithReviews(params.city, params.id);
  if (!data) notFound();
  const { venue, reviews } = data;

  const rating =
    reviews.averageRating != null
      ? { value: reviews.averageRating, count: reviews.count }
      : undefined;
  const teams = venue.supportsTeams
    .map((c) => teamByCode(c))
    .filter((t): t is NonNullable<typeof t> => Boolean(t));

  const crumbs = [
    { name: "Home", path: "/" },
    { name: "Where to watch", path: paths.watchIndex() },
    { name: city.name, path: paths.city(params.city) },
    { name: venue.name, path: paths.venue(params.city, venue.id) },
  ];
  const ld = [
    breadcrumbLd(crumbs),
    venueLd(venue, paths.venue(params.city, venue.id), rating),
  ];

  return (
    <SeoShell>
      <JsonLd data={ld} />
      <Breadcrumbs
        items={[
          { name: "Home", path: "/" },
          { name: "Where to watch", path: paths.watchIndex() },
          { name: city.name, path: paths.city(params.city) },
          { name: venue.name },
        ]}
      />

      <section className={styles.hero}>
        <h1 className={styles.h1}>{venue.name}</h1>
        <p className={styles.lede}>
          {KIND_LABEL[venue.kind] ?? "Venue"} in {city.name} for watching the FIFA
          World Cup 2026.
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
          {venue.website && (
            <p>
              <strong>Website:</strong>{" "}
              <a href={venue.website} rel="nofollow noopener" target="_blank">
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
                href={paths.cityTeam(params.city, t.code)}
                className={styles.pill}
              >
                <span>{t.flag}</span> {t.name}
              </Link>
            ))}
          </div>
        </section>
      )}

      {reviews.reviews.length > 0 && (
        <section className={styles.section}>
          <h2 className={styles.h2}>
            Fan reviews{rating ? ` · ${rating.value.toFixed(1)}★ (${rating.count})` : ""}
          </h2>
          <div className={styles.faq}>
            {reviews.reviews.slice(0, 8).map((r) => (
              <div key={r.id} className={styles.faqItem}>
                <p className={styles.faqQ}>
                  {r.userName} · <span className={styles.star}>★ {r.rating}</span>
                </p>
                {r.comment && <p className={styles.faqA}>{r.comment}</p>}
              </div>
            ))}
          </div>
        </section>
      )}

      <section className={styles.section}>
        <Link href={`/?city=${city.slug}`} className={styles.cta}>
          See {venue.name} on the live map →
        </Link>
      </section>
    </SeoShell>
  );
}
