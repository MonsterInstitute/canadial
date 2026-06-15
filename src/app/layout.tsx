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
            <Link href="/" className="flex items-center gap-2.5" aria-label="Canadial — Phone Protection">
              <svg
                width={32.4}
                height={36}
                viewBox="0 0 36 40"
                fill="none"
                aria-hidden
                className="shrink-0"
              >
                {/* Heraldic shield */}
                <path
                  d="M 18 2 L 34 8 L 34 22 Q 34 32 18 38 Q 2 32 2 22 L 2 8 Z"
                  fill="#d52b1e"
                />
                {/* Maple leaf, scaled and centered within the shield */}
                <path
                  transform="translate(7 8) scale(0.043)"
                  fill="#ffffff"
                  d="M383.8 351.7c2.5-2.5 105.2-92.4 105.2-92.4l-17.5-7.5c-10-4.9-7.4-11.5-5-17.4 2.4-7.6 20.1-67.3 20.1-67.3s-47.8 10-57.8 12.5c-7.5 2.4-10-2.5-12.5-7.5s-15-32.4-15-32.4-52.7 59.9-55.2 62.3c-10 7.5-20 0-17.5-10 0-10 27.6-129.6 27.6-129.6s-30.1 17.4-40.2 22.4c-7.5 5-12.5 5-17.5-5C288.6 70.1 256.5 0 256.5 0s-32.1 70.1-39.6 80.1c-5 10-10 10-17.5 5-10.1-5-40.2-22.4-40.2-22.4s25.1 119.6 27.6 129.6c2.5 10-7.5 17.5-17.5 10-2.5-2.4-55.2-62.3-55.2-62.3s-12.5 27.4-15 32.4-5 9.9-12.5 7.5c-10-2.5-57.8-12.5-57.8-12.5s17.7 59.7 20.1 67.3c2.4 5.9 5 12.5-5 17.4L20.4 259.3S123 349.2 125.6 351.7c5.2 5 10 7.5 5 22.5-5 14.9-10 32.4-10 32.4s95.2-20 105.3-22.5c8.5-2.1 17.5 2.5 17.5 12.5S238.5 512 238.5 512h35s-7.5-90.1-7.5-100.1 8.9-14.6 17.5-12.5c10.1 2.5 105.3 22.5 105.3 22.5s-5-17.5-10-32.4c-5-15 0-17.5 5-22.5z"
                />
              </svg>
              <span className="flex flex-col leading-none">
                <span className="text-lg font-bold tracking-tight">
                  <span style={{ color: "#d52b1e" }}>Cana</span>
                  <span style={{ color: "#1a1a1a" }}>dial</span>
                </span>
                <span
                  className="mt-0.5 font-medium"
                  style={{ color: "#6b7280", fontSize: "11px" }}
                >
                  Phone Protection
                </span>
              </span>
            </Link>
            <nav className="flex items-center gap-5 text-sm font-medium text-zinc-600">
              <Link href="/" className="hover:text-canada">
                Home
              </Link>
              <Link href="/rights" className="hover:text-canada">
                Know Your Rights
              </Link>
              <Link href="/#recent-reports" className="hidden hover:text-canada sm:inline">
                Recent reports
              </Link>
            </nav>
          </div>
        </header>

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
