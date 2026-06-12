import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CITIES, cityBySlug } from "@/lib/cities";
import { TEAMS } from "@/lib/teams";
import { getCityMatches, getCityVenues } from "@/lib/server/fetchers";
import { worldCupStatus } from "@/lib/worldCup";
import {
  breadcrumbLd,
  buildMetadata,
  faqLd,
  itemListLd,
  paths,
} from "@/lib/seo";
import { SeoShell } from "@/components/seo/SeoShell";
import { Breadcrumbs } from "@/components/seo/Breadcrumbs";
import { VenueCard } from "@/components/seo/VenueCard";
import { Faq } from "@/components/seo/Faq";
import { JsonLd } from "@/components/JsonLd";
import styles from "@/components/seo/seo.module.css";

export const revalidate = 3600;
export const dynamicParams = true;

/** Below this many venues a city page is too thin to index. */
const INDEX_MIN_VENUES = 3;
/** Teams offered as quick-links into city×team pages. */
const QUICK_LINK_TEAMS = TEAMS.slice(0, 8);

export function generateStaticParams() {
  return CITIES.map((c) => ({ city: c.slug }));
}

function cityFaq(cityName: string) {
  return [
    {
      q: `Where is the best place to watch the World Cup in ${cityName}?`,
      a: `The top-ranked spots in ${cityName} are listed above, ordered by atmosphere, live-match coverage, and fan support. Tap any venue for hours, location, and crowd levels.`,
    },
    {
      q: `Are there fan zones in ${cityName}?`,
      a: `Yes — official fan zones and viewing parties appear alongside bars and pubs. Open the live map to see what's on near you in ${cityName}.`,
    },
    {
      q: `Can I watch a specific national team's match in ${cityName}?`,
      a: `Many venues cater to particular national teams. Use the team links above to find bars in ${cityName} that draw each fanbase.`,
    },
  ];
}

export async function generateMetadata({
  params,
}: {
  params: { city: string };
}): Promise<Metadata> {
  const city = cityBySlug(params.city);
  if (!city) return {};
  const venues = await getCityVenues(params.city, { limit: 24 });
  const count = venues.length;
  const description =
    `The best bars, pubs, and fan zones to watch FIFA World Cup 2026 matches in ${city.name}, ranked by atmosphere and live coverage.` +
    (count ? ` ${count} watch spots near ${city.stadium?.name ?? "downtown"}.` : "");
  return buildMetadata({
    title: `Where to Watch the World Cup in ${city.name} (2026) | FanWatch`,
    description,
    path: paths.city(params.city),
    noindex: count < INDEX_MIN_VENUES,
  });
}

export default async function CityPage({ params }: { params: { city: string } }) {
  const city = cityBySlug(params.city);
  if (!city) notFound();

  const [venues, matches] = await Promise.all([
    getCityVenues(params.city, { limit: 24 }),
    getCityMatches(params.city),
  ]);
  const season = worldCupStatus();
  const faq = cityFaq(city.name);

  const crumbs = [
    { name: "Home", path: "/" },
    { name: "Where to watch", path: paths.watchIndex() },
    { name: city.name, path: paths.city(params.city) },
  ];
  const ld = [
    breadcrumbLd(crumbs),
    venues.length
      ? itemListLd(
          venues
            .slice(0, 10)
            .map((v) => ({ name: v.name, path: paths.venue(params.city, v.id) })),
        )
      : null,
    faqLd(faq),
  ].filter(Boolean);

  return (
    <SeoShell>
      <JsonLd data={ld} />
      <Breadcrumbs
        items={[
          { name: "Home", path: "/" },
          { name: "Where to watch", path: paths.watchIndex() },
          { name: city.name },
        ]}
      />

      <section className={styles.hero}>
        {season.show && (
          <div className={styles.chip}>
            {season.live && <span className={styles.pulse} />}
            {season.status}
          </div>
        )}
        <h1 className={styles.h1}>Where to watch the World Cup in {city.name}</h1>
        <p className={styles.lede}>
          {city.country} The best bars, pubs, and fan zones in {city.name} to
          catch FIFA World Cup 2026 matches — ranked by atmosphere, live
          coverage, and fan support{city.stadium ? `, from downtown to ${city.stadium.name}` : ""}.
        </p>
      </section>

      <section className={styles.section}>
        <h2 className={styles.h2}>Top watch spots in {city.name}</h2>
        {venues.length ? (
          <ol className={styles.venueList}>
            {venues.map((v, i) => (
              <VenueCard key={v.id} venue={v} citySlug={params.city} rank={i + 1} />
            ))}
          </ol>
        ) : (
          <div className={styles.empty}>
            We&apos;re still gathering watch spots for {city.name}. Check back
            soon, or open the live map to explore nearby venues.
          </div>
        )}
      </section>

      {matches.length > 0 && (
        <section className={styles.section}>
          <h2 className={styles.h2}>Upcoming matches</h2>
          <div>
            {matches.slice(0, 8).map((m) => (
              <div key={m.id} className={styles.matchRow}>
                <span className={styles.matchTeams}>
                  {m.homeTeam} vs {m.awayTeam}
                </span>
                <span className={styles.matchKick}>
                  {new Date(m.kickoff).toLocaleString(undefined, {
                    dateStyle: "medium",
                    timeStyle: "short",
                  })}
                </span>
              </div>
            ))}
          </div>
        </section>
      )}

      <section className={styles.section}>
        <h2 className={styles.h2}>Watch by team</h2>
        <div className={styles.pills}>
          {QUICK_LINK_TEAMS.map((t) => (
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

      <section className={styles.section}>
        <h2 className={styles.h2}>Frequently asked questions</h2>
        <Faq items={faq} />
      </section>

      <section className={styles.section}>
        <Link href={`/?city=${city.slug}`} className={styles.cta}>
          Open the live map for {city.name} →
        </Link>
      </section>
    </SeoShell>
  );
}
