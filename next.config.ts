import type { NextConfig } from "next";
import { PHASE_PRODUCTION_BUILD } from "next/constants";
import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";

const nextConfig: NextConfig = {
  // Translated per-number/per-area-code pages were removed (they were never
  // indexed and were the source of a sitemap that re-scanned the whole
  // spam_reports table). Send any old/bookmarked/backlinked URLs to the
  // English equivalent instead of 404ing.
  async redirects() {
    return [
      {
        source:
          "/:lang(zh|zh-tw|pa|tl|ar|hi|fr|es|ko|vi)/lookup/:number",
        destination: "/lookup/:number",
        permanent: true,
      },
      {
        source: "/:lang(zh|zh-tw|pa|tl|ar|hi|fr|es|ko|vi)/area/:code",
        destination: "/area/:code",
        permanent: true,
      },
    ];
  },
};

// Gives Next the Cloudflare bindings (D1) through getCloudflareContext().
//
// `next build` must read the remote production database (the wrangler "build"
// environment) so pages prerendered at build time carry real data, as Vercel
// builds read Supabase. The build's prerender workers resolve bindings on
// their own and only honour NEXT_DEV_WRANGLER_ENV, not the option passed here
// (see getCloudflareContextAsync in @opennextjs/cloudflare), so the variable is
// what selects the environment; it is set before any worker is spawned.
// `next dev` uses local bindings and never touches production.
export default async function config(phase: string): Promise<NextConfig> {
  if (phase === PHASE_PRODUCTION_BUILD) process.env.NEXT_DEV_WRANGLER_ENV = "build";
  await initOpenNextCloudflareForDev();
  return nextConfig;
}
