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
