import 'server-only'
import { supabase } from './supabase'
import { normalizePhone } from './phone'

// Re-export pure helpers so existing server-side imports keep working.
export { normalizePhone, formatPhone } from './phone'

export async function lookupPhone(phone: string) {
  const normalized = normalizePhone(phone)

  if (normalized.length !== 10) {
    return { type: 'invalid', data: null }
  }

  // Check organizations first (legitimate numbers)
  const { data: org } = await supabase
    .from('organizations')
    .select('*')
    .eq('phone_number', normalized)
    .single()

  if (org) {
    return { type: 'legitimate', data: org }
  }

  // Check spam reports
  const { data: reports } = await supabase
    .from('spam_reports')
    .select('*')
    .eq('phone_number', normalized)
    .order('created_at', { ascending: false })

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
