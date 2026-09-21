import { scrapeRemoteOK } from "./sources/remoteok.js";
import { scrapeJobicy } from "./sources/jobicy.js";
import { scrapeHimalayas } from "./sources/himalayas.js";
import { scrapeRemotive } from "./sources/remotive.js";
import { scrapeArbeitnow } from "./sources/arbeitnow.js";

export async function runAllRemoteScrapers() {
  const started = Date.now();
  console.log("[remote-scrapers] Starting…");

  const results = await Promise.allSettled([
    scrapeRemoteOK(),
    scrapeJobicy(),
    scrapeHimalayas(),
    scrapeRemotive(),
    scrapeArbeitnow(),
  ]);

  const names = ["remoteok", "jobicy", "himalayas", "remotive", "arbeitnow"];
  const summary = results.map((r, i) =>
    r.status === "fulfilled" ? r.value : { source: names[i], error: r.reason?.message || "failed", total: 0 }
  );

  const totalNew = summary.reduce((s, r) => s + (r.inserted || 0), 0);
  const totalUpdated = summary.reduce((s, r) => s + (r.updated || 0), 0);
  const totalFetched = summary.reduce((s, r) => s + (r.total || 0), 0);

  console.log(`[remote-scrapers] Done in ${Date.now() - started}ms — fetched ${totalFetched}, new ${totalNew}, updated ${totalUpdated}`);
  return { summary, totalNew, totalUpdated, totalFetched };
}
