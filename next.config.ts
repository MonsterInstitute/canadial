import type { NextConfig } from "next";

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

export default nextConfig;
