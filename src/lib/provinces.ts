// Canadian area code → province/region mapping. Pure data.

const PROVINCE_BY_CODE: Record<string, string> = {};
function add(province: string, codes: string[]) {
  for (const c of codes) PROVINCE_BY_CODE[c] = province;
}

add("Ontario", [
  "416", "647", "437", "905", "289", "365", "705", "249", "519", "226",
  "548", "807", "613", "343", "753",
]);
add("British Columbia", ["604", "778", "236", "250", "672"]);
add("Alberta", ["403", "587", "825", "780", "368"]);
add("Quebec", ["514", "438", "819", "873", "450", "579", "418", "581", "367", "263"]);
add("Saskatchewan", ["306", "639", "474"]);
add("Manitoba", ["204", "431", "584"]);
add("Nova Scotia / PEI", ["902", "782"]);
add("New Brunswick", ["506"]);
add("Newfoundland & Labrador", ["709"]);
add("Territories", ["867"]);

const TOLL_FREE = new Set(["800", "833", "844", "855", "866", "877", "888"]);

export function provinceForAreaCode(code: string): string {
  if (PROVINCE_BY_CODE[code]) return PROVINCE_BY_CODE[code];
  if (TOLL_FREE.has(code)) return "Toll-free";
  return "Other / Unknown";
}

// Whether the area code is a recognised Canadian geographic code.
export function isCanadianAreaCode(code: string): boolean {
  return Boolean(PROVINCE_BY_CODE[code]);
}

export function isTollFree(code: string): boolean {
  return TOLL_FREE.has(code);
}

// A coarse line-type label. Canadian numbering plans overlay mobile and
// landline numbers on the same area codes, so only toll-free codes can be
// distinguished by prefix alone.
export function numberTypeForCode(code: string): string {
  if (TOLL_FREE.has(code)) return "Toll-free";
  return "Mobile or landline";
}

// A human label for the calling country, used in "About this number" copy.
export function countryForAreaCode(code: string): string {
  if (PROVINCE_BY_CODE[code]) return "Canada 🍁";
  if (TOLL_FREE.has(code)) return "Canada & US (toll-free)";
  return "United States or international";
}

export const ALL_PROVINCES = [
  "Ontario",
  "Quebec",
  "British Columbia",
  "Alberta",
  "Manitoba",
  "Saskatchewan",
  "Nova Scotia / PEI",
  "New Brunswick",
  "Newfoundland & Labrador",
  "Territories",
  "Toll-free",
  "Other / Unknown",
];
