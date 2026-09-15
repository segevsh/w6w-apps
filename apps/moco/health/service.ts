/**
 * `status.mocoapp.com` redirects to `www.mocoappstatus.com`, an Atlassian Statuspage-hosted page
 * (verified live 2026-09-15: `curl -sI https://status.mocoapp.com` → `302` →
 * `www.mocoappstatus.com`) that publishes a real Atom history feed at `/history.atom` — so this
 * is declared with `feed` rather than hand-parsed, same convention as `apps/bitly`'s
 * status.bitly.com. The host fetches and parses it; this hook only interprets what it means.
 *
 * Statuspage.io entries prefix each update's body with the status word (`Resolved - …`,
 * `Monitoring - …`, `Investigating - …`) rather than a structured field — confirmed against
 * a live entry ("Resolved - All systems are now operational."). So this reads the newest update
 * per incident (`latest`, not `entries`) and treats anything not opening with "Resolved" as still
 * open.
 */
import type { HealthCheckDefinition } from "@w6w/types";

const service: HealthCheckDefinition = {
  key: "service",
  title: "MOCO platform status",
  description: "Reads www.mocoappstatus.com's Atom history feed for open (non-Resolved) incidents.",
  kind: "service",
  covers: ["*"],
  feed: { url: "https://www.mocoappstatus.com/history.atom" },
  minIntervalSeconds: 300,

  check({ feed }) {
    if (feed?.error) return { state: "unknown", message: feed.error };
    const open = (feed?.latest ?? []).filter((e) => !/^resolved\b/i.test(e.summary.trim()));
    if (open.length === 0) return { state: "ok", ttlSeconds: 300 };
    return {
      state: "degraded",
      message: open.slice(0, 5).map((e) => e.title).join("; "),
      ttlSeconds: 300,
    };
  },
};

export default service;
