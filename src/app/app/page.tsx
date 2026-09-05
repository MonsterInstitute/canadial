import type { Metadata } from "next";
import PhoneSearch from "@/components/app/PhoneSearch";

// No database read at all: one question, one input, nothing to look up until
// the visitor types. Fully static, so it costs nothing per visit.
export const metadata: Metadata = {
  title: { absolute: "Who just called you? | Canadial" },
  description:
    "Type or paste the number that just called. Canadial tells you in one second whether it is a scam, a legitimate business, or something nobody has reported yet.",
};

export default function AppHome() {
  return (
    <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-5 pb-16 pt-6">
      <h1 className="text-center text-4xl font-bold leading-tight tracking-tight sm:text-5xl">
        Who just called you?
      </h1>
      <p className="mx-auto mt-4 max-w-sm text-center text-lg leading-relaxed text-white/55">
        Type or paste the number. We&apos;ll tell you in one second.
      </p>

      <div className="mt-9">
        <PhoneSearch />
      </div>

      <p className="mt-8 text-center text-base text-white/45">
        Take a breath. You did the right thing.
      </p>
    </div>
  );
}
