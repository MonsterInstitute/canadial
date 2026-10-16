import type { Metadata } from "next";
import Link from "next/link";
import Prose from "@/components/Prose";
import { latestFtcDay } from "@/lib/hub-data";
import { formatDate } from "@/lib/number-data";

export const revalidate = 86400; // shows the latest FTC data date

export const metadata: Metadata = { title: "Data sources and methodology", description: "Where Canadial's data comes from, how it is counted, and how the risk level is calculated.", alternates: { canonical: "/methodology" } };

export default async function Methodology() {
  const day = await latestFtcDay();
  return (
    <Prose title="Data sources and methodology">
      <h2>FTC Do Not Call complaints</h2>
      <p>The U.S. Federal Trade Commission publishes the phone numbers people complain about to its Do Not Call registry, one file per weekday. Canadial keeps every file published since May 27, 2022{day ? `, most recently ${formatDate(day)}` : ""}, unchanged, and counts them per number:</p>
      <ul>
        <li><strong>Complaints</strong>: one per row in the FTC files. The FTC sometimes republishes a row in a later file; an identical row within seven files of the first is counted once.</li>
        <li><strong>Dates</strong>: the date of the call as the complainant gave it. When that date is missing, after the file was published, or more than a year earlier, the date the complaint was filed is used instead.</li>
        <li><strong>Categories</strong>: the subject the complainant chose from the FTC&apos;s list. <strong>Robocall share</strong> is the share of complaints marked as a recorded message.</li>
        <li><strong>Complainant location</strong>: the U.S. state the complainant gave. FTC complainants are mostly U.S. residents.</li>
        <li>Rows without a valid 10-digit North American number are skipped.</li>
        <li><strong>Time of day and weekday</strong>: of the call as the complainant entered it; the FTC doesn&apos;t record a time zone. Times of exactly midnight or noon are left out: they are far more common than any minute around them, which is what a form default looks like. Complaints dated by the filing date have no call time or weekday.</li>
        <li><strong>Cities</strong>: as typed by complainants, with case, ZIP codes and a trailing state removed so spellings of one city are counted together. Entries that aren&apos;t a place name are skipped. Each number keeps its ten most common cities.</li>
        <li><strong>Same area code</strong>: complaints whose complainant area code is the number&apos;s own. Shown for U.S. numbers with three or more complaints when at least half, or at most a tenth, of complainants share it.</li>
      </ul>
      <h2 id="groups">Groups of similar numbers</h2>
      <p>Some callers cycle through many numbers from one block. A number page shows a group when numbers in the same block (like 475-378), whose most common FTC category is the same, were first reported within three days of each other in a chain, and there are too many of them to be chance: fewer than one in a billion, compared with how often that category&apos;s numbers were first reported across the whole area code in those days. Numbers whose category is &ldquo;Other&rdquo; or not given, and toll-free numbers, are left out.</p>
      <p>We checked the rule by shuffling numbers between blocks of the same area code and running it again: the shuffled data produced about 15% as many grouped numbers as the real data. So most groups reflect real clustering, but not every number in a group was used by the same caller.</p>
      <p>FTC complaints are not verified by the FTC or by Canadial. Scam callers often fake (spoof) the number that appears on caller ID, so complaints about a number don&apos;t prove its owner made the calls.</p>
      <h2>Community reports</h2>
      <p>Reports come from three places, and each report on a number page says which:</p>
      <ul>
        <li><strong>Submitted on Canadial</strong>: people using the report form on number pages.</li>
        <li><strong>Imported from 800notes.com</strong>: comments imported in June 2026. The date shown is the import date, not when the comment was first written.</li>
        <li><strong>ReverseCanada.com</strong>: numbers that site listed as suspicious, checked daily.</li>
      </ul>
      <p>Reports that break the rules (personal information, abuse, false claims) are hidden after review; they are kept, not deleted, so decisions can be reviewed.</p>
      <h2>Number blocks</h2>
      <p>Phone numbers are assigned to carriers in blocks: an area code and exchange (like 416-555), and in the U.S. often in blocks of a thousand. Canadial uses the Canadian Numbering Administrator&apos;s CO code status list and the North American Numbering Plan Administrator&apos;s code and thousands-block assignment records, refreshed monthly.</p>
      <ul>
        <li>A page shows who the <strong>block</strong> is assigned to. Numbers can be moved to another carrier, so this isn&apos;t necessarily the number&apos;s current carrier.</li>
        <li>When a block isn&apos;t assigned to any carrier, no working line can have the number, so a call showing it almost certainly used a spoofed caller ID. Pages say so.</li>
        <li>Toll-free numbers (800, 833, 844, 855, 866, 877, 888) have no public block records.</li>
      </ul>
      <h2>Risk level</h2>
      <p>Each number page gives a risk level from three facts: the total number of complaints and reports, how recent the latest one is (measured against the date of the latest FTC data), and the share of FTC complaints that were robocalls.</p>
      <ul>
        <li><strong>High</strong>: 100 or more complaints, or 20 or more with the latest in the last 90 days.</li>
        <li><strong>Medium</strong>: 20 or more complaints, or 3 or more with the latest in the last 365 days, or 3 or more of which at least 75% were robocalls.</li>
        <li><strong>Low</strong>: any other number with complaints.</li>
        <li><strong>Verified organization</strong>: numbers in our list of verified organizations.</li>
      </ul>
      <p>The line under the level prints the facts it was based on.</p>
      <h2>Search counts and “Did this number call you?”</h2>
      <p>Search counts are visits to a number&apos;s page from a web browser, counted once per visitor per day. Requests from known bots and automated tools aren&apos;t counted. Answers to “Did this number call you?” are limited to one per visitor per number every 30 days. Neither stores IP addresses; see the <Link href="/privacy">privacy policy</Link>.</p>
    </Prose>
  );
}
