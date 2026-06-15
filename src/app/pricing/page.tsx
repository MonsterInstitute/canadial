import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "API Pricing",
  description:
    "Canadial API pricing — free tier and paid plans for Canadian phone spam lookup. Start free, no credit card.",
  alternates: { canonical: "/pricing" },
};

const PLANS = [
  {
    name: "Free",
    price: "$0",
    cadence: "forever",
    requests: "100 requests / month",
    note: "No credit card required",
    featured: false,
  },
  {
    name: "Developer",
    price: "$29",
    cadence: "/month",
    requests: "10,000 requests / month",
    note: "For side projects and small apps",
    featured: true,
  },
  {
    name: "Business",
    price: "$99",
    cadence: "/month",
    requests: "100,000 requests / month",
    note: "For production apps at scale",
    featured: false,
  },
  {
    name: "Enterprise",
    price: "Custom",
    cadence: "",
    requests: "Unlimited / SLA",
    note: "Volume pricing and support",
    featured: false,
  },
];

export default function PricingPage() {
  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-10 sm:py-14">
      <header className="text-center">
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
          API Pricing
        </h1>
        <p className="mx-auto mt-4 max-w-xl text-lg text-zinc-700">
          Start free, upgrade when you grow. Every plan uses the same trusted
          Canadian spam-lookup data.
        </p>
      </header>

      <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {PLANS.map((p) => (
          <div
            key={p.name}
            className={`flex flex-col rounded-xl border p-6 ${
              p.featured ? "border-canada ring-2 ring-canada/20" : "border-zinc-200"
            }`}
          >
            <h2 className="text-lg font-semibold text-zinc-900">{p.name}</h2>
            <div className="mt-2">
              <span className="text-3xl font-bold tracking-tight">{p.price}</span>
              {p.cadence && (
                <span className="text-sm text-zinc-500"> {p.cadence}</span>
              )}
            </div>
            <p className="mt-3 font-medium text-zinc-800">{p.requests}</p>
            <p className="mt-1 text-sm text-zinc-500">{p.note}</p>
            <div className="mt-6 flex-1" />
            <Link
              href={p.name === "Enterprise" ? "mailto:hello@canadial.com" : "/api-keys"}
              className={`mt-2 rounded-lg px-4 py-2.5 text-center font-semibold ${
                p.featured
                  ? "bg-canada text-white hover:bg-red-700"
                  : "border border-zinc-300 text-zinc-700 hover:border-canada hover:text-canada"
              }`}
            >
              {p.name === "Enterprise"
                ? "Contact us"
                : p.name === "Free"
                ? "Get API Key"
                : "Get started"}
            </Link>
          </div>
        ))}
      </div>

      <p className="mt-8 text-center text-sm text-zinc-500">
        Looking for integration details? See the{" "}
        <Link href="/api-docs" className="font-semibold text-canada underline">
          API documentation
        </Link>
        .
      </p>
    </div>
  );
}
