import type { Metadata } from "next";
import Link from "next/link";
import Prose from "@/components/Prose";

export const metadata: Metadata = { title: "Privacy policy", description: "What Canadial collects, why, and how long it keeps it.", alternates: { canonical: "/privacy" } };

export default function Privacy() {
  return (
    <Prose title="Privacy policy" updated="October 16, 2026">
      <p>This page explains what Canadial collects when you use the site and what it does with it.</p>
      <h2>Looking up a number</h2>
      <p>Looking up a number doesn&apos;t require an account and doesn&apos;t store anything about you. To count real visits, your browser sends a small request after a number page loads. To count each visitor once per day, the site keeps a one-way hash of your IP address and the number in its cache for up to 24 hours (30 days for “Did this number call you?” answers). The hash can&apos;t be turned back into your IP address, and IP addresses aren&apos;t stored. Your browser also remembers, in its local storage, which numbers you viewed today and answered, so it doesn&apos;t send them twice.</p>
      <h2>Reports, contact messages and removal requests</h2>
      <ul>
        <li><strong>Reports</strong> you submit (the phone number, call type and comment) are stored and shown on that number&apos;s page. Don&apos;t include personal information in a comment.</li>
        <li><strong>Contact messages and removal requests</strong> (your name, email and message) are stored so we can reply, and are never shown publicly.</li>
        <li><strong>API keys</strong>: the name and email you give are stored to manage your key.</li>
      </ul>
      <h2>Advertising</h2>
      <p>Canadial shows ads from Google AdSense. Google and its partners may use cookies to show ads based on your visits to this and other sites. You can manage ad personalization in <a href="https://adssettings.google.com/" rel="noopener noreferrer" target="_blank">Google&apos;s ad settings</a>; Google&apos;s use of data is described in <a href="https://policies.google.com/technologies/partner-sites" rel="noopener noreferrer" target="_blank">How Google uses information from sites that use its services</a>.</p>
      <h2>Hosting</h2>
      <p>The site runs on Cloudflare. Cloudflare processes requests (including IP addresses) to deliver and protect the site and keeps operational logs for a limited time.</p>
      <h2>Questions and corrections</h2>
      <p>To ask what we hold about you, or to have a report or message deleted, <Link href="/contact">contact us</Link>.</p>
    </Prose>
  );
}
