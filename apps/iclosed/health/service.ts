/**
 * Is iClosed up?
 *
 * `status.iclosed.io` is an incident.io status page that serves the Atlassian
 * Statuspage v2 JSON schema. Checked 2026-10-06:
 *
 *  - `/api/v2/summary.json` answers 200 JSON; a nonsense sibling
 *    (`/api/v2/zzz-nope.json`) answers a real 404, so it is not a catch-all;
 *  - `page.name` is `iClosed` and the page id is `01KKXK0JRVR5PP6KT6XG704E9E`;
 *  - four components: `iClosed Website`, `iClosed App`, `iClosed API`, `Billing API`.
 *
 * Only **`iClosed API`** decides the verdict — that is the host this app calls.
 * The website, the app and billing are reported as detail but capped at
 * `degraded`: a marketing-site outage does not stop an API call. The page-level
 * indicator is deliberately not the verdict for the same reason.
 *
 * (`status.iclosed.io/index.json` is a 404 HTML page, and
 * `iclosed.statuspage.io` / `iclosed.instatus.com` are unclaimed decoys that
 * redirect to the vendors' marketing sites — only `status.iclosed.io` is real.)
 */
import type { HealthCheckDefinition, HealthComponentReport, HealthState } from "@w6w/types";

export const STATUS_URL = "https://status.iclosed.io/api/v2/summary.json";
export const PAGE_ID = "01KKXK0JRVR5PP6KT6XG704E9E";
export const API_COMPONENT_ID = "01KKXK0K0JCCQJPBAYN71KZESE";
export const API_COMPONENT_NAME = "iClosed API";

interface StatusComponent {
  id?: string;
  name?: string;
  status?: string;
}

interface StatusSummary {
  page?: { id?: string; name?: string; url?: string };
  components?: StatusComponent[];
  status?: { indicator?: string; description?: string };
}

/** Statuspage's component vocabulary. */
export function mapComponentStatus(status: string | undefined): HealthState {
  switch (status) {
    case "operational":
      return "ok";
    case "degraded_performance":
    case "partial_outage":
    case "under_maintenance":
      return "degraded";
    case "major_outage":
      return "down";
    default:
      return "unknown";
  }
}

const service: HealthCheckDefinition = {
  key: "service",
  title: "iClosed platform status",
  description:
    "The `iClosed API` component of status.iclosed.io decides; the website, app and billing " +
    "components are reported as detail and never worse than degraded.",
  kind: "service",
  scope: "app",
  credential: "none",
  covers: ["*"],
  network: { allow: ["status.iclosed.io"] },
  minIntervalSeconds: 60,

  async check(_input, ctx) {
    const res = await ctx.fetch(STATUS_URL, { headers: { accept: "application/json" } });
    if (!res.ok) {
      // A broken status page says nothing about iClosed — never `down`.
      return { state: "unknown", message: `Status page returned ${res.status}` };
    }
    const body = await res.json().catch(() => null) as StatusSummary | null;
    if (!body) return { state: "unknown", message: "Status page returned an unreadable body" };

    if (body.page?.id && body.page.id !== PAGE_ID) {
      return { state: "unknown", message: "status page no longer self-identifies as iClosed's" };
    }
    const nodes = (body.components ?? []).filter((c) => c?.name);
    if (nodes.length === 0) {
      return { state: "unknown", message: "Status page returned no components" };
    }

    const components: Record<string, HealthComponentReport> = {};
    nodes.forEach((node, i) => {
      let state = mapComponentStatus(node.status);
      const isApi = node.id === API_COMPONENT_ID || node.name === API_COMPONENT_NAME;
      if (!isApi && state === "down") state = "degraded";
      components[node.id ?? `component-${i}`] = state === "ok"
        ? { state, message: node.name }
        : { state, message: `${node.name}: ${node.status}` };
    });

    const api = nodes.find((n) => n.id === API_COMPONENT_ID || n.name === API_COMPONENT_NAME);
    if (!api) {
      return {
        state: "unknown",
        message: "Status page has no `iClosed API` component",
        components,
      };
    }
    const affected = nodes.filter((n) => mapComponentStatus(n.status) !== "ok");
    return {
      state: mapComponentStatus(api.status),
      message: affected.length > 0
        ? `affected: ${affected.map((n) => `${n.name} (${n.status})`).join(", ")}`
        : undefined,
      components,
      ttlSeconds: 60,
    };
  },
};

export default service;
