import type { MetadataRoute } from "next";
import { CITIES } from "@/lib/cities";
import { TEAMS } from "@/lib/teams";
import { getCityVenues } from "@/lib/server/fetchers";
import { absoluteUrl, paths } from "@/lib/seo";
import type { RankedVenue } from "@/lib/types";

export const revalidate = 3600;

// Indexation gates — mirror the per-page `noindex` rules so the sitemap only
// advertises pages Google should actually index.
const CITY_MIN_VENUES = 3;
const TEAM_MIN_SUPPORTING = 3;
const VENUES_PER_CITY = 50;

const venueIndexable = (v: RankedVenue): boolean =>
  Boolean(v.name && v.address && (typeof v.ratingAvg === "number" || v.website));

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  const entries: MetadataRoute.Sitemap = [
    { url: absoluteUrl("/"), lastModified: now, changeFrequency: "daily", priority: 1 },
    {
      url: absoluteUrl(paths.watchIndex()),
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.9,
    },
  ];

  for (const city of CITIES) {
    const venues = await getCityVenues(city.slug, { limit: 200 });
    if (venues.length < CITY_MIN_VENUES) continue; // skip thin cities entirely

    entries.push({
      url: absoluteUrl(paths.city(city.slug)),
      lastModified: now,
      changeFrequency: "daily",
      priority: 0.8,
    });

    for (const team of TEAMS) {
      const supporting = venues.filter((v) => v.supportsTeams.includes(team.code));
      if (supporting.length >= TEAM_MIN_SUPPORTING) {
        entries.push({
          url: absoluteUrl(paths.cityTeam(city.slug, team.code)),
          lastModified: now,
          changeFrequency: "weekly",
          priority: 0.6,
        });
      }
    }

    for (const v of venues.filter(venueIndexable).slice(0, VENUES_PER_CITY)) {
      entries.push({
        url: absoluteUrl(paths.venue(city.slug, v.id)),
        lastModified: now,
        changeFrequency: "weekly",
        priority: 0.5,
      });
    }
  }

  return entries;
}
