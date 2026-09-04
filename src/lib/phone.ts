// Pure phone-number helpers — safe to import from client components.
// No Supabase / server-only dependencies here.

export function normalizePhone(input: string): string {
  const digits = input.replace(/\D/g, '')
  if (digits.length === 11 && digits.startsWith('1')) {
    return digits.slice(1)
  }
  return digits.slice(-10)
}

// Format a 10-digit number for display, e.g. "4165551234" -> "(416) 555-1234".
// Falls back to the raw input if it isn't a clean 10-digit number.
export function formatPhone(input: string): string {
  const n = normalizePhone(input)
  if (n.length !== 10) return input
  return `(${n.slice(0, 3)}) ${n.slice(3, 6)}-${n.slice(6)}`
}

// Some legacy comments were imported with a "Reported on 800notes.com" footer.
// We surface them as community reports, so strip any reference to the original
// source when rendering. Display-only — the stored comment is never changed.
export function cleanComment(input: string): string {
  return input
    .replace(/reported on 800notes\.com/gi, "Reported by Canadian community members")
    .replace(/\b800notes\.com\b/gi, "the Canadian community")
}

// Whether a report originated from the US FTC Do Not Call dataset rather than a
// direct Canadian community report. Covers the `ftc_dnc` and `ftc_dnc_api`
// import sources.
export function isFtcSource(source: string | null | undefined): boolean {
  return typeof source === "string" && source.toLowerCase().startsWith("ftc")
}

// Turn an FTC-sourced comment into structured display parts. FTC imports store
// comments in one of two shapes:
//   1. "Reported to FTC Do Not Call registry — <subject>"  (structured)
//   2. A longer descriptive sentence with no explicit subject (generic)
// Returns the extracted complaint `subject` (or null) and a short `body` line
// suitable for display. Display-only — the stored comment is never changed.
export function describeFtcReport(comment: string | null | undefined): {
  subject: string | null
  body: string
} {
  const raw = (comment ?? "").trim()
  const subject = ftcSubject(raw)

  // Structured "Reported to FTC Do Not Call registry [— subject]" comments
  // collapse to a clean "Reported to FTC" line, with the subject shown apart.
  if (/^reported to (?:the )?ftc do not call registry/i.test(raw)) {
    return { subject, body: "Reported to FTC" }
  }

  // Generic descriptive sentence: it's already meaningful, so keep it as the
  // body. Fall back to a short label if the comment is empty.
  return { subject, body: raw || "Reported to FTC" }
}

// Extract the human-readable complaint subject from an FTC comment, if present.
function ftcSubject(comment: string): string | null {
  if (!comment) return null
  // "… — <subject>" or "… — subject: <subject>"
  const dash = comment.match(/—\s*(?:subject:\s*)?(.+?)\s*$/i)
  if (dash) {
    const s = dash[1].trim().replace(/\.\s*$/, "")
    if (s) return s
  }
  // "… Subject: <subject>." embedded in a longer sentence.
  const inline = comment.match(/\bsubject:\s*([^.]+)/i)
  if (inline) {
    const s = inline[1].trim()
    if (s) return s
  }
  return null
}

// A real NANP area code never starts with 0 or 1. The imported datasets carry
// junk numbers (0000000000, 1111111111, ...) that would otherwise get their own
// indexable /lookup and /area pages — 67 such area codes were in the sitemap.
export function isValidAreaCode(code: string): boolean {
  return /^[2-9]\d\d$/.test(code);
}
