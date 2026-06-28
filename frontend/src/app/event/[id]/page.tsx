import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { cityByName } from "@/lib/cities";
import { teamByCode } from "@/lib/teams";
import { getEventDetail } from "@/lib/server/fetchers";
import { breadcrumbLd, buildMetadata, eventLd, paths } from "@/lib/seo";
import { SeoShell } from "@/components/seo/SeoShell";
import { Breadcrumbs } from "@/components/seo/Breadcrumbs";
import { JsonLd } from "@/components/JsonLd";
import { EventEngagement } from "@/components/event/EventEngagement";
import { directionsUrl, formatKickoff } from "@/lib/format";
import styles from "@/components/seo/seo.module.css";

export const revalidate = 600;
export const dynamicParams = true;

const KIND_LABEL: Record<string, string> = {
  viewing_party: "Viewing party",
  fan_zone: "Fan zone",
  community_watch: "Community watch",
};

function kindLabel(kind: string): string {
  return KIND_LABEL[kind] ?? "Fan event";
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const data = await getEventDetail(id);
  if (!data) return {};
  const { event } = data;
  const where = event.city ? ` in ${event.city}` : "";
  return buildMetadata({
    title: `${event.title} — Fan watch party${where} | FanWatch`,
    description: `Join fellow fans${where} for ${event.title}. RSVP, see who's going, share the live vibe, and review the atmosphere. ${formatKickoff(event.startTime)}.`,
    path: paths.event(event.id),
  });
}

export default async function EventPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const data = await getEventDetail(id);
  if (!data) notFound();
  const { event, rsvps, reviews } = data;

  const city = cityByName(event.city);
  const teams = event.teams
    .map((c) => teamByCode(c))
    .filter((t): t is NonNullable<typeof t> => Boolean(t));

  const rating =
    reviews.averageRating != null
      ? { value: reviews.averageRating, count: reviews.count }
      : undefined;

  const crumbs = [
    { name: "Home", path: "/" },
    { name: "Where to watch", path: paths.watchIndex() },
    ...(city ? [{ name: city.name, path: paths.city(city.slug) }] : []),
    { name: event.title, path: paths.event(event.id) },
  ];
  const ld = [
    breadcrumbLd(crumbs),
    eventLd(event, paths.event(event.id), rating),
  ];

  return (
    <SeoShell>
      <JsonLd data={ld} />
      <Breadcrumbs
        items={[
          { name: "Home", path: "/" },
          { name: "Where to watch", path: paths.watchIndex() },
          ...(city ? [{ name: city.name, path: paths.city(city.slug) }] : []),
          { name: event.title },
        ]}
      />

      <section className={styles.hero}>
        <h1 className={styles.h1}>{event.title}</h1>
        <p className={styles.lede}>
          {kindLabel(event.kind)}
          {event.city ? ` in ${event.city}` : ""} ·{" "}
          {formatKickoff(event.startTime)}
          {event.estAttendance
            ? ` · ~${event.estAttendance} fans expected`
            : ""}
        </p>
        <div className={styles.pills}>
          {teams.map((t) => (
            <span key={t.code} className={styles.pill}>
              <span>{t.flag}</span> {t.name}
            </span>
          ))}
          <a
            className={styles.pill}
            href={directionsUrl(event.geo.lat, event.geo.lon, event.title)}
            target="_blank"
            rel="noreferrer"
          >
            Directions ↗
          </a>
        </div>
      </section>

      <section className={styles.section}>
        <EventEngagement
          eventId={event.id}
          startTime={event.startTime}
          eventTeams={event.teams}
          initialRsvps={rsvps}
          initialReviews={reviews}
        />
      </section>

      <section className={styles.section}>
        <Link href={city ? `/?city=${city.slug}` : "/"} className={styles.cta}>
          {city
            ? `Find more watch spots in ${city.name} →`
            : "Back to the live map →"}
        </Link>
      </section>
    </SeoShell>
  );
}
