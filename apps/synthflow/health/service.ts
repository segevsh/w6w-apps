/**
 * Is Synthflow up?
 *
 * ## The status page
 *
 * `status.synthflow.ai` is a real incident.io page (generator `incident.io` in its Atom
 * feed, a `/proxy/status.synthflow.ai` document naming "Synthflow AI Status Page").
 * Checked live 2026-10-05:
 *
 *  - `/api/v2/summary.json` answers 200 in Atlassian-Statuspage-compatible shape with
 *    `page.name` "Synthflow AI Status Page", `page.url` `https://status.synthflow.ai/`
 *    and five components: `Synthflow Dashboard`, `Synthflow API`, `End to End calling`,
 *    `Synthflow Website`, `Status Page`. No redirect: the host is the page's own.
 *  - `/index.json` is a 404, so the Better Stack path is not used.
 *
 * ## What decides the verdict
 *
 * The page-level `status.indicator` also rolls up the marketing website and the status
 * page itself, neither of which is the API. The verdict therefore comes from the two
 * components that cover what this app uses: `Synthflow API` (the endpoints behind every
 * action) and `End to End calling` (whether a placed call actually connects). The other
 * components are reported, but never move the verdict.
 *
 * incident.io's component vocabulary: `operational`, `degraded_performance`,
 * `partial_outage`, `full_outage` (Statuspage's `major_outage` is mapped too, in case a
 * page is ever migrated), `under_maintenance`.
 */
import type { HealthCheckDefinition, HealthComponentReport, HealthState } from "@w6w/types";
import { worstHealthState } from "@w6w/types";

export const STATUS_HOST = "status.synthflow.ai";
export const STATUS_URL = `https://${STATUS_HOST}/api/v2/summary.json`;
export const PAGE_NAME = "Synthflow AI Status Page";
/** Components whose state decides the verdict. */
export const DECIDING_COMPONENTS = ["Synthflow API", "End to End calling"];

interface StatusSummary {
  page?: { id?: string; name?: string; url?: string };
  components?: Array<{ id?: string; name?: string; status?: string }>;
}

export function mapComponentStatus(status: string | undefined): HealthState {
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

const slug = (name: string) => name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

const service: HealthCheckDefinition = {
  key: "service",
  title: "Synthflow platform status",
  description:
    "The `Synthflow API` and `End to End calling` components on status.synthflow.ai (incident.io).",
  kind: "service",
  scope: "app",
  credential: "none",
  covers: ["*"],
  network: { allow: [STATUS_HOST] },
  minIntervalSeconds: 60,

  async check(_input, ctx) {
    const res = await ctx.fetch(STATUS_URL, { headers: { accept: "application/json" } });
    if (!res.ok) {
      // A broken status page says nothing about Synthflow — never `down`.
      return { state: "unknown", message: `Status page returned ${res.status}` };
    }
    const body = await res.json().catch(() => null) as StatusSummary | null;
    if (!body || !Array.isArray(body.components)) {
      return { state: "unknown", message: "Status page returned an unreadable body" };
    }
    if (
      body.page?.name !== PAGE_NAME ||
      !/(^|\/\/)status\.synthflow\.ai(\/|$)/.test(body.page.url ?? "")
    ) {
      return { state: "unknown", message: "status page no longer self-identifies as Synthflow's" };
    }

    const components: Record<string, HealthComponentReport> = {};
    for (const c of body.components) {
      if (!c?.name) continue;
      const state = mapComponentStatus(c.status);
      components[slug(c.name)] = state === "ok" ? { state } : { state, message: c.status };
    }

    const deciding = body.components.filter((c) => c?.name && DECIDING_COMPONENTS.includes(c.name));
    if (deciding.length === 0) {
      return {
        state: "unknown",
        message: `Status page has none of: ${DECIDING_COMPONENTS.join(", ")}`,
        components,
      };
    }
    const state = worstHealthState(deciding.map((c) => mapComponentStatus(c.status)));
    const affected = deciding.filter((c) => mapComponentStatus(c.status) !== "ok");
    return {
      state,
      message: affected.length > 0
        ? affected.map((c) => `${c.name}: ${c.status}`).join("; ")
        : undefined,
      components,
      ttlSeconds: 60,
    };
  },
};

export default service;
