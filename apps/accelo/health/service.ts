/**
 * Is Accelo up? — Atlassian Statuspage at status.accelo.com.
 *
 * Verified live 2026-10-06: `GET /api/v2/summary.json` answers a Statuspage-shaped
 * body whose `page` reads `{"id":"m0sbzc18yt4n","name":"Accelo"}`, so the page is
 * Accelo's own and not an unclaimed decoy. The page's `components` array is EMPTY
 * though — Accelo publishes one rollup indicator and no per-component state, so
 * nothing on it is specifically the API. That is why the verdict is a plain
 * rollup and why `severity` is `informational`: an incident on the web app is not
 * evidence the API is down, and must not fail a target on its own. The
 * deployment check below answers whether THIS account's API host serves.
 *
 *   - `kind: "service"`, `scope: "app"`, `credential: "none"` — one answer for
 *     every connection, shared by the host, reported before anyone connects.
 *   - `network.allow` widens egress for this unsigned hook only; the status
 *     host is not on the app's own allowlist.
 *   - `unknown`, never `down`, when the status page itself misbehaves — a broken
 *     status page says nothing about the vendor.
 */
import type { HealthCheckDefinition, HealthState } from "@w6w/types";

const STATUS_HOST = "status.accelo.com";
const PAGE_ID = "m0sbzc18yt4n";

const INDICATOR: Record<string, HealthState> = {
  none: "ok",
  minor: "degraded",
  major: "down",
  critical: "down",
};

const service: HealthCheckDefinition = {
  key: "service",
  title: "Accelo platform status",
  description:
    "Atlassian Statuspage rollup for status.accelo.com. Page-level only: Accelo publishes no per-component state, so this is informational. Unauthenticated and unsigned.",
  kind: "service",
  covers: ["*"],
  severity: "informational",
  network: { allow: [STATUS_HOST] },
  minIntervalSeconds: 60,

  async check(_input, ctx) {
    const res = await ctx.fetch(`https://${STATUS_HOST}/api/v2/summary.json`);
    if (!res.ok) return { state: "unknown", message: `status API returned ${res.status}` };

    const body = await res.json().catch(() => ({})) as {
      page?: { id?: string };
      status?: { indicator?: string; description?: string };
    };
    // Pin the page id: a different page answering at this host is not Accelo's status.
    if (body.page?.id !== PAGE_ID) {
      return { state: "unknown", message: "status page is not Accelo's (page id mismatch)" };
    }
    return {
      state: INDICATOR[body.status?.indicator ?? ""] ?? "unknown",
      message: body.status?.description,
      ttlSeconds: 60,
    };
  },
};

export default service;
