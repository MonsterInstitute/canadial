"use client";

import { useEffect, useState } from "react";

// Search count and "Did this number call you?" for a number page. Loaded in
// the browser because the page itself is edge-cached for a day. The view is
// counted once per browser per day (and the server de-duplicates too); bots
// that don't run JavaScript never send it.

type Activity = {
  views: { total: number; week: number };
  feedback: { yes: number; no: number; scam: number; telemarketer: number; robocall: number; debt: number; silent: number; other: number };
};

const TYPES: { key: keyof Activity["feedback"]; label: string }[] = [
  { key: "scam", label: "Scam" },
  { key: "telemarketer", label: "Sales call" },
  { key: "robocall", label: "Robocall" },
  { key: "debt", label: "Debt / collections" },
  { key: "silent", label: "Silent / hung up" },
  { key: "other", label: "Other" },
];

const today = () => new Date().toISOString().slice(0, 10);
const nf = (n: number) => n.toLocaleString("en-CA");

function store(key: string, value?: string): string | null {
  try {
    if (value !== undefined) localStorage.setItem(key, value);
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

export default function NumberActivity({ phone, pretty }: { phone: string; pretty: string }) {
  const [data, setData] = useState<Activity | null>(null);
  const [answered, setAnswered] = useState<string | null>(null);
  const [step, setStep] = useState<"ask" | "type" | "done">("ask");

  useEffect(() => {
    const viewKey = `cd:view:${phone}`;
    const first = store(viewKey) !== today();
    const req = first
      ? fetch(`/api/numbers/${phone}/view`, { method: "POST" })
      : fetch(`/api/numbers/${phone}/stats`);
    req
      .then((r) => (r.ok ? (r.json() as Promise<Activity>) : null))
      .then((j) => {
        if (j) setData(j);
        if (first) store(viewKey, today());
      })
      .catch(() => {});
    // Restore an earlier answer after hydration (localStorage isn't available
    // when the page is rendered on the server).
    const prev = store(`cd:fb:${phone}`);
    if (prev) {
      queueMicrotask(() => {
        setAnswered(prev);
        setStep("done");
      });
    }
  }, [phone]);

  async function answer(called: boolean, type?: string) {
    const r = await fetch(`/api/numbers/${phone}/feedback`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ called, type }),
    }).catch(() => null);
    if (r?.ok) setData((await r.json()) as Activity);
    const value = called ? `yes:${type ?? ""}` : "no";
    store(`cd:fb:${phone}`, value);
    setAnswered(value);
    setStep("done");
  }

  const fb = data?.feedback;
  const votes = fb ? fb.yes + fb.no : 0;
  const typed = fb ? TYPES.map((t) => ({ ...t, n: fb[t.key] })).filter((t) => t.n > 0).sort((a, b) => b.n - a.n) : [];

  return (
    <section className="mt-8 grid gap-4 sm:grid-cols-2">
      <div className="rounded-xl border border-zinc-200 p-4">
        <h2 className="text-sm font-semibold text-zinc-900">Searches on Canadial</h2>
        {data ? (
          <p className="mt-2 text-sm text-zinc-700">
            <span className="text-2xl font-bold text-zinc-900">{nf(data.views.week)}</span> this week ·{" "}
            <span className="font-semibold">{nf(data.views.total)}</span> in total
          </p>
        ) : (
          <p className="mt-2 text-sm text-zinc-400">Loading…</p>
        )}
        <p className="mt-1 text-xs text-zinc-500">Real visits to this page, counted once per visitor per day.</p>
      </div>

      <div className="rounded-xl border border-zinc-200 p-4">
        <h2 className="text-sm font-semibold text-zinc-900">Did {pretty} call you?</h2>
        {step === "ask" && (
          <div className="mt-2 flex gap-2">
            <button onClick={() => setStep("type")} className="rounded-lg bg-canada px-4 py-1.5 text-sm font-semibold text-white hover:bg-red-700">Yes</button>
            <button onClick={() => answer(false)} className="rounded-lg border border-zinc-300 px-4 py-1.5 text-sm font-semibold hover:bg-zinc-50">No</button>
          </div>
        )}
        {step === "type" && (
          <div className="mt-2">
            <p className="text-xs text-zinc-500">What kind of call was it? (optional)</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {TYPES.map((t) => (
                <button key={t.key} onClick={() => answer(true, t.key)} className="rounded-full border border-zinc-300 px-3 py-1 text-xs hover:bg-zinc-50">{t.label}</button>
              ))}
              <button onClick={() => answer(true)} className="rounded-full px-3 py-1 text-xs text-zinc-500 underline">Skip</button>
            </div>
          </div>
        )}
        {step === "done" && answered && <p className="mt-2 text-xs text-zinc-500">Thanks — your answer is counted.</p>}
        {fb && votes > 0 && (
          <div className="mt-3 text-sm text-zinc-700">
            <p><strong>{nf(fb.yes)}</strong> said yes · <strong>{nf(fb.no)}</strong> said no</p>
            {typed.length > 0 && <p className="mt-1 text-xs text-zinc-500">{typed.map((t) => `${t.label}: ${nf(t.n)}`).join(" · ")}</p>}
          </div>
        )}
      </div>
    </section>
  );
}
