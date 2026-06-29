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
