import type { Metadata } from "next";
import ApiKeyForm from "@/components/ApiKeyForm";

export const metadata: Metadata = {
  title: "Get an API Key",
  description:
    "Request a free Canadial API key to add Canadian phone spam lookup to your app.",
  alternates: { canonical: "/api-keys" },
};

export default function ApiKeysPage() {
  return (
    <div className="mx-auto w-full max-w-xl px-4 py-10 sm:py-14">
      <header>
        <h1 className="text-3xl font-bold tracking-tight">Get an API key</h1>
        <p className="mt-3 text-zinc-700">
          Free tier includes 100 lookups per month — no credit card required.
        </p>
      </header>
      <div className="mt-8">
        <ApiKeyForm />
      </div>
    </div>
  );
}
