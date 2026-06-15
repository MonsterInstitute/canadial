import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import RightsArticle from "@/components/RightsArticle";
import { LOCALES, getLocale } from "@/lib/i18n";

// Pre-render one per non-English locale.
export function generateStaticParams() {
  return LOCALES.filter((l) => l.code !== "en").map((l) => ({ lang: l.code }));
}

type Props = { params: Promise<{ lang: string }> };

function isSupportedLang(lang: string) {
  const loc = getLocale(lang);
  return !!loc && loc.code !== "en";
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { lang } = await params;
  if (!isSupportedLang(lang)) return {};
  return {
    title: "Know Your Rights — Canadian Phone Scam & Spam Guide",
    description:
      "What to do when you receive a suspicious call in Canada. Free guide to CRA scams, debt collector rights, and telemarketer blocking.",
    alternates: {
      canonical: `/${lang}/rights`,
      languages: {
        en: "/rights",
        "x-default": "/rights",
        ...Object.fromEntries(
          LOCALES.filter((l) => l.code !== "en").map((l) => [
            l.hreflang,
            `/${l.code}/rights`,
          ])
        ),
      },
    },
  };
}

export default async function LangRightsPage({ params }: Props) {
  const { lang } = await params;
  if (!isSupportedLang(lang)) notFound();

  // Content is English for now (translations added later). The closing CTA and
  // the back link keep the visitor within their selected language.
  return (
    <>
      <RightsArticle home={`/${lang}`} />
      <div className="mx-auto w-full max-w-3xl px-4 pb-12">
        <Link
          href={`/${lang}`}
          className="text-sm font-medium text-canada hover:underline"
        >
          ← {getLocale(lang)?.nativeName}
        </Link>
      </div>
    </>
  );
}
