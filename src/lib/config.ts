// Canonical site URL, used for metadata, sitemap, and robots.
// Override locally with NEXT_PUBLIC_SITE_URL if needed.
export const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, '') || 'https://www.canadial.com'

export const SITE_NAME = 'Canadial'
export const SITE_TAGLINE = "Know Who Called"
