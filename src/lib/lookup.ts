import 'server-only'
import { supabaseAdmin } from './supabase'
import { normalizePhone } from './phone'

// Re-export pure helpers so existing server-side imports keep working.
export { normalizePhone, formatPhone } from './phone'

export async function lookupPhone(phone: string) {
  const normalized = normalizePhone(phone)

  if (normalized.length !== 10) {
    return { type: 'invalid', data: null }
  }

  // Every query error throws instead of reading as "no data". These results are
  // ISR-cached for a week, and an outage that renders as "No reports yet" gets
  // cached and served as fact — that happened during the October egress
  // restriction. A thrown render is never cached: ISR keeps serving the last
  // good copy and retries on the next request, and a page with no good copy
  // yet returns a 500 until the database answers again.

  // Check organizations first (legitimate numbers). maybeSingle(), not
  // single(): "no row" is the common case, not an error.
  const { data: org, error: orgErr } = await supabaseAdmin
    .from('organizations')
    .select('*')
    .eq('phone_number', normalized)
    .maybeSingle()
  if (orgErr) throw new Error(`lookupPhone(${normalized}) organizations: ${orgErr.message}`)

  if (org) {
    return { type: 'legitimate', data: org }
  }

  // Check spam reports
  const { data: reports, error: reportsErr } = await supabaseAdmin
    .from('spam_reports')
    .select('*')
    .eq('phone_number', normalized)
    .eq('hidden', false)
    .order('created_at', { ascending: false })
  if (reportsErr) throw new Error(`lookupPhone(${normalized}) spam_reports: ${reportsErr.message}`)

  if (reports && reports.length > 0) {
    const spamCount = reports.filter(r => r.is_spam).length
    const types = reports.map(r => r.type).filter(Boolean)
    const mostCommonType = types.sort((a, b) =>
      types.filter(v => v === a).length - types.filter(v => v === b).length
    ).pop()

    return {
      type: 'spam',
      data: {
        phone_number: normalized,
        report_count: reports.length,
        spam_count: spamCount,
        most_common_type: mostCommonType,
        latest_comment: reports[0]?.comment,
        reports: reports.slice(0, 5)
      }
    }
  }

  return { type: 'unknown', data: { phone_number: normalized } }
}
