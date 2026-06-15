import type { Metadata } from "next";
import RightsArticle from "@/components/RightsArticle";

export const metadata: Metadata = {
  title: "Know Your Rights — Canadian Phone Scam & Spam Guide",
  description:
    "What to do when you receive a suspicious call in Canada. Free guide to CRA scams, debt collector rights, and telemarketer blocking.",
  alternates: { canonical: "/rights" },
};

export default function RightsPage() {
  return <RightsArticle home="/" />;
}
