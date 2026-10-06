/**
 * Is Eden AI up?
 *
 * ## The status page, verified live on 2026-10-06
 *
 * The vendor's homepage and docs both link `https://app-edenai.instatus.com/` - an Instatus page,
 * NOT Atlassian Statuspage. `edenai.statuspage.io` is the unclaimed-Statuspage decoy (it 302s to
 * Atlassian's marketing page, 127 KB of HTML), and `status.edenai.co` does not resolve.
 *
 * Instatus's own JSON paths answer real documents:
 *
 *   | Path               | Body                                                              |
 *   | ------------------ | ----------------------------------------------------------------- |
 *   | `/summary.json`    | `{"page":{"name":"EdenAI","url":"...","status":"UP"}}`            |
 *   | `/v2/components.json` | `{"components":[{"id":"...","name":"Eden AI","status":"OPERATIONAL","group":null}]}` |
 *
 * The page has ONE component, `Eden AI`, covering the whole API, so the page-level status is the
 * statement about the API and no component filtering is needed. Only `UP` / `OPERATIONAL` were
 * observed live; anything unseen reports `unknown` rather than a guess. `page.name` is checked
 * on every run so a vendor moving to another page cannot silently point this probe at someone
 * else's.
 *
 * The status host is NOT the API host, so it is declared on this hook's own `network.allow` and
 * never on the app's.
 */
import type { HealthCheckDefinition, HealthState } from "@w6w/types";

export const STATUS_HOST = "app-edenai.instatus.com";
export const SUMMARY_URL = `https://${STATUS_HOST}/summary.json`;

interface SummaryBody {
  page?: { name?: string; url?: string; status?: string };
}

/** Instatus page-level status. Only `UP` was observed live. */
export function mapPageStatus(status: string | undefined): HealthState {
  switch (status) {
    case "UP":
      return "ok";
    case "UNDERMAINTENANCE":
    case "HASISSUES":
      return "degraded";
    default:
      return "unknown";
  }
}

const service: HealthCheckDefinition = {
  key: "service",
  title: "Eden AI platform status",
  description: "Page-level status from app-edenai.instatus.com (Instatus).",
  kind: "service",
  scope: "app",
  credential: "none",
  covers: ["*"],
  network: { allow: [STATUS_HOST] },
  minIntervalSeconds: 60,

  async check(_input, ctx) {
    const res = await ctx.fetch(SUMMARY_URL, { headers: { accept: "application/json" } });
    if (!res.ok) {
      // A broken status API says nothing about Eden AI - never `down`.
      return { state: "unknown", message: `Status page returned ${res.status}` };
    }
    const body = await res.json().catch(() => null) as SummaryBody | null;
    if (!body?.page) {
      return { state: "unknown", message: "Status page returned an unreadable body" };
    }
    if (body.page.name !== "EdenAI") {
      return { state: "unknown", message: "status page no longer self-identifies as Eden AI's" };
    }
    return {
      state: mapPageStatus(body.page.status),
      message: body.page.status ? `page status: ${body.page.status}` : undefined,
      ttlSeconds: 60,
    };
  },
};

export default service;
