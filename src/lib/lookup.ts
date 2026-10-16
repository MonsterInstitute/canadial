import 'server-only'
import { batch } from './d1'
import { normalizePhone } from './phone'

// Re-export pure helpers so existing server-side imports keep working.
export { normalizePhone, formatPhone } from './phone'

type OrgRow = {
  name: string | null
  department: string | null
  category: string | null
  description: string | null
  hours: string | null
  tip: string | null
  slug: string | null
  website: string | null
}
type NumberRow = { ftc_total: number; c_total: number; c_spam: number; c_top_type: string | null }
type ReportRow = {
  id: string
  type: string | null
  comment: string | null
  created_at: string
  source: string | null
  is_spam: number
}

// How many reports a number page lists. Counts come from the numbers row, so
// this bounds rows read per render however many reports a number has — the
// Supabase version read every one of them.
const LISTED_REPORTS = 5

// One round trip, three bounded reads: the org by primary key, the number's
// counters by primary key, and the newest LISTED_REPORTS visible reports off
// the reports_by_phone index. Errors throw rather than read as "no data"
// (see src/lib/d1.ts and invariant 6 in AGENTS.md).
export async function lookupPhone(phone: string) {
  const normalized = normalizePhone(phone)

  if (normalized.length !== 10) {
    return { type: 'invalid' as const, data: null }
  }
  const key = Number(normalized)

  const [orgs, nums, reports] = await batch<[OrgRow, NumberRow, ReportRow]>([
    {
      sql: 'SELECT name, department, category, description, hours, tip, slug, website FROM organizations WHERE phone = ?',
      params: [key],
    },
    {
      sql: 'SELECT ftc_total, c_total, c_spam, c_top_type FROM numbers WHERE phone = ?',
      params: [key],
    },
    {
      sql: `SELECT id, type, comment, created_at, source, is_spam FROM reports
            WHERE phone = ? AND hidden = 0 AND source IS NOT 'ftc_dnc' ORDER BY created_at DESC LIMIT ?`,
      params: [key, LISTED_REPORTS],
    },
  ])

  const org = orgs[0]
  if (org) {
    return { type: 'legitimate' as const, data: { ...org, phone_number: normalized } }
  }

  const num = nums[0]
  // Complaints = FTC complaints (aggregated) + community reports.
  if (num && num.ftc_total + num.c_total > 0) {
    return {
      type: 'spam' as const,
      data: {
        phone_number: normalized,
        report_count: num.ftc_total + num.c_total,
        spam_count: num.ftc_total + num.c_spam,
        most_common_type: num.c_top_type,
        latest_comment: reports[0]?.comment ?? null,
        reports: reports.map((r) => ({ ...r, phone_number: normalized, is_spam: r.is_spam === 1 })),
      },
    }
  }

  return { type: 'unknown' as const, data: { phone_number: normalized } }
}
