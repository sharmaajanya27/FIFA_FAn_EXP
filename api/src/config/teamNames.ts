/** Team code → display name (mirrors ingestion/src/config/teams.ts). */
const NAMES: Record<string, string> = {
  ARG: "Argentina",
  BRA: "Brazil",
  ENG: "England",
  USA: "United States",
  ESP: "Spain",
  GER: "Germany",
  FRA: "France",
  POR: "Portugal",
  NED: "Netherlands",
  ITA: "Italy",
  MEX: "Mexico",
  CAN: "Canada",
  JPN: "Japan",
  KOR: "South Korea",
  CRO: "Croatia",
  BEL: "Belgium",
  URU: "Uruguay",
  COL: "Colombia",
  MAR: "Morocco",
  SEN: "Senegal",
};

export function teamName(code: string): string {
  return NAMES[code] ?? code;
}
