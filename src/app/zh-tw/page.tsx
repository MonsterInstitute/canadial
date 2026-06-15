import type { Metadata } from "next";
import LanguagePage from "@/components/LanguagePage";
import { CONTENT, getLocale, HREFLANG_ALTERNATES } from "@/lib/i18n";

const CODE = "zh-tw";
const loc = getLocale(CODE)!;

export const metadata: Metadata = {
  title: `Canada Phone Lookup - ${loc.englishName}`,
  description: CONTENT[CODE].description,
  alternates: { canonical: loc.path, languages: HREFLANG_ALTERNATES },
};

export default function Page() {
  return <LanguagePage code={CODE} />;
}
