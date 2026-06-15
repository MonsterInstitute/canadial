import Link from "next/link";

// The Know Your Rights content (English). Shared by /rights and the
// /[lang]/rights placeholder pages until translations are added.
// `home` controls where the closing call-to-action points (language-aware).

function Phone({ number }: { number: string }) {
  const tel = "+1" + number.replace(/\D/g, "");
  return (
    <a className="font-semibold text-canada underline" href={`tel:${tel}`}>
      {number}
    </a>
  );
}

export default function RightsArticle({ home = "/" }: { home?: string }) {
  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-10 sm:py-14">
      <header>
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
          Know Your Rights
        </h1>
        <p className="mt-4 text-lg leading-relaxed text-zinc-700">
          Every day, millions of Canadians receive calls designed to frighten
          them. Scammers know that many people are worried about taxes, debt, or
          immigration status — and they use that fear against you. This guide is
          here to help you understand your rights and know exactly what to do.
        </p>
      </header>

      {/* 1. CRA */}
      <section className="mt-12">
        <h2 className="text-2xl font-bold tracking-tight">
          Someone called claiming to be CRA
        </h2>
        <p className="mt-3 leading-relaxed text-zinc-700">
          A real call from the Canada Revenue Agency feels very different from a
          scam. Here is how to tell them apart.
        </p>

        <div className="mt-4 overflow-hidden rounded-xl border border-zinc-200">
          <table className="w-full text-left text-sm">
            <thead className="bg-zinc-50 text-zinc-700">
              <tr>
                <th className="px-4 py-3 font-semibold">A real CRA agent</th>
                <th className="px-4 py-3 font-semibold">A scammer</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200 align-top text-zinc-600">
              <tr>
                <td className="px-4 py-3">
                  Sends a letter by mail first, before ever calling
                </td>
                <td className="px-4 py-3">
                  Calls out of the blue and creates urgency
                </td>
              </tr>
              <tr>
                <td className="px-4 py-3">
                  Is calm and lets you verify their identity
                </td>
                <td className="px-4 py-3">
                  Threatens you with arrest, deportation, or police
                </td>
              </tr>
              <tr>
                <td className="px-4 py-3">
                  Accepts normal, traceable payment methods
                </td>
                <td className="px-4 py-3">
                  Demands gift cards, e-transfers, crypto, or Bitcoin
                </td>
              </tr>
              <tr>
                <td className="px-4 py-3">
                  Never pressures you to act in the next few minutes
                </td>
                <td className="px-4 py-3">
                  Says you must pay immediately or face consequences
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <h3 className="mt-6 font-semibold text-zinc-900">
          The CRA will NEVER:
        </h3>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-zinc-700">
          <li>Threaten you with immediate arrest or send the police</li>
          <li>Demand payment by gift cards, cryptocurrency, or e-transfer</li>
          <li>Ask for your SIN, passport, or banking details over the phone</li>
          <li>Use aggressive or threatening language to scare you</li>
        </ul>

        <h3 className="mt-6 font-semibold text-zinc-900">What to do:</h3>
        <ol className="mt-2 list-decimal space-y-1 pl-5 text-zinc-700">
          <li>Hang up. You are allowed to simply end the call.</li>
          <li>Take a breath. Nothing bad happens because you hung up.</li>
          <li>
            If you want to be sure, call the CRA directly at{" "}
            <Phone number="1-800-959-8281" />.
          </li>
        </ol>

        <div className="mt-5 rounded-xl border border-blue-200 bg-blue-50 p-5 text-blue-900">
          You are not in trouble. Real tax issues are handled by mail first,
          never by surprise phone calls.
        </div>
      </section>

      {/* 2. Debt collector */}
      <section className="mt-12">
        <h2 className="text-2xl font-bold tracking-tight">
          A debt collector called me
        </h2>
        <p className="mt-3 leading-relaxed text-zinc-700">
          Dealing with debt is already stressful. You deserve to be treated with
          dignity, and the law is on your side.
        </p>

        <h3 className="mt-6 font-semibold text-zinc-900">Your rights:</h3>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-zinc-700">
          <li>You have the right to be treated respectfully, without threats</li>
          <li>You can ask for proof that the debt is really yours</li>
          <li>You can ask a collector to only contact you in writing</li>
        </ul>

        <h3 className="mt-6 font-semibold text-zinc-900">
          A collector cannot:
        </h3>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-zinc-700">
          <li>Threaten, intimidate, or use abusive language</li>
          <li>Call before 7:00 a.m. or after 9:00 p.m.</li>
          <li>Contact your employer, family, or friends about your debt</li>
          <li>Call so often that it amounts to harassment</li>
        </ul>

        <div className="mt-5 rounded-xl border border-blue-200 bg-blue-50 p-5 text-blue-900">
          You don&apos;t have to face this alone. To report abuse, contact the
          Financial Consumer Agency of Canada at{" "}
          <Phone number="1-866-461-3222" />.
        </div>
      </section>

      {/* 3. Sales calls */}
      <section className="mt-12">
        <h2 className="text-2xl font-bold tracking-tight">
          I keep getting sales calls
        </h2>
        <p className="mt-3 leading-relaxed text-zinc-700">
          You can stop most unwanted telemarketing calls for free by adding your
          number to Canada&apos;s National Do Not Call List. It takes about two
          minutes.
        </p>
        <ul className="mt-4 list-disc space-y-1 pl-5 text-zinc-700">
          <li>
            Register online at{" "}
            <a
              href="https://lnnte-dncl.gc.ca/"
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold text-canada underline"
            >
              lnnte-dncl.gc.ca
            </a>
          </li>
          <li>
            Or register by phone at <Phone number="1-866-580-3625" />
          </li>
        </ul>
      </section>

      {/* 4. Scammed */}
      <section className="mt-12">
        <h2 className="text-2xl font-bold tracking-tight">
          I think I was scammed
        </h2>
        <div className="mt-3 rounded-xl border border-blue-200 bg-blue-50 p-5 text-blue-900">
          It&apos;s okay. Scammers are professionals at manipulation. This is not
          your fault.
        </div>

        <h3 className="mt-6 font-semibold text-zinc-900">Steps to take:</h3>
        <ol className="mt-2 list-decimal space-y-1 pl-5 text-zinc-700">
          <li>
            If you shared banking details, call your bank right away to protect
            your accounts.
          </li>
          <li>
            Write down what happened — the number, the time, and what was said.
          </li>
          <li>
            Report it to the Canadian Anti-Fraud Centre at{" "}
            <Phone number="1-888-495-8501" />.
          </li>
          <li>
            If you lost money, also report it to your local police service.
          </li>
        </ol>
      </section>

      <div className="mt-12 rounded-xl border border-zinc-200 bg-zinc-50 p-6 text-center">
        <p className="text-zinc-700">
          Got a call you&apos;re unsure about? Look it up and report it to
          protect others.
        </p>
        <Link
          href={home}
          className="mt-4 inline-block rounded-lg bg-canada px-5 py-2.5 font-semibold text-white hover:bg-red-700"
        >
          Look up a number
        </Link>
      </div>
    </div>
  );
}
