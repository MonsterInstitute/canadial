"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { requestApiKey, type KeyState } from "@/app/api-keys/actions";

const USES = ["Personal project", "Commercial app", "Research", "Enterprise"];

function CopyButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(value);
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        } catch {
          /* clipboard unavailable — ignore */
        }
      }}
      className="shrink-0 rounded-lg border border-green-300 bg-white px-3 py-2 text-sm font-medium text-green-800 transition-colors hover:bg-green-100"
    >
      {copied ? "Copied!" : "Copy"}
    </button>
  );
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-lg bg-canada px-5 py-2.5 font-semibold text-white transition-colors hover:bg-red-700 disabled:opacity-60"
    >
      {pending ? "Generating…" : "Get free API key"}
    </button>
  );
}

export default function ApiKeyForm() {
  const [state, formAction] = useActionState<KeyState, FormData>(requestApiKey, {
    ok: false,
    message: "",
  });

  if (state.ok && state.apiKey) {
    return (
      <div className="rounded-xl border border-green-200 bg-green-50 p-6">
        <h2 className="text-lg font-semibold text-green-900">
          Your API key is ready
        </h2>
        <p className="mt-1 text-sm text-green-800">{state.message}</p>
        <div className="mt-4 flex items-stretch gap-2">
          <code className="flex-1 overflow-x-auto rounded-lg border border-green-200 bg-white px-4 py-3 font-mono text-sm">
            {state.apiKey}
          </code>
          <CopyButton value={state.apiKey} />
        </div>
        <div className="mt-4 text-sm text-zinc-700">
          <p className="font-medium">Try it:</p>
          <pre className="mt-1 overflow-x-auto rounded-lg bg-zinc-900 p-3 text-xs text-zinc-100">
{`curl -H "Authorization: Bearer ${state.apiKey}" \\
  "https://www.canadial.com/api/v1/lookup?phone=4165551234"`}
          </pre>
        </div>
      </div>
    );
  }

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <label className="flex flex-col gap-1">
        <span className="text-sm font-medium text-zinc-700">Name</span>
        <input
          name="name"
          required
          className="rounded-lg border border-zinc-300 px-3 py-2 outline-none focus:border-canada focus:ring-2 focus:ring-canada/30"
        />
      </label>
      <label className="flex flex-col gap-1">
        <span className="text-sm font-medium text-zinc-700">Email</span>
        <input
          name="email"
          type="email"
          required
          className="rounded-lg border border-zinc-300 px-3 py-2 outline-none focus:border-canada focus:ring-2 focus:ring-canada/30"
        />
      </label>
      <label className="flex flex-col gap-1">
        <span className="text-sm font-medium text-zinc-700">Intended use</span>
        <select
          name="use"
          defaultValue={USES[0]}
          className="rounded-lg border border-zinc-300 px-3 py-2 outline-none focus:border-canada focus:ring-2 focus:ring-canada/30"
        >
          {USES.map((u) => (
            <option key={u} value={u}>
              {u}
            </option>
          ))}
        </select>
      </label>

      <div className="flex items-center gap-3">
        <SubmitButton />
        {!state.ok && state.message && (
          <span className="text-sm text-canada">{state.message}</span>
        )}
      </div>
    </form>
  );
}
