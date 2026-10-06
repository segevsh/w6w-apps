/**
 * Is SeaTable Cloud's base API up?
 *
 * ## The status page is real — and it is Gatus, not Statuspage
 *
 * `status.seatable.io` redirects to **`status.seatable.com`** (the final host is what
 * is declared below), whose `<meta name="description">` reads "Gatus is an
 * advanced automated status page". Every Statuspage/Instatus path
 * (`/api/v2/summary.json`, `/index.json`, `/history.atom`, `/feed.rss`) answers
 * 404, and the root is a 3 KB SPA shell — the "200 is not an endpoint" trap.
 * Gatus's own API does answer: `GET /api/v1/endpoints/statuses` returns the
 * 15 monitored endpoints in four groups (SeaTable Cloud, Others, Pages), among
 * them **`Cloud API (Base Operations)`** — the very `/api-gateway` surface every
 * Action here calls — checked every minute with the conditions `status == 200`
 * and `[BODY].status` neither `down` nor `degraded`.
 *
 * ## Why one endpoint, not the roll-up
 *
 * The all-endpoints response is ~176 KB of history. The per-endpoint form
 * `GET /api/v1/endpoints/{key}/statuses?page=1&pageSize=1` returns the same
 * component with only its latest result (~4.7 KB). Pages like the website or
 * forum being down would not stop a workflow, so only the Base Operations
 * component is read.
 *
 * `success` on the latest result is the verdict; `state` distinguishes a
 * degraded probe (`degraded`) from an unhealthy one.
 */
import type { HealthCheckDefinition } from "@w6w/types";

export const STATUS_HOST = "status.seatable.com";
export const COMPONENT_KEY = "seatable-cloud_cloud-api-(base-operations)";
export const STATUS_URL = `https://${STATUS_HOST}/api/v1/endpoints/${
  encodeURIComponent(COMPONENT_KEY)
}/statuses?page=1&pageSize=1`;

interface GatusResult {
  success?: boolean;
  state?: string;
  timestamp?: string;
}

interface GatusEndpoint {
  name?: string;
  group?: string;
  key?: string;
  results?: GatusResult[];
}

const service: HealthCheckDefinition = {
  key: "service",
  title: "SeaTable Cloud base API status",
  description:
    "Latest probe of the `Cloud API (Base Operations)` component on status.seatable.com — the " +
    "/api-gateway surface this app calls.",
  kind: "service",
  scope: "app",
  credential: "none",
  covers: ["*"],
  network: { allow: [STATUS_HOST] },
  minIntervalSeconds: 60,

  async check(_input, ctx) {
    const res = await ctx.fetch(STATUS_URL, { headers: { accept: "application/json" } });
    if (!res.ok) {
      // A broken status API says nothing about SeaTable — never `down`.
      return { state: "unknown", message: `Status page returned ${res.status}` };
    }
    const body = await res.json().catch(() => null) as GatusEndpoint | null;
    if (!body) return { state: "unknown", message: "Status page returned an unreadable body" };

    // Guard against the page being replaced or re-keyed: the component must be the one asked for.
    if (body.key !== COMPONENT_KEY) {
      return {
        state: "unknown",
        message: "Status page no longer exposes the Base Operations probe",
      };
    }
    const latest = (body.results ?? []).at(-1);
    if (!latest || typeof latest.success !== "boolean") {
      return { state: "unknown", message: "Status page returned no result for Base Operations" };
    }

    if (latest.success) return { state: "ok", message: "Cloud API (Base Operations) is healthy" };
    return {
      state: latest.state === "degraded" ? "degraded" : "down",
      message: `Cloud API (Base Operations) is ${latest.state ?? "failing"}` +
        (latest.timestamp ? ` as of ${latest.timestamp}` : ""),
    };
  },
};

export default service;
