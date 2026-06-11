/**
 * Team registry seed. Codes are FIFA-style 3-letter. Aliases (lowercase) are
 * used by enrichment/normalization to match free-form text (venue tags, event
 * titles, fixture names) back to a canonical team. Config-only to extend.
 */
import { type Team, TeamSchema } from "../models/canonical.js";

const RAW: Team[] = [
  { code: "ARG", name: "Argentina", country: "Argentina", aliases: ["argentina", "albiceleste"] },
  { code: "BRA", name: "Brazil", country: "Brazil", aliases: ["brazil", "brasil", "seleção"] },
  { code: "ENG", name: "England", country: "England", aliases: ["england", "three lions"] },
  { code: "USA", name: "United States", country: "United States", aliases: ["usa", "usmnt", "united states", "team usa"] },
  { code: "ESP", name: "Spain", country: "Spain", aliases: ["spain", "españa", "la roja"] },
  { code: "GER", name: "Germany", country: "Germany", aliases: ["germany", "deutschland", "die mannschaft"] },
  { code: "FRA", name: "France", country: "France", aliases: ["france", "les bleus"] },
  { code: "POR", name: "Portugal", country: "Portugal", aliases: ["portugal", "seleção das quinas"] },
  { code: "NED", name: "Netherlands", country: "Netherlands", aliases: ["netherlands", "holland", "oranje"] },
  { code: "ITA", name: "Italy", country: "Italy", aliases: ["italy", "italia", "azzurri"] },
  { code: "MEX", name: "Mexico", country: "Mexico", aliases: ["mexico", "méxico", "el tri"] },
  { code: "CAN", name: "Canada", country: "Canada", aliases: ["canada"] },
  { code: "JPN", name: "Japan", country: "Japan", aliases: ["japan", "samurai blue"] },
  { code: "KOR", name: "South Korea", country: "South Korea", aliases: ["south korea", "korea republic", "taegeuk"] },
  { code: "CRO", name: "Croatia", country: "Croatia", aliases: ["croatia", "hrvatska", "vatreni"] },
  { code: "BEL", name: "Belgium", country: "Belgium", aliases: ["belgium", "red devils"] },
  { code: "URU", name: "Uruguay", country: "Uruguay", aliases: ["uruguay", "la celeste"] },
  { code: "COL", name: "Colombia", country: "Colombia", aliases: ["colombia", "los cafeteros"] },
  { code: "MAR", name: "Morocco", country: "Morocco", aliases: ["morocco", "maroc", "atlas lions"] },
  { code: "SEN", name: "Senegal", country: "Senegal", aliases: ["senegal", "teranga lions"] },
];

export const TEAMS: Team[] = RAW.map((t) => TeamSchema.parse(t));

export const TEAM_BY_CODE: Record<string, Team> = Object.fromEntries(
  TEAMS.map((t) => [t.code, t]),
);

/** Resolve free-form text to a team code via name/alias substring match. */
export function matchTeamCode(text: string): string | undefined {
  const hay = text.toLowerCase();
  for (const team of TEAMS) {
    if (hay.includes(team.name.toLowerCase())) return team.code;
    for (const alias of team.aliases) {
      if (alias.length >= 3 && hay.includes(alias)) return team.code;
    }
  }
  return undefined;
}
