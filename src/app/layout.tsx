import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
import Script from "next/script";
import "./globals.css";
import Header from "@/components/Header";
import { SITE_NAME, SITE_TAGLINE, SITE_URL } from "@/lib/config";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// AdSense publisher ID — replace with your real ca-pub-XXXXXXXX value.
const ADSENSE_CLIENT = process.env.NEXT_PUBLIC_ADSENSE_CLIENT || "ca-pub-1219788687006562";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: `${SITE_NAME} — ${SITE_TAGLINE}`,
    template: `%s | ${SITE_NAME}`,
  },
  description:
    "Look up any Canadian phone number. Check if it is spam, a scam, or legitimate. Free reverse phone lookup in 11 languages including French and Chinese.",
  applicationName: SITE_NAME,
  icons: {
    icon: [
      { url: "/favicon.svg", type: "image/svg+xml" },
      { url: "/favicon.ico", sizes: "any" },
    ],
    apple: "/apple-touch-icon.png",
  },
  openGraph: {
    siteName: SITE_NAME,
    type: "website",
    locale: "en_CA",
    url: SITE_URL,
  },
  verification: {
    other: {
      "msvalidate.01": "DDAB0B990C5093BD6479EC3A8ED9D624",
    },
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en-CA"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-white text-zinc-900">
        {/* Google AdSense — loads the ad library. Replace the client ID above. */}
        <Script
          id="google-adsense"
          async
          strategy="afterInteractive"
          src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${ADSENSE_CLIENT}`}
          crossOrigin="anonymous"
        />

        <Header />

        <main className="flex flex-1 flex-col">{children}</main>

        <footer className="border-t border-zinc-200 mt-16">
          <div className="mx-auto w-full max-w-3xl px-4 py-10 text-sm text-zinc-600">
            <p className="text-center text-base font-medium text-zinc-800">
              Canadial was built because Canadians deserve to feel safe when
              their phone rings. 🍁
            </p>

            <nav className="mt-6 flex flex-wrap justify-center gap-x-6 gap-y-2">
              <Link href="/rights" className="hover:text-canada">
                Know Your Rights
              </Link>
              <Link href="/api-docs" className="hover:text-canada">
                API
              </Link>
              <Link href="/pricing" className="hover:text-canada">
                Pricing
              </Link>
              <a
                href="https://lnnte-dncl.gc.ca/"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-canada"
              >
                Register for Do Not Call List
              </a>
              <a
                href="https://antifraudcentre-centreantifraude.ca/"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-canada"
              >
                Report Fraud
              </a>
              <a
                href="https://crtc.gc.ca/"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-canada"
              >
                Report to CRTC
              </a>
            </nav>

            <p className="mx-auto mt-6 max-w-2xl text-center text-xs leading-relaxed text-zinc-400">
              Canadial is an independent, community-powered phone lookup service.
              We are not affiliated with the Government of Canada, CRA, or any
              telecom company. Information is provided for protection purposes
              only.
            </p>
            <p className="mt-4 text-center text-xs text-zinc-400">
              © 2026 {SITE_NAME}
            </p>
          </div>
        </footer>
      </body>
    </html>
  );
}
