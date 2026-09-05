import Link from "next/link";

const STORAGE_KEY = "canadial_new_ui_banner_dismissed";
const ID = "canadial-new-ui-banner";

// Entry point from the existing homepage to the parallel /app UI.
//
// A server component with one inline script rather than a client component,
// because the homepage is a shared static prerender and this banner sits at the
// very top of the site's most SEO-important page:
//
//   * Rendering it only after hydration pushes the whole page down when it
//     appears — layout shift on the page whose Core Web Vitals matter most.
//   * Rendering it visible and hiding it after hydration flashes it back at
//     everyone who already dismissed it, which rather defeats "dismissable".
//
// The script runs as the parser reaches it, before first paint, so the banner
// is either there or not — no shift, no flash, and no React state to hydrate.
// With JavaScript off it stays hidden, which is the right default for a promo.
const SCRIPT = `(function(){
  var el = document.getElementById(${JSON.stringify(ID)});
  if (!el) return;
  var dismissed = false;
  try { dismissed = localStorage.getItem(${JSON.stringify(STORAGE_KEY)}) !== null; } catch (e) {}
  if (!dismissed) el.hidden = false;
  var btn = el.querySelector("[data-dismiss]");
  if (btn) btn.addEventListener("click", function () {
    el.hidden = true;
    try { localStorage.setItem(${JSON.stringify(STORAGE_KEY)}, "1"); } catch (e) {}
  });
})();`;

export default function NewUiBanner() {
  return (
    <>
      <div
        id={ID}
        hidden
        className="mt-4 flex items-center gap-3 rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-2.5 text-sm"
      >
        <Link href="/app" className="flex-1 text-zinc-700 hover:text-canada">
          <span aria-hidden>✨</span> Try the new Canadial — one question, one
          answer <span className="font-medium text-canada">→</span>
        </Link>
        <button
          type="button"
          data-dismiss
          aria-label="Dismiss"
          className="shrink-0 rounded-md px-2 py-1 text-lg leading-none text-zinc-400 transition-colors hover:bg-zinc-200 hover:text-zinc-600"
        >
          ×
        </button>
      </div>
      <script dangerouslySetInnerHTML={{ __html: SCRIPT }} />
    </>
  );
}
