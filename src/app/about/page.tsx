import type { Metadata } from "next";
import Link from "next/link";
import Prose from "@/components/Prose";

export const metadata: Metadata = { title: "About Canadial", description: "What Canadial is, where its data comes from, and who runs it.", alternates: { canonical: "/about" } };

export default function About() {
  return (
    <Prose title="About Canadial">
      <p>Canadial is an independent phone number lookup. Enter a number and you see what is on record about it: complaints filed with the U.S. Federal Trade Commission, reports from people who use this site, and who the number&apos;s block is assigned to in the Canadian and U.S. numbering records.</p>
      <p>Every number page is built from that number&apos;s own data. When there is nothing on record, the page says so instead of filling space.</p>
      <h2>Where the data comes from</h2>
      <ul>
        <li><strong>FTC Do Not Call complaints</strong>: every daily file the FTC has published since May 27, 2022, kept in full and counted per number.</li>
        <li><strong>Community reports</strong>: reports submitted on Canadial, plus reports imported from other sites, each labelled with where it came from.</li>
        <li><strong>Numbering records</strong>: the Canadian Numbering Administrator (CNAC) and the North American Numbering Plan Administrator (NANPA).</li>
      </ul>
      <p>The details, including how the risk level is worked out, are on the <Link href="/methodology">data sources and methodology</Link> page.</p>
      <h2>Independence</h2>
      <p>Canadial isn&apos;t affiliated with the Government of Canada, the CRTC, the FTC, the Canadian Anti-Fraud Centre, or any phone company. The site is paid for by advertising.</p>
      <h2>Contact</h2>
      <p>Questions, corrections and press: <Link href="/contact">contact us</Link>. If a number belongs to you or your business and you think its page is wrong, use the <Link href="/removal">number removal request</Link>.</p>
    </Prose>
  );
}
