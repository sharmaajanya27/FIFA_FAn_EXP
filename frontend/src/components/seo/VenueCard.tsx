import Link from "next/link";
import styles from "./seo.module.css";
import { paths } from "@/lib/seo";
import { teamByCode } from "@/lib/teams";
import type { RankedVenue } from "@/lib/types";

const KIND_LABEL: Record<string, string> = {
  bar: "Bar",
  pub: "Pub",
  restaurant: "Restaurant",
  cafe: "Café",
  fan_zone: "Fan zone",
};

/** A ranked venue row that links to its detail page. */
export function VenueCard({
  venue,
  citySlug,
  rank,
}: {
  venue: RankedVenue;
  citySlug: string;
  rank: number;
}) {
  const flags = venue.supportsTeams
    .map((c) => teamByCode(c)?.flag)
    .filter(Boolean)
    .slice(0, 8)
    .join(" ");
  const meta = [KIND_LABEL[venue.kind] ?? venue.kind, venue.address]
    .filter(Boolean)
    .join(" · ");

  return (
    <li>
      <Link href={paths.venue(citySlug, venue.id)} className={styles.venue}>
        <div className={styles.rank}>{rank}</div>
        <div className={styles.venueBody}>
          <div className={styles.venueName}>
            {venue.name}
            {typeof venue.ratingAvg === "number" && (
              <span className={styles.star}>★ {venue.ratingAvg.toFixed(1)}</span>
            )}
            {venue.featured && <span className={styles.badge}>Featured</span>}
          </div>
          <div className={styles.venueMeta}>
            {meta}
            {flags ? ` · ${flags}` : ""}
          </div>
        </div>
      </Link>
    </li>
  );
}
