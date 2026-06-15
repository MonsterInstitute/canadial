import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
import Script from "next/script";
import "./globals.css";
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
const ADSENSE_CLIENT = process.env.NEXT_PUBLIC_ADSENSE_CLIENT || "ca-pub-XXXXXXXXXXXXXXXX";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: `${SITE_NAME} — ${SITE_TAGLINE}`,
    template: `%s | ${SITE_NAME}`,
  },
  description: SITE_TAGLINE,
  applicationName: SITE_NAME,
  openGraph: {
    siteName: SITE_NAME,
    type: "website",
    locale: "en_CA",
    url: SITE_URL,
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

        <header className="border-b border-zinc-200">
          <div className="mx-auto flex w-full max-w-3xl items-center justify-between px-4 py-4">
            <Link href="/" className="flex items-center gap-2 font-bold text-lg">
              <span
                aria-hidden
                className="inline-flex h-6 w-6 items-center justify-center rounded bg-canada text-white text-sm font-black"
              >
                🍁
              </span>
              <span>
                <span className="text-canada">Cana</span>dial
              </span>
            </Link>
            <nav className="flex items-center gap-5 text-sm font-medium text-zinc-600">
              <Link href="/" className="hover:text-canada">
                Home
              </Link>
              <Link href="/#recent-reports" className="hover:text-canada">
                Recent reports
              </Link>
            </nav>
          </div>
        </header>

        <main className="flex flex-1 flex-col">{children}</main>

        <footer className="border-t border-zinc-200 mt-16">
          <div className="mx-auto w-full max-w-3xl px-4 py-6 text-center text-sm text-zinc-500">
            © 2026 {SITE_NAME} — {SITE_TAGLINE.split("—")[0].trim()}
          </div>
        </footer>
      </body>
    </html>
  );
}
