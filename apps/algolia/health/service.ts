/**
 * Is Algolia up? — Algolia's **own** status API, not a Statuspage.
 *
 * `status.algolia.com` looks like an Atlassian Statuspage and is not one. The
 * standard paths are decoys: verified 2026-08-18, both
 * `/api/v2/status.json` and `/api/v2/summary.json` return the **identical**
 * 559-byte HTML document (same md5 — it is the page's own SPA shell), so a
 * probe built on the usual convention would parse HTML and report nothing
 * useful.
 *
 * What Algolia does publish is its own JSON API one level up:
 *
 *   GET https://status.algolia.com/1/status    -> 200, ~7 KB
 *       {"status":{"c1-br":"operational","c1-ca":"operational", … }}   (298 clusters)
 *   GET https://status.algolia.com/1/incidents -> 200
 *       {"incidents":{"c23-usw":[{"t":…,"v":{"title":…,"status":"major_outage"}}]}}
 *
 * `/1/status` is the current state and is what this checks; `/1/incidents` is a
 * history log, which answers a different question. The status vocabulary is
 * taken from live data rather than guessed — `operational` and `major_outage`
 * are both observed — so anything unrecognised maps to `degraded` and carries
 * its raw value into the message rather than being silently treated as fine.
 *
 * **Per-cluster, rolled up.** Algolia runs hundreds of clusters and a
 * Connection sits on one of them, which this app cannot know from the
 * application id alone. So the check reports the whole fleet: all operational
 * is `ok`, and anything else names the affected clusters. That is honest about
 * what is knowable — a regional incident is real news even when it may not be
 * yours.
 *
 * Annotation, and why each axis is what it is:
 *
 *   - `kind: "service"` — "is the vendor's platform up", a different question
 *     from "is this credential live" (the derived `auth:*` check).
 *   - `scope: "app"` (the default) — the fleet answer is the same for every
 *     Connection, so the host runs it once and shares the result.
 *   - `credential: "none"` (also the default) — unauthenticated and unsigned.
 *   - `network.allow` — `status.algolia.com` is not an API host and is
 *     deliberately absent from the app's own egress allowlist.
 *   - `severity` defaults to `degraded` for this kind.
 */
import type { HealthCheckDefinition, HealthState } from "@w6w/types";

const STATUS_HOST = "status.algolia.com";

/** Observed in live data; anything else is reported rather than assumed. */
const STATE: Record<string, HealthState> = {
  operational: "ok",
  major_outage: "down",
};

/** How many affected clusters to name before summarising. */
const NAME_LIMIT = 5;

const service: HealthCheckDefinition = {
  key: "service",
  title: "Algolia platform status",
  description:
    "Algolia's own per-cluster status API (status.algolia.com/1/status), rolled up across the " +
    "fleet. Unauthenticated and unsigned.",
  kind: "service",
  covers: ["*"],
  network: { allow: [STATUS_HOST] },
  minIntervalSeconds: 60,

  async check(_input, ctx) {
    const res = await ctx.fetch(`https://${STATUS_HOST}/1/status`);
    // `unknown`, never `down`: a status API that itself fails says nothing
    // about the vendor.
    if (!res.ok) return { state: "unknown", message: `status API returned ${res.status}` };

    const body = await res.json().catch(() => null) as
      | { status?: Record<string, string> }
      | null;
    const clusters = body?.status;
    if (!clusters || typeof clusters !== "object") {
      return { state: "unknown", message: "status API returned an unexpected shape" };
    }

    const total = Object.keys(clusters).length;
    if (total === 0) return { state: "unknown", message: "status API listed no clusters" };

    const affected = Object.entries(clusters).filter(([, v]) => v !== "operational");
    if (affected.length === 0) {
      return { state: "ok", message: `all ${total} clusters operational`, ttlSeconds: 60 };
    }

    // Worst observed state wins; an unrecognised value is `degraded` rather
    // than ignored.
    const worst = affected.some(([, v]) => STATE[v] === "down") ? "down" : "degraded";
    const named = affected.slice(0, NAME_LIMIT).map(([k, v]) => `${k}: ${v}`).join(", ");
    const more = affected.length > NAME_LIMIT ? `, +${affected.length - NAME_LIMIT} more` : "";

    return {
      state: worst,
      message: `${affected.length} of ${total} clusters affected — ${named}${more}`,
      ttlSeconds: 60,
    };
  },
};

export default service;
