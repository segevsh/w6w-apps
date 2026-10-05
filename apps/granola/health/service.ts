import type { HealthCheckDefinition } from "@w6w/types";

/**
 * Is Granola's API up?
 *
 * Granola's status page is `status.granola.ai`, hosted by incident.io, and it
 * was checked on 2026-10-05 rather than trusted for answering 200:
 *
 *  - `page.name` is `Granola`, `page.url` is `https://status.granola.ai/`; the
 *    incident.io proxy (`/proxy/status.granola.ai`) names the same page id,
 *    `01JE6FN0959TJMBCJJRTKEV8QC`, and a mailto of `hey@granola.so`.
 *  - It exposes a Statuspage-compatible `/api/v2/summary.json` (200, JSON with
 *    `page`, `status`, `components` — no `incidents` key) while a nonsense
 *    sibling `/api/v2/definitely-not-real.json` is a 404 with an empty body, so
 *    it is not a catch-all.
 *  - It has five components: Desktop App, Mobile App, **API and webhooks**, MCP
 *    and Web notes. One of them is this API.
 *
 * Because four of the five describe other products, the page-level indicator is
 * NOT the verdict: a Desktop App incident must not mark the REST API down. The
 * verdict is the `API and webhooks` component alone; the others are not
 * reported. If that component is ever renamed the check says `unknown` rather
 * than quietly falling back to the roll-up.
 *
 * incident.io uses Statuspage's component vocabulary (`operational`,
 * `degraded_performance`, `partial_outage`, `full_outage`, `under_maintenance`)
 * — `full_outage` is incident.io's spelling of Statuspage's `major_outage`, and
 * both are mapped.
 */
export const STATUS_URL = "https://status.granola.ai/api/v2/summary.json";
export const API_COMPONENT = "API and webhooks";

interface StatusSummary {
  page?: { id?: string; name?: string; url?: string };
  components?: Array<{ id?: string; name?: string; status?: string }>;
}

export function mapComponentStatus(
  status: string | undefined,
): "ok" | "degraded" | "down" | "unknown" {
  switch (status) {
    case "operational":
      return "ok";
    case "degraded_performance":
    case "partial_outage":
    case "under_maintenance":
      return "degraded";
    case "full_outage":
    case "major_outage":
      return "down";
    default:
      return "unknown";
  }
}

const service: HealthCheckDefinition = {
  key: "service",
  title: "Granola API status",
  description: "The `API and webhooks` component on status.granola.ai.",
  kind: "service",
  scope: "app",
  credential: "none",
  covers: ["*"],
  network: { allow: ["status.granola.ai"] },
  minIntervalSeconds: 60,

  async check(_input, ctx) {
    const res = await ctx.fetch(STATUS_URL, { headers: { accept: "application/json" } });
    if (!res.ok) {
      // A broken status page says nothing about Granola — never `down`.
      return { state: "unknown", message: `Status page returned ${res.status}` };
    }
    const body = await res.json().catch(() => null) as StatusSummary | null;
    if (!body || !Array.isArray(body.components)) {
      return { state: "unknown", message: "Status page returned an unreadable body" };
    }
    const pageUrl = body.page?.url ?? "";
    if (pageUrl && !/(^|\/\/|\.)status\.granola\.ai(\/|$)/i.test(pageUrl)) {
      return { state: "unknown", message: "status page no longer self-identifies as Granola's" };
    }

    const api = body.components.find((c) => c?.name === API_COMPONENT);
    if (!api) {
      return { state: "unknown", message: `Status page has no "${API_COMPONENT}" component` };
    }
    const state = mapComponentStatus(api.status);
    return {
      state,
      message: state === "ok" ? undefined : `${API_COMPONENT}: ${api.status}`,
      components: { [api.id ?? "api"]: { state, message: API_COMPONENT } },
      ttlSeconds: 60,
    };
  },
};

export default service;
