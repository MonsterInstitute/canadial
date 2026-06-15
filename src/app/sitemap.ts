import type { MetadataRoute } from "next";
import { supabase } from "@/lib/supabase";
import { SITE_URL } from "@/lib/config";

// Revalidate the sitemap hourly as new numbers get reported.
export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticPages: MetadataRoute.Sitemap = [
    {
      url: SITE_URL,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 1,
    },
  ];

  // One entry per unique reported phone number.
  let numberPages: MetadataRoute.Sitemap = [];
  try {
    const { data } = await supabase
      .from("spam_reports")
      .select("phone_number, created_at")
      .order("created_at", { ascending: false })
      .limit(50000);

    if (data) {
      const latestByNumber = new Map<string, string>();
      for (const row of data) {
        if (!latestByNumber.has(row.phone_number)) {
          latestByNumber.set(row.phone_number, row.created_at);
        }
      }
      numberPages = Array.from(latestByNumber.entries()).map(
        ([phone, lastModified]) => ({
          url: `${SITE_URL}/lookup/${phone}`,
          lastModified: new Date(lastModified),
          changeFrequency: "weekly",
          priority: 0.7,
        })
      );
    }
  } catch {
    // If the DB is unavailable, still return the static pages.
  }

  return [...staticPages, ...numberPages];
}
