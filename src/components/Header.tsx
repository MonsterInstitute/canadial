"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import LanguageSelector from "./LanguageSelector";
import { langFromPath } from "@/lib/i18n";

export default function Header() {
  const pathname = usePathname() || "/";
  const lang = langFromPath(pathname);
  const home = lang === "en" ? "/" : `/${lang}`;
  const recent = `${home === "/" ? "" : home}#recent-reports`;

  return (
    <header className="border-b border-zinc-200">
      <div className="mx-auto flex w-full max-w-3xl items-center justify-between gap-3 px-4 py-4">
        <Link
          href={home}
          className="flex items-center gap-2.5"
          aria-label="Canadial — Phone Protection"
        >
          <svg
            width={32.4}
            height={36}
            viewBox="0 0 36 40"
            fill="none"
            aria-hidden
            className="shrink-0"
          >
            <path
              d="M 18 2 L 34 8 L 34 22 Q 34 32 18 38 Q 2 32 2 22 L 2 8 Z"
              fill="#d52b1e"
            />
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

        <div className="flex items-center gap-3 sm:gap-4">
          <nav className="flex items-center gap-4 text-sm font-medium text-zinc-600">
            <Link href={home} className="hover:text-canada">
              Home
            </Link>
            <Link href="/rights" className="hidden hover:text-canada sm:inline">
              Know Your Rights
            </Link>
            <Link href={recent} className="hidden hover:text-canada md:inline">
              Recent reports
            </Link>
          </nav>
          <LanguageSelector />
        </div>
      </div>
    </header>
  );
}
