// Canadian area codes with a human-readable region, used for SEO copy and the
// homepage grid. Pure data — safe to import anywhere.

export type AreaCode = { code: string; region: string };

export const AREA_CODES: AreaCode[] = [
  { code: "416", region: "Toronto, ON" },
  { code: "647", region: "Toronto, ON" },
  { code: "437", region: "Toronto, ON" },
  { code: "905", region: "Greater Toronto Area, ON" },
  { code: "289", region: "Greater Toronto Area, ON" },
  { code: "365", region: "Greater Toronto Area, ON" },
  { code: "613", region: "Ottawa, ON" },
  { code: "343", region: "Ottawa, ON" },
  { code: "519", region: "Southwestern Ontario" },
  { code: "226", region: "Southwestern Ontario" },
  { code: "705", region: "Northern Ontario" },
  { code: "807", region: "Northwestern Ontario" },
  { code: "604", region: "Vancouver, BC" },
  { code: "778", region: "Vancouver, BC" },
  { code: "236", region: "British Columbia" },
  { code: "250", region: "British Columbia" },
  { code: "403", region: "Calgary, AB" },
  { code: "587", region: "Alberta" },
  { code: "825", region: "Alberta" },
  { code: "780", region: "Edmonton, AB" },
  { code: "514", region: "Montréal, QC" },
  { code: "438", region: "Montréal, QC" },
  { code: "450", region: "Greater Montréal, QC" },
  { code: "819", region: "Québec" },
  { code: "306", region: "Saskatchewan" },
  { code: "639", region: "Saskatchewan" },
  { code: "204", region: "Manitoba" },
  { code: "431", region: "Manitoba" },
  { code: "902", region: "Nova Scotia / PEI" },
  { code: "782", region: "Nova Scotia / PEI" },
];

const REGION_BY_CODE: Record<string, string> = Object.fromEntries(
  AREA_CODES.map((a) => [a.code, a.region])
);

export function regionForCode(code: string): string | null {
  return REGION_BY_CODE[code] ?? null;
}
