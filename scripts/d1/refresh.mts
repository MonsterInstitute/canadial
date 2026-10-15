// Run src/lib/refresh.ts refreshAll() from a terminal against the remote
// production database (the wrangler "build" environment) — for the initial
// load, before a Worker exists to call /api/admin/refresh:
//
//   npx tsx --conditions=react-server scripts/d1/refresh.mts
//
// --conditions=react-server lets the "server-only" import resolve outside
// Next. NEXT_RUNTIME/NEXT_DEV_WRANGLER_ENV make getCloudflareContext() fetch
// the bindings from wrangler, the same path Next's build workers take.
process.env.NEXT_RUNTIME = "nodejs";
process.env.NEXT_DEV_WRANGLER_ENV ??= "build";
const { refreshAll } = await import("../../src/lib/refresh.ts");
console.log(await refreshAll());
process.exit(0);
