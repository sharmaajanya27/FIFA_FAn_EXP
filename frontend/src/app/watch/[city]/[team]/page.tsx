import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { cityBySlug } from "@/lib/cities";
import { teamByCode } from "@/lib/teams";
import { getCityMatches, getCityVenues } from "@/lib/server/fetchers";
import type { RankedVenue } from "@/lib/types";
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

/** Min venues actually tagged for the team before we let Google index the page. */
const INDEX_MIN_SUPPORTING = 3;

// Rendered on demand (ISR) — the sitemap only lists pairs that pass the gate,
// so we don't pre-build hundreds of thin city×team combinations.
export function generateStaticParams() {
  return [];
}

const supporting = (venues: RankedVenue[], code: string): RankedVenue[] =>
  venues.filter((v) => v.supportsTeams.includes(code));

export async function generateMetadata({
  params,
}: {
  params: Promise<{ city: string; team: string }>;
}): Promise<Metadata> {
  const { city: citySlug, team: teamCode } = await params;
  const city = cityBySlug(citySlug);
  const team = teamByCode(teamCode);
  if (!city || !team) return {};
  const venues = await getCityVenues(citySlug, { team: team.code, limit: 24 });
  const supportCount = supporting(venues, team.code).length;
  return buildMetadata({
    title: `Where to Watch ${team.name} Matches in ${city.name} (2026) | Tu Parea`,
    description: `Find the best bars and fan zones to watch ${team.name} ${team.flag} play at the 2026 World Cup in ${city.name} — where ${team.name} fans gather, ranked by atmosphere.`,
    path: paths.cityTeam(citySlug, team.code),
    noindex: supportCount < INDEX_MIN_SUPPORTING,
  });
}

export default async function CityTeamPage({
  params,
}: {
  params: Promise<{ city: string; team: string }>;
}) {
  const { city: citySlug, team: teamCode } = await params;
  const city = cityBySlug(citySlug);
  const team = teamByCode(teamCode);
  if (!city || !team) notFound();

  const [venues, matches] = await Promise.all([
    getCityVenues(citySlug, { team: team.code, limit: 24 }),
    getCityMatches(citySlug, team.code),
  ]);
  const supporters = supporting(venues, team.code);
  // Prefer venues that explicitly support the team; otherwise show the best
  // nearby spots (team-boosted ranking) so the page is still useful.
  const list = supporters.length ? supporters : venues.slice(0, 12);

  const faq = [
    {
      q: `Where do ${team.name} fans watch the World Cup in ${city.name}?`,
      a: supporters.length
        ? `${supporters.length} venues in ${city.name} are known to draw ${team.name} supporters — see the ranked list above.`
        : `${team.name} supporters gather at the top-rated football pubs and bars in ${city.name} listed above. Open the live map for crowd levels on match day.`,
    },
    {
      q: `When does ${team.name} play?`,
      a: matches.length
        ? `${team.name}'s upcoming fixtures are listed above with kickoff times.`
        : `Fixtures appear here once ${team.name}'s 2026 World Cup schedule is confirmed for ${city.name}.`,
    },
  ];

  const crumbs = [
    { name: "Home", path: "/" },
    { name: "Where to watch", path: paths.watchIndex() },
    { name: city.name, path: paths.city(citySlug) },
    { name: team.name, path: paths.cityTeam(citySlug, team.code) },
  ];
  const ld = [
    breadcrumbLd(crumbs),
    list.length
      ? itemListLd(
          list
            .slice(0, 10)
            .map((v) => ({ name: v.name, path: paths.venue(citySlug, v.id) })),
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
          { name: city.name, path: paths.city(citySlug) },
          { name: team.name },
        ]}
      />

      <section className={styles.hero}>
        <h1 className={styles.h1}>
          Where to watch {team.name} {team.flag} in {city.name}
        </h1>
        <p className={styles.lede}>
          The best bars and fan zones in {city.name} to watch {team.name} play at
          the FIFA World Cup 2026 — where the {team.name} faithful gather, ranked
          by atmosphere and live coverage.
        </p>
      </section>

      <section className={styles.section}>
        <h2 className={styles.h2}>
          {supporters.length ? `${team.name} watch spots` : `Top watch spots`} in {city.name}
        </h2>
        {list.length ? (
          <ol className={styles.venueList}>
            {list.map((v, i) => (
              <VenueCard key={v.id} venue={v} citySlug={citySlug} rank={i + 1} />
            ))}
          </ol>
        ) : (
          <div className={styles.empty}>
            We&apos;re still mapping {team.name} spots in {city.name}. Open the
            live map to explore nearby venues.
          </div>
        )}
      </section>

      {matches.length > 0 && (
        <section className={styles.section}>
          <h2 className={styles.h2}>{team.name} fixtures</h2>
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
        <h2 className={styles.h2}>Frequently asked questions</h2>
        <Faq items={faq} />
      </section>

      <section className={styles.section}>
        <Link
          href={`/?city=${city.slug}&team=${team.code}`}
          className={styles.cta}
        >
          Open the live map →
        </Link>
      </section>
    </SeoShell>
  );
}
