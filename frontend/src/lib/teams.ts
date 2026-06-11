/** Team registry for the filter UI — mirrors ingestion/src/config/teams.ts. */
export interface TeamOption {
  code: string;
  name: string;
  flag: string;
}

export const TEAMS: TeamOption[] = [
  { code: "ARG", name: "Argentina", flag: "🇦🇷" },
  { code: "BRA", name: "Brazil", flag: "🇧🇷" },
  { code: "ENG", name: "England", flag: "🏴" },
  { code: "USA", name: "United States", flag: "🇺🇸" },
  { code: "ESP", name: "Spain", flag: "🇪🇸" },
  { code: "GER", name: "Germany", flag: "🇩🇪" },
  { code: "FRA", name: "France", flag: "🇫🇷" },
  { code: "POR", name: "Portugal", flag: "🇵🇹" },
  { code: "NED", name: "Netherlands", flag: "🇳🇱" },
  { code: "ITA", name: "Italy", flag: "🇮🇹" },
  { code: "MEX", name: "Mexico", flag: "🇲🇽" },
  { code: "CAN", name: "Canada", flag: "🇨🇦" },
  { code: "JPN", name: "Japan", flag: "🇯🇵" },
  { code: "KOR", name: "South Korea", flag: "🇰🇷" },
  { code: "CRO", name: "Croatia", flag: "🇭🇷" },
  { code: "BEL", name: "Belgium", flag: "🇧🇪" },
  { code: "URU", name: "Uruguay", flag: "🇺🇾" },
  { code: "COL", name: "Colombia", flag: "🇨🇴" },
  { code: "MAR", name: "Morocco", flag: "🇲🇦" },
  { code: "SEN", name: "Senegal", flag: "🇸🇳" },
];

const BY_CODE = new Map(TEAMS.map((t) => [t.code, t]));
export function teamLabel(code: string): string {
  const t = BY_CODE.get(code);
  return t ? `${t.flag} ${t.name}` : code;
}
