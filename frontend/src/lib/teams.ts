/** Team registry for the filter UI — mirrors ingestion/src/config/teams.ts. */
export interface TeamOption {
  code: string;
  name: string;
  flag: string;
}

/** Case-insensitive lookup of a team by its 3-letter code (e.g. "arg" → ARG). */
export function teamByCode(code: string): TeamOption | undefined {
  const c = code.toUpperCase();
  return TEAMS.find((t) => t.code === c);
}

export const TEAMS: TeamOption[] = [
  { code: "ARG", name: "Argentina", flag: "🇦🇷" },
  { code: "AUS", name: "Australia", flag: "🇦🇺" },
  { code: "BEL", name: "Belgium", flag: "🇧🇪" },
  { code: "BRA", name: "Brazil", flag: "🇧🇷" },
  { code: "CMR", name: "Cameroon", flag: "🇨🇲" },
  { code: "CAN", name: "Canada", flag: "🇨🇦" },
  { code: "COL", name: "Colombia", flag: "🇨🇴" },
  { code: "CRC", name: "Costa Rica", flag: "🇨🇷" },
  { code: "CRO", name: "Croatia", flag: "🇭🇷" },
  { code: "DEN", name: "Denmark", flag: "🇩🇰" },
  { code: "ECU", name: "Ecuador", flag: "🇪🇨" },
  { code: "ENG", name: "England", flag: "🏴" },
  { code: "FRA", name: "France", flag: "🇫🇷" },
  { code: "GER", name: "Germany", flag: "🇩🇪" },
  { code: "GHA", name: "Ghana", flag: "🇬🇭" },
  { code: "HON", name: "Honduras", flag: "🇭🇳" },
  { code: "IRN", name: "Iran", flag: "🇮🇷" },
  { code: "ITA", name: "Italy", flag: "🇮🇹" },
  { code: "JAM", name: "Jamaica", flag: "🇯🇲" },
  { code: "JPN", name: "Japan", flag: "🇯🇵" },
  { code: "MEX", name: "Mexico", flag: "🇲🇽" },
  { code: "MAR", name: "Morocco", flag: "🇲🇦" },
  { code: "NED", name: "Netherlands", flag: "🇳🇱" },
  { code: "PAN", name: "Panama", flag: "🇵🇦" },
  { code: "PRY", name: "Paraguay", flag: "🇵🇾" },
  { code: "POR", name: "Portugal", flag: "🇵🇹" },
  { code: "KSA", name: "Saudi Arabia", flag: "🇸🇦" },
  { code: "SEN", name: "Senegal", flag: "🇸🇳" },
  { code: "SRB", name: "Serbia", flag: "🇷🇸" },
  { code: "KOR", name: "South Korea", flag: "🇰🇷" },
  { code: "ESP", name: "Spain", flag: "🇪🇸" },
  { code: "CHE", name: "Switzerland", flag: "🇨🇭" },
  { code: "TUN", name: "Tunisia", flag: "🇹🇳" },
  { code: "USA", name: "United States", flag: "🇺🇸" },
  { code: "URU", name: "Uruguay", flag: "🇺🇾" },
];

const BY_CODE = new Map(TEAMS.map((t) => [t.code, t]));
export function teamLabel(code: string): string {
  const t = BY_CODE.get(code);
  return t ? `${t.flag} ${t.name}` : code;
}
