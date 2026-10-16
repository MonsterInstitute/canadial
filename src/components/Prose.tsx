// Simple long-form page wrapper for the trust pages.
export default function Prose({ title, updated, children }: { title: string; updated?: string; children: React.ReactNode }) {
  return (
    <article className="mx-auto w-full max-w-2xl px-4 py-10 text-zinc-800 [&_h2]:mt-8 [&_h2]:text-lg [&_h2]:font-semibold [&_li]:mt-1 [&_p]:mt-3 [&_p]:leading-relaxed [&_ul]:mt-3 [&_ul]:list-disc [&_ul]:pl-5 [&_a]:text-canada [&_a]:underline">
      <h1 className="text-3xl font-bold">{title}</h1>
      {updated && <p className="text-xs text-zinc-500">Last updated {updated}</p>}
      {children}
    </article>
  );
}
