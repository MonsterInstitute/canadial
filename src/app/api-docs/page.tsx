import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Canadial API — Phone Spam Lookup for Developers",
  description:
    "Add real-time Canadian spam call detection to your app with the Canadial API. Free tier, simple REST endpoint, trusted community data.",
  alternates: { canonical: "/api-docs" },
};

const RESPONSE_JSON = `{
  "phone": "4165551234",
  "risk_level": "high",
  "risk_score": 85,
  "type": "Scam",
  "report_count": 47,
  "label": "CRA Impersonation Scam",
  "is_legitimate": false,
  "organization": null,
  "last_reported": "2026-06-15",
  "source": "canadial_community"
}`;

const CURL = `curl -H "Authorization: Bearer YOUR_API_KEY" \\
  "https://canadial.com/api/v1/lookup?phone=4165551234"`;

const JS = `const res = await fetch(
  "https://canadial.com/api/v1/lookup?phone=4165551234",
  { headers: { Authorization: "Bearer YOUR_API_KEY" } }
);
const data = await res.json();
console.log(data.risk_level, data.risk_score);`;

const PYTHON = `import requests

res = requests.get(
    "https://canadial.com/api/v1/lookup",
    params={"phone": "4165551234"},
    headers={"Authorization": "Bearer YOUR_API_KEY"},
)
print(res.json()["risk_level"])`;

const PHP = `<?php
$ch = curl_init("https://canadial.com/api/v1/lookup?phone=4165551234");
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_HTTPHEADER, ["Authorization: Bearer YOUR_API_KEY"]);
$data = json_decode(curl_exec($ch), true);
echo $data["risk_level"];`;

function Code({ children }: { children: string }) {
  return (
    <pre className="mt-3 overflow-x-auto rounded-lg bg-zinc-900 p-4 text-xs leading-relaxed text-zinc-100">
      {children}
    </pre>
  );
}

export default function ApiDocsPage() {
  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-10 sm:py-14">
      <header>
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
          Canadial API — Phone Spam Lookup for Developers
        </h1>
        <p className="mt-4 text-lg leading-relaxed text-zinc-700">
          Add real-time spam call detection to your app in minutes. Trusted
          Canadian data from a community-reported database.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            href="/api-keys"
            className="rounded-lg bg-canada px-5 py-2.5 font-semibold text-white hover:bg-red-700"
          >
            Get a free API key
          </Link>
          <Link
            href="/pricing"
            className="rounded-lg border border-zinc-300 px-5 py-2.5 font-semibold text-zinc-700 hover:border-canada hover:text-canada"
          >
            View pricing
          </Link>
        </div>
      </header>

      {/* 1. Quick start */}
      <section className="mt-12">
        <h2 className="text-2xl font-bold tracking-tight">Quick start</h2>
        <Code>{CURL}</Code>
        <p className="mt-4 text-sm font-medium text-zinc-700">Example response:</p>
        <Code>{RESPONSE_JSON}</Code>
      </section>

      {/* 2. Authentication */}
      <section className="mt-12">
        <h2 className="text-2xl font-bold tracking-tight">Authentication</h2>
        <p className="mt-3 leading-relaxed text-zinc-700">
          Pass your key as a bearer token in the{" "}
          <code className="rounded bg-zinc-100 px-1.5 py-0.5 text-sm">
            Authorization
          </code>{" "}
          header. Get your free API key at{" "}
          <Link href="/api-keys" className="font-semibold text-canada underline">
            canadial.com/api-keys
          </Link>
          .
        </p>
        <Code>{`Authorization: Bearer YOUR_API_KEY`}</Code>
      </section>

      {/* 3. Endpoints */}
      <section className="mt-12">
        <h2 className="text-2xl font-bold tracking-tight">Endpoints</h2>
        <div className="mt-4 rounded-xl border border-zinc-200 p-5">
          <code className="font-mono text-sm font-semibold text-zinc-900">
            GET /api/v1/lookup
          </code>
          <p className="mt-2 text-sm text-zinc-600">
            <strong>phone</strong> (required) — a 10-digit Canadian or US phone
            number. Spaces, dashes, and a leading +1 are accepted.
          </p>
        </div>
      </section>

      {/* 4. Risk levels */}
      <section className="mt-12">
        <h2 className="text-2xl font-bold tracking-tight">Risk levels</h2>
        <div className="mt-4 overflow-hidden rounded-xl border border-zinc-200">
          <table className="w-full text-left text-sm">
            <thead className="bg-zinc-50 text-zinc-700">
              <tr>
                <th className="px-4 py-3 font-semibold">risk_level</th>
                <th className="px-4 py-3 font-semibold">Meaning</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200 text-zinc-600">
              <tr><td className="px-4 py-3 font-medium">high</td><td className="px-4 py-3">10+ reports, confirmed spam/scam</td></tr>
              <tr><td className="px-4 py-3 font-medium">medium</td><td className="px-4 py-3">3–9 reports</td></tr>
              <tr><td className="px-4 py-3 font-medium">low</td><td className="px-4 py-3">1–2 reports</td></tr>
              <tr><td className="px-4 py-3 font-medium">safe</td><td className="px-4 py-3">Verified legitimate organization</td></tr>
              <tr><td className="px-4 py-3 font-medium">unknown</td><td className="px-4 py-3">No data for this number yet</td></tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* 5. Rate limits */}
      <section className="mt-12">
        <h2 className="text-2xl font-bold tracking-tight">Rate limits</h2>
        <div className="mt-4 overflow-hidden rounded-xl border border-zinc-200">
          <table className="w-full text-left text-sm">
            <thead className="bg-zinc-50 text-zinc-700">
              <tr>
                <th className="px-4 py-3 font-semibold">Plan</th>
                <th className="px-4 py-3 font-semibold">Requests</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200 text-zinc-600">
              <tr><td className="px-4 py-3 font-medium">Free</td><td className="px-4 py-3">100 / month</td></tr>
              <tr><td className="px-4 py-3 font-medium">Developer — $29/mo</td><td className="px-4 py-3">10,000 / month</td></tr>
              <tr><td className="px-4 py-3 font-medium">Business — $99/mo</td><td className="px-4 py-3">100,000 / month</td></tr>
              <tr><td className="px-4 py-3 font-medium">Enterprise</td><td className="px-4 py-3">Contact us</td></tr>
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-sm text-zinc-500">
          Every response includes <code className="rounded bg-zinc-100 px-1 py-0.5">X-RateLimit-Remaining</code>.
          Over-limit requests return <code className="rounded bg-zinc-100 px-1 py-0.5">429</code>.
        </p>
      </section>

      {/* 6. Code examples */}
      <section className="mt-12">
        <h2 className="text-2xl font-bold tracking-tight">Code examples</h2>
        <h3 className="mt-4 font-semibold text-zinc-900">JavaScript / Node.js</h3>
        <Code>{JS}</Code>
        <h3 className="mt-6 font-semibold text-zinc-900">Python</h3>
        <Code>{PYTHON}</Code>
        <h3 className="mt-6 font-semibold text-zinc-900">PHP</h3>
        <Code>{PHP}</Code>
      </section>

      {/* 7. Use cases */}
      <section className="mt-12">
        <h2 className="text-2xl font-bold tracking-tight">Use cases</h2>
        <ul className="mt-4 list-disc space-y-1 pl-5 text-zinc-700">
          <li>Call blocker apps — screen incoming numbers in real time</li>
          <li>CRM systems — show caller risk before answering</li>
          <li>Senior protection apps — warn vulnerable users about scam calls</li>
          <li>Browser extensions — flag suspicious numbers on web pages</li>
        </ul>
      </section>

      <div className="mt-12 rounded-xl border border-zinc-200 bg-zinc-50 p-6 text-center">
        <p className="text-zinc-700">Ready to build? Grab a free key and start in minutes.</p>
        <Link
          href="/api-keys"
          className="mt-4 inline-block rounded-lg bg-canada px-5 py-2.5 font-semibold text-white hover:bg-red-700"
        >
          Get API Key
        </Link>
      </div>
    </div>
  );
}
