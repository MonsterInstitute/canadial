// Scam-type hub pages. Each hub is defined by the FTC complaint subjects it
// covers (the FTC's own categories, as written in its data), so every number
// listed on a hub is there because complainants put it in that category.
//
// Canadian-specific scams (CRA, Canada Post, immigration, bank impersonation)
// have no hub yet: community reports don't name them (0 matches across 48,613
// reports, checked 2026-10-16), and a hub with no numbers would be filler. The
// FTC's impersonation category is the closest real data.

export type Hub = { slug: string; title: string; subjects: string[]; summary: string };

export const HUBS: Hub[] = [
  {
    slug: "impersonation",
    title: "Government, business and family impersonation calls",
    subjects: ["Calls pretending to be government, businesses, or family and friends"],
    summary: "Numbers that complainants said pretended to be a government agency, a company, or a relative.",
  },
  {
    slug: "debt-relief",
    title: "Debt relief and credit calls",
    subjects: ["Reducing your debt (credit cards, mortgage, student loans)", "Debt collection"],
    summary: "Numbers reported for offers to reduce credit card, mortgage or student loan debt, or for debt collection.",
  },
  {
    slug: "medical",
    title: "Medical and prescription calls",
    subjects: ["Medical  & prescriptions"],
    summary: "Numbers reported for medical devices, prescriptions, insurance plans and similar health offers.",
  },
  {
    slug: "energy-solar",
    title: "Energy, solar and utility calls",
    subjects: ["Energy, solar,  & utilities"],
    summary: "Numbers reported for solar panels, energy rates and utility offers.",
  },
  {
    slug: "warranties",
    title: "Warranty and protection plan calls",
    subjects: ["Warranties  & protection plans"],
    summary: "Numbers reported for vehicle warranties and other protection plans.",
  },
  {
    slug: "home-improvement",
    title: "Home improvement and cleaning calls",
    subjects: ["Home improvement  & cleaning"],
    summary: "Numbers reported for duct cleaning, renovations and other home services.",
  },
  {
    slug: "tech-support",
    title: "Computer and tech support calls",
    subjects: ["Computer  & technical support"],
    summary: "Numbers reported for claimed computer problems or technical support offers.",
  },
  {
    slug: "prizes",
    title: "Lottery, prize and sweepstakes calls",
    subjects: ["Lotteries, prizes  & sweepstakes"],
    summary: "Numbers reported for telling people they had won a prize, lottery or sweepstakes.",
  },
  {
    slug: "vacation-timeshare",
    title: "Vacation and timeshare calls",
    subjects: ["Vacation  & timeshares"],
    summary: "Numbers reported for travel deals, vacation packages and timeshares.",
  },
  {
    slug: "charities",
    title: "Charity solicitation calls",
    subjects: ["Charities"],
    summary: "Numbers reported for asking for charitable donations.",
  },
  {
    slug: "home-security",
    title: "Home security and alarm calls",
    subjects: ["Home security  & alarms"],
    summary: "Numbers reported for home security and alarm system offers.",
  },
  {
    slug: "work-from-home",
    title: "Work-from-home and money-making calls",
    subjects: ["Work from home  & other ways to make money"],
    summary: "Numbers reported for work-from-home jobs and other ways to make money.",
  },
];

export const hubBySlug = (slug: string) => HUBS.find((h) => h.slug === slug);

// Display names for FTC subjects (the raw names have doubled spaces).
export function subjectLabel(name: string): string {
  if (name === "Other" || name === "(not given)" || name === "No Subject Provided") return "Not specified / other";
  return name.replace(/\s+&/g, " &").replace(/\s{2,}/g, " ").replace(/,\s+&/g, " &");
}
